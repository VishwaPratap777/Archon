import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLLM(): any {
  const provider = process.env['LLM_PROVIDER'] || 'openrouter';

  if (provider === 'gemini') {
    return new ChatGoogleGenerativeAI({
      model: process.env['GEMINI_MODEL'] || 'gemini-2.5-flash',
      apiKey: process.env['GEMINI_API_KEY'],
    });
  }

  if (provider === 'anthropic') {
    return new ChatAnthropic({
      model: 'claude-haiku-4-5',
      apiKey: process.env['ANTHROPIC_API_KEY'],
    });
  }

  // Default: OpenRouter (uses OpenAI-compatible API)
  return new ChatOpenAI({
    modelName: process.env['OPENROUTER_MODEL'] || 'meta-llama/llama-3.3-70b-instruct:free',
    openAIApiKey: process.env['OPENROUTER_API_KEY'],
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
    },
  } as Record<string, unknown>);
}
