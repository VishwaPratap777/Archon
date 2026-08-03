import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from './llm.factory';
import { createQueryCustomersTool } from './tools/query-customers.tool';
import { createBuildSegmentTool } from './tools/build-segment.tool';
import { createDraftMessageTool } from './tools/draft-message.tool';
import { createEstimateReachTool } from './tools/estimate-reach.tool';
import { createLaunchCampaignTool } from './tools/launch-campaign.tool';
import { SegmentsService } from '../segments/segments.service';
import { CampaignsService } from '../campaigns/campaigns.service';

const SYSTEM_PROMPT = `You are BrewCRM's campaign co-pilot for Roast & Co., a coffee chain.
You help marketers run targeted campaigns by understanding their intent, finding the right customers, drafting messages, and launching campaigns.

## CRITICAL RULES

1. **ALWAYS use tools to answer data questions.** Never say "I can't" or "I don't have access". You have full access to the customer database via query_customers. Use it.
2. **Honor the user's requested count.** If they ask for "top 5", set limit=5. If they ask for "top 10", set limit=10.
3. **Always include customer details in your response.** When showing customers, ALWAYS list their name, email, total orders, total spent, and preferred channel. Format as a numbered list with bold names.
4. **Use sortBy to get top/bottom customers.** For "most loyal" or "top buyers", use sortBy="totalOrders" or sortBy="totalSpent" with sortOrder="desc".
5. **Channel ≠ preferredChannel filter.** When the user says "send them an email" or "send a WhatsApp message", that is the DELIVERY CHANNEL — it does NOT mean you should filter the segment by preferredChannel. Include ALL customers from the context in the segment, regardless of their preferred channel. Only filter by preferredChannel if the user explicitly asks to (e.g., "only customers who prefer email").
6. **Use context from previous messages.** If the user previously asked for "top 5 customers" and then says "send them a mail", build the segment to include ALL 5 of those customers — not a filtered subset.

## Campaign Workflow
1. Understand the marketer's goal
2. Use query_customers to explore the data (with appropriate filters, sorting, and limit)
3. Use build_segment to create the audience
4. Use draft_message to write personalized copy
5. Use estimate_reach to show expected performance
6. Present a clear campaign plan and ASK FOR CONFIRMATION before launching
7. Only after explicit user confirmation (e.g., "yes", "go ahead", "launch it"), use launch_campaign

## launch_campaign Rules
- CRITICAL: The segmentId MUST be the EXACT value returned by build_segment. Copy it character-for-character.
- The channel must be lowercase: email, whatsapp, sms, or rcs
- Never launch without explicit user confirmation
- If launch_campaign fails, tell the user the error clearly and ask how to proceed

## Formatting
- Format data as numbered lists or tables
- Bold customer names
- Use bullet points for campaign summaries
- Keep responses concise but complete

Available channels: email, whatsapp, sms, rcs
Current brand: Roast & Co. (specialty coffee chain)
Tone: warm, human, not salesy. Short messages. First name basis.`;

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
  }),
});

export interface ChatResponse {
  response: string;
  toolCalls: string[];
  campaignLaunched?: {
    campaignId: string;
    totalCount: number;
  };
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly segmentsService: SegmentsService,
    private readonly campaignsService: CampaignsService,
  ) {}

  async chat(
    messages: Array<{ role: string; content: string }>,
    _sessionId: string,
  ): Promise<ChatResponse> {
    const tools = [
      createQueryCustomersTool(this.segmentsService),
      createBuildSegmentTool(this.segmentsService),
      createDraftMessageTool(),
      createEstimateReachTool(this.segmentsService),
      createLaunchCampaignTool(this.campaignsService),
    ];

    const llm = createLLM();
    const llmWithTools = llm.bindTools(tools);

    // Build the agent node
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentNode = async (state: any) => {
      const response = await llmWithTools.invoke(state.messages);
      return { messages: [response] };
    };

    // Build the tools node
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNode = new ToolNode(tools as any);

    // Conditional edge: should we continue to tools or end?
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shouldContinue = (state: any) => {
      const lastMessage = state.messages[state.messages.length - 1];
      if (
        lastMessage &&
        'tool_calls' in lastMessage &&
        Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length > 0
      ) {
        return 'tools';
      }
      return END;
    };

    // Build the graph
    const graph = new StateGraph(AgentState)
      .addNode('agent', agentNode)
      .addNode('tools', toolNode)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', shouldContinue)
      .addEdge('tools', 'agent')
      .compile();

    // Convert input messages to LangChain format
    const langchainMessages: BaseMessage[] = [
      new SystemMessage(SYSTEM_PROMPT),
      ...messages.map((m) => {
        if (m.role === 'user') return new HumanMessage(m.content);
        return new AIMessage(m.content);
      }),
    ];

    // Run the graph
    const result = await graph.invoke({
      messages: langchainMessages,
    });

    // Extract the final response and tool calls
    const allMessages = result.messages as BaseMessage[];
    const toolCalls: string[] = [];
    let campaignLaunched: { campaignId: string; totalCount: number } | undefined;

    for (const msg of allMessages) {
      if (
        msg instanceof AIMessage &&
        msg.tool_calls &&
        msg.tool_calls.length > 0
      ) {
        for (const tc of msg.tool_calls) {
          toolCalls.push(tc.name);

          // Check if launch_campaign was called
          if (tc.name === 'launch_campaign') {
            // Find the corresponding tool response
            const toolResponseIndex = allMessages.indexOf(msg) + 1;
            if (toolResponseIndex < allMessages.length) {
              try {
                const toolResponse = allMessages[toolResponseIndex];
                const content =
                  typeof toolResponse.content === 'string'
                    ? toolResponse.content
                    : JSON.stringify(toolResponse.content);
                const parsed = JSON.parse(content);
                if (parsed.campaignId) {
                  campaignLaunched = {
                    campaignId: parsed.campaignId,
                    totalCount: parsed.totalCount,
                  };
                }
              } catch {
                // Could not parse tool response, skip
              }
            }
          }
        }
      }
    }

    // Get the final text response (last AI message without tool calls)
    let response = '';
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (msg instanceof AIMessage && (!msg.tool_calls || msg.tool_calls.length === 0)) {
        response =
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content);
        break;
      }
    }

    return {
      response,
      toolCalls: [...new Set(toolCalls)],
      campaignLaunched,
    };
  }
}
