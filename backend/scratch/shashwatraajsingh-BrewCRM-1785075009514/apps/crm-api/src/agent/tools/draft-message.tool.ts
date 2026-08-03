import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createLLM } from '../llm.factory';
import { HumanMessage } from '@langchain/core/messages';

export function createDraftMessageTool() {
  const draftSchema = z.object({
    intent: z.string().describe('The marketing intent or goal (e.g., "win back lapsed customers")'),
    channel: z
      .string()
      .describe('Delivery channel: email, whatsapp, sms, or rcs'),
    segmentDescription: z
      .string()
      .describe('Description of the target customer segment'),
    tone: z
      .string()
      .optional()
      .nullable()
      .describe('Desired tone (default: warm, human, not salesy)'),
    sampleCustomers: z
      .array(
        z.object({
          name: z.string(),
          totalOrders: z.number(),
          daysSinceLastOrder: z.number(),
          totalSpent: z.number(),
        }),
      )
      .describe('Sample customers for generating preview messages'),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async (input: z.infer<typeof draftSchema>) => {
      const llm = createLLM();

      const prompt = `You are a marketing copywriter for a coffee chain called Roast & Co.
Write a personalized message template using these variables:
- {{customer.name}} — the customer's first name
- {{customer.totalOrders}} — how many orders they've placed
- {{customer.daysSinceLastOrder}} — days since their last order
- {{customer.totalSpent}} — total amount spent

Channel: ${input.channel}
Intent: ${input.intent}
Segment: ${input.segmentDescription}
Tone: ${input.tone || 'warm, human, not salesy'}

Keep it short and conversational. First name basis.
${input.channel === 'whatsapp' || input.channel === 'sms' ? 'Keep under 160 characters.' : ''}

Now generate personalized previews using these sample customers:
${input.sampleCustomers.map((c: { name: string; totalOrders: number; daysSinceLastOrder: number; totalSpent: number }) => `- ${c.name}: ${c.totalOrders} orders, ${c.daysSinceLastOrder} days ago, ₹${c.totalSpent} spent`).join('\n')}

Return a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "template": "the message template with {{customer.*}} variables",
  "previews": [{"customerName": "Name", "message": "personalized message"}]
}`;

      const response = await llm.invoke([new HumanMessage(prompt)]);
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      // Try to parse as JSON, fallback to returning raw
      try {
        // Strip markdown code fences if present
        const cleaned = content.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return JSON.stringify(parsed);
      } catch {
        return JSON.stringify({
          template: content,
          previews: [],
        });
      }
    },
    {
      name: 'draft_message',
      description:
        'Draft a personalized message template for a campaign. Returns the template with sample personalized previews.',
      schema: draftSchema,
    },
  );
}
