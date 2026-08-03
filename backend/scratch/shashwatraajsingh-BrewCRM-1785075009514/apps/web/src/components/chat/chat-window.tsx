'use client';

import { useState, useRef, useEffect } from 'react';
import { useAgentChat } from '@/hooks/use-agent';
import { ChatMessage, AgentResponse } from '@/lib/types';
import { MessageBubble } from './message-bubble';
import { Send, Sparkles, RefreshCcw, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatWindow() {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [responses, setResponses] = useState<Record<number, AgentResponse>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [input, setInput] = useState('');
  
  const { mutate: chat, isPending } = useAgentChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages, isPending]);

  useEffect(() => {
    const savedSessionId = sessionStorage.getItem('chat_sessionId') || crypto.randomUUID();
    const savedMessages = JSON.parse(sessionStorage.getItem('chat_messages') || '[]');
    const savedResponses = JSON.parse(sessionStorage.getItem('chat_responses') || '{}');
    
    setSessionId(savedSessionId);
    setMessages(savedMessages);
    setResponses(savedResponses);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    sessionStorage.setItem('chat_sessionId', sessionId);
    sessionStorage.setItem('chat_messages', JSON.stringify(messages));
    sessionStorage.setItem('chat_responses', JSON.stringify(responses));
  }, [sessionId, messages, responses, isInitialized]);

  if (!isInitialized) return null;


  const handleReset = () => {
    if (messages.length > 0 && !confirm('Start a new conversation? Current chat will be lost.')) return;
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setResponses({});
    setInput('');
  };

  const handleSend = () => {
    if (!input.trim() || isPending) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');

    chat(
      { messages: newMessages, sessionId },
      {
        onSuccess: (data) => {
          const aiMsgIndex = newMessages.length;
          setMessages([...newMessages, { role: 'assistant', content: data.response }]);
          setResponses({ ...responses, [aiMsgIndex]: data });
        },
        onError: () => {
          setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const setSuggestion = (text: string) => {
    setInput(text);
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto w-full relative">
      <div className="flex justify-end pt-4 pr-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleReset}
          className="glass-panel border-border text-muted-foreground hover:text-foreground"
        >
          <RefreshCcw className="w-3.5 h-3.5 mr-2" /> New Chat
        </Button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-32 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-medium text-foreground mb-3">Campaign Co-pilot</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Tell me who you want to reach and what you want to say. I'll find the audience, draft the message, and launch the campaign.
            </p>
            
            <div className="flex flex-col gap-2 w-full">
              <button 
                onClick={() => setSuggestion("Find customers at risk of churning")}
                className="text-sm text-left px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 hover:bg-secondary text-muted-foreground transition-colors"
              >
                "Find customers at risk of churning"
              </button>
              <button 
                onClick={() => setSuggestion("Launch a WhatsApp campaign for loyal customers")}
                className="text-sm text-left px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 hover:bg-secondary text-muted-foreground transition-colors"
              >
                "Launch a WhatsApp campaign for loyal customers"
              </button>
              <button 
                onClick={() => setSuggestion("Who are our most valuable customers?")}
                className="text-sm text-left px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 hover:bg-secondary text-muted-foreground transition-colors"
              >
                "Who are our most valuable customers?"
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <MessageBubble 
                key={idx} 
                message={msg} 
                agentResponse={responses[idx]} 
              />
            ))}
            {isPending && (
              <div className="flex items-start w-full">
                <div className="px-5 py-3.5 bg-card border border-white/8 rounded-2xl rounded-tl-sm flex items-center gap-1.5 h-[44px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-12">
        <div className="max-w-3xl mx-auto relative flex items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to do..."
            className="min-h-[56px] max-h-[160px] bg-card border-border text-foreground rounded-xl resize-none pr-14 py-4 focus-visible:ring-1 focus-visible:ring-ring/50 shadow-lg"
            rows={1}
          />
          <Button 
            size="icon"
            disabled={!input.trim() || isPending}
            onClick={handleSend}
            className="absolute right-2 bottom-2 h-10 w-10 bg-primary hover:bg-primary/90 text-foreground rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-center mt-2 text-[11px] text-muted-foreground max-w-3xl mx-auto">
          AI can make mistakes. Please verify segments and messages before launching campaigns.
        </div>
      </div>
    </div>
  );
}
