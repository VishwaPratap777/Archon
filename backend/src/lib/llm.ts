/**
 * llm.ts — Multi-provider LLM client
 * 
 * Provides a unified interface for calling LLMs with automatic fallback:
 *   Groq (llama-3.3-70b) → Anthropic (Claude 3.5 Sonnet) → OpenAI (GPT-4o-mini)
 * 
 * Exports:
 *   - callLLM(): Full response (for summaries, reranking, etc.)
 *   - streamLLM(): Async generator for SSE streaming (for chat responses)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { trackTokenUsage } from './auth';

export interface LlmOptions {
  userId?: string;
  repositoryId?: string;
  agentType?: string;
}

export interface LlmResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
  };
}

/**
 * Resolves the active API keys from env.
 */
function getApiKeys() {
  return {
    groq: process.env.GROQ_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
  };
}

/**
 * Helper to record token usage if userId is present.
 */
function recordUsage(res: LlmResult, options?: LlmOptions) {
  if (options?.userId) {
    trackTokenUsage({
      userId: options.userId,
      repositoryId: options.repositoryId,
      agentType: options.agentType || 'llm',
      promptTokens: res.usage.promptTokens,
      completionTokens: res.usage.completionTokens,
      totalTokens: res.usage.totalTokens,
      model: res.usage.model,
    }).catch(err => console.warn('[TokenUsage] Tracking failed:', err.message));
  }
}

/**
 * Call an LLM with automatic provider fallback.
 * Returns the full text response + token usage metadata.
 */
export async function callLLM(prompt: string, systemPrompt: string, options?: LlmOptions): Promise<LlmResult> {
  const keys = getApiKeys();
  let lastError: Error | null = null;
  let hasKey = false;

  // 1. Try Groq (fastest, free tier)
  if (keys.groq) {
    hasKey = true;
    try {
      const client = new OpenAI({
        apiKey: keys.groq,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const completion = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      });
      const res: LlmResult = {
        text: completion.choices[0].message.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
          model: 'llama-3.3-70b-versatile',
        },
      };
      recordUsage(res, options);
      return res;
    } catch (err) {
      lastError = err as Error;
      console.warn('[LLM] Groq failed, trying Anthropic fallback...', (err as Error).message);
    }
  }

  // 2. Try Anthropic
  if (keys.anthropic) {
    hasKey = true;
    try {
      const client = new Anthropic({ apiKey: keys.anthropic });
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = message.content[0];
      const text = block && block.type === 'text' ? block.text : '';
      const res: LlmResult = {
        text,
        usage: {
          promptTokens: message.usage?.input_tokens || 0,
          completionTokens: message.usage?.output_tokens || 0,
          totalTokens: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
          model: 'claude-3-5-sonnet-20241022',
        },
      };
      recordUsage(res, options);
      return res;
    } catch (err) {
      lastError = err as Error;
      console.warn('[LLM] Anthropic failed, trying OpenAI fallback...', (err as Error).message);
    }
  }

  // 3. Try OpenAI
  if (keys.openai) {
    hasKey = true;
    try {
      const client = new OpenAI({ apiKey: keys.openai });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      });
      const res: LlmResult = {
        text: completion.choices[0].message.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
          model: 'gpt-4o-mini',
        },
      };
      recordUsage(res, options);
      return res;
    } catch (err) {
      lastError = err as Error;
      console.error('[LLM] OpenAI also failed:', (err as Error).message);
    }
  }

  if (lastError) {
    throw new Error(`LLM provider failed: ${lastError.message}`);
  }
  throw new Error('LLM API Key missing in environment variables. Please set OPENAI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY in .env.');
}

/**
 * Stream LLM tokens as an async generator (for SSE chat responses).
 * Uses the same provider fallback chain as callLLM.
 */
export async function* streamLLM(
  prompt: string,
  systemPrompt: string,
  options?: LlmOptions
): AsyncGenerator<string> {
  const keys = getApiKeys();
  let lastError: Error | null = null;
  let hasKey = false;
  let fullResponseText = '';

  const finalizeStreamUsage = (model: string) => {
    if (options?.userId && fullResponseText) {
      const estimatedPromptTokens = Math.ceil((prompt.length + systemPrompt.length) / 4);
      const estimatedCompletionTokens = Math.ceil(fullResponseText.length / 4);
      recordUsage({
        text: fullResponseText,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
          model,
        },
      }, options);
    }
  };

  // Try Groq streaming
  if (keys.groq) {
    hasKey = true;
    try {
      const client = new OpenAI({
        apiKey: keys.groq,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const stream = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        stream: true,
      });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullResponseText += delta;
          yield delta;
        }
      }
      finalizeStreamUsage('llama-3.3-70b-versatile');
      return;
    } catch (err) {
      lastError = err as Error;
      console.warn('[LLM] Groq stream failed, trying Anthropic fallback...', (err as Error).message);
    }
  }

  // Try Anthropic streaming
  if (keys.anthropic) {
    hasKey = true;
    try {
      const client = new Anthropic({ apiKey: keys.anthropic });
      const stream = client.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullResponseText += event.delta.text;
          yield event.delta.text;
        }
      }
      finalizeStreamUsage('claude-3-5-sonnet-20241022');
      return;
    } catch (err) {
      lastError = err as Error;
      console.warn('[LLM] Anthropic stream failed, trying OpenAI fallback...', (err as Error).message);
    }
  }

  // Try OpenAI streaming
  if (keys.openai) {
    hasKey = true;
    try {
      const client = new OpenAI({ apiKey: keys.openai });
      const stream = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        stream: true,
      });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullResponseText += delta;
          yield delta;
        }
      }
      finalizeStreamUsage('gpt-4o-mini');
      return;
    } catch (err) {
      lastError = err as Error;
      console.error('[LLM] OpenAI stream failed:', (err as Error).message);
    }
  }

  if (lastError) {
    yield `Error: LLM provider failed: ${lastError.message}`;
  } else {
    yield 'Error: LLM API Key missing in environment variables.';
  }
}
