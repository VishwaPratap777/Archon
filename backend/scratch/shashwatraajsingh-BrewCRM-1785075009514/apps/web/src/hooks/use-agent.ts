import { useMutation } from '@tanstack/react-query';
import { chatWithAgent } from '../lib/api';

export function useAgentChat() {
  return useMutation({
    mutationFn: ({ messages, sessionId }: { messages: { role: 'user' | 'assistant'; content: string }[], sessionId: string }) => 
      chatWithAgent(messages, sessionId),
  });
}
