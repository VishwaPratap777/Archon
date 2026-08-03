/**
 * retrieval/graph.ts — LangGraph chat pipeline
 * 
 * 4-node pipeline:
 *   understand → retrieve → rerank → generate
 * 
 * Supports both full-response and streaming modes.
 */

import { StateGraph, END } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { understandQuery, UnderstandingResult } from './query';
import { retrieve } from './retriever';
import { rerank } from './reranker';
import { assembleContext } from './context';
import { callLLM, streamLLM } from '../llm';

// ─── State ───────────────────────────────────────────────────────────────────

interface ChatState {
  repoId: string;
  query: string;
  userId?: string;
  understanding: UnderstandingResult | null;
  documents: Document[];
  context: string;
  answer: string;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are a senior software engineer who has thoroughly read and analyzed the entire repository. You answer questions based ONLY on the provided repository context.

Rules:
- Always reference specific file paths when discussing code.
- If the context contains relevant source code, quote or reference it.
- If you cannot find enough evidence in the context, say so honestly.
- Use clear, structured markdown formatting in your answers.
- Be concise but thorough.
- Never hallucinate code, files, or features that aren't in the context.

The user is asking about the current state of the repository. Answer using the context below.`;

// ─── Graph Nodes ─────────────────────────────────────────────────────────────

const understandNode = async (state: ChatState): Promise<Partial<ChatState>> => {
  console.log('[ChatGraph] Understanding query:', state.query);
  const understanding = understandQuery(state.query);
  console.log(`[ChatGraph] Category: ${understanding.category}`);
  return { understanding };
};

const retrieveNode = async (state: ChatState): Promise<Partial<ChatState>> => {
  console.log('[ChatGraph] Retrieving relevant documents...');
  const result = await retrieve(state.repoId, state.understanding!);
  console.log(`[ChatGraph] Retrieved ${result.documents.length} documents (from ${result.totalRetrieved} candidates).`);
  return { documents: result.documents };
};

const rerankNode = async (state: ChatState): Promise<Partial<ChatState>> => {
  console.log('[ChatGraph] Reranking documents...');
  const reranked = await rerank(state.query, state.documents, 4);
  console.log(`[ChatGraph] Reranked to top ${reranked.length} documents.`);

  // Assemble context from reranked results
  const context = await assembleContext(state.repoId, reranked);
  return { documents: reranked, context };
};

const generateNode = async (state: ChatState): Promise<Partial<ChatState>> => {
  console.log('[ChatGraph] Generating answer...');
  const prompt = `${state.context}\n\n---\n\nUser Question: ${state.query}`;
  const result = await callLLM(prompt, CHAT_SYSTEM_PROMPT, {
    userId: state.userId,
    repositoryId: state.repoId,
    agentType: 'chat',
  });
  return { answer: result.text };
};

// ─── Build Graph ─────────────────────────────────────────────────────────────

function buildChatGraph() {
  const graph = new StateGraph<ChatState>({
    channels: {
      repoId: { value: (_x: string, y: string) => y ?? _x, default: () => '' },
      query: { value: (_x: string, y: string) => y ?? _x, default: () => '' },
      understanding: { value: (_x: any, y: any) => y ?? _x, default: () => null },
      documents: { value: (_x: any, y: any) => y ?? _x, default: () => [] },
      context: { value: (_x: string, y: string) => y ?? _x, default: () => '' },
      answer: { value: (_x: string, y: string) => y ?? _x, default: () => '' },
    },
  })
    .addNode('understand', understandNode)
    .addNode('retrieve', retrieveNode)
    .addNode('rerank', rerankNode)
    .addNode('generate', generateNode)
    .addEdge('understand', 'retrieve')
    .addEdge('retrieve', 'rerank')
    .addEdge('rerank', 'generate')
    .addEdge('generate', END);

  graph.setEntryPoint('understand');
  return graph.compile();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the full chat pipeline and return the answer as a string.
 */
export async function chat(repoId: string, query: string, userId?: string): Promise<string> {
  const app = buildChatGraph();

  try {
    const finalState = await app.invoke({
      repoId,
      query,
      userId,
      understanding: null,
      documents: [],
      context: '',
      answer: '',
    });

    return (finalState.answer as string) || 'I could not generate an answer. The repository context may be empty.';
  } catch (err: any) {
    console.error('[ChatGraph] Pipeline failed:', err);
    return `Error: ${err.message}`;
  }
}

/**
 * Run the retrieval pipeline (understand → retrieve → rerank → assemble context)
 * then stream the LLM response token by token.
 * 
 * Returns an async generator that yields tokens for SSE streaming.
 */
export async function* chatStream(repoId: string, query: string, userId?: string): AsyncGenerator<string> {
  try {
    // Run retrieval pipeline synchronously
    console.log('[ChatGraph] Starting streaming pipeline...');

    const understanding = understandQuery(query);
    console.log(`[ChatGraph] Category: ${understanding.category}`);

    const retrievalResult = await retrieve(repoId, understanding);
    console.log(`[ChatGraph] Retrieved ${retrievalResult.documents.length} documents.`);

    const reranked = await rerank(query, retrievalResult.documents, 4);
    console.log(`[ChatGraph] Reranked to ${reranked.length} documents.`);

    const context = await assembleContext(repoId, reranked);

    // Stream the LLM response
    const prompt = `${context}\n\n---\n\nUser Question: ${query}`;
    for await (const token of streamLLM(prompt, CHAT_SYSTEM_PROMPT, {
      userId,
      repositoryId: repoId,
      agentType: 'chat_stream',
    })) {
      yield token;
    }
  } catch (err: any) {
    console.error('[ChatGraph] Streaming pipeline failed:', err);
    yield `Error: ${err.message}`;
  }
}
