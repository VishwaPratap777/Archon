'use client';

import { ChatMessage, AgentResponse } from '@/lib/types';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Sparkles, ArrowRight, Bot } from 'lucide-react';
import Link from 'next/link';

interface MessageBubbleProps {
  message: ChatMessage;
  agentResponse?: AgentResponse; // For tool indicators and launch cards
}

export function MessageBubble({ message, agentResponse }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const parseMessageContent = (content: string) => {
    try {
      if (content.trim().startsWith('[') && content.trim().endsWith(']')) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.map(p => p.text || '').join('');
        }
      }
    } catch (e) {
      // Not JSON, ignore
    }
    return content;
  };

  const displayContent = parseMessageContent(message.content);

  return (
    <div className={cn("flex flex-col gap-2 w-full", isUser ? "items-end" : "items-start")}>
      <div className={cn(
        "px-5 py-4 max-w-[85%] sm:max-w-[80%] shadow-sm",
        isUser 
          ? "bg-primary text-foreground rounded-2xl rounded-tr-sm" 
          : "bg-card border border-white/8 text-neutral-100 rounded-2xl rounded-tl-sm"
      )}>
        {isUser ? (
          <div className="whitespace-pre-wrap">{displayContent}</div>
        ) : (
          <div className="prose prose-invert prose-base max-w-none prose-p:leading-relaxed prose-p:mb-4 last:prose-p:mb-0 prose-pre:bg-black/50 prose-pre:border prose-pre:border-border prose-ul:my-4 prose-li:my-1">
            <ReactMarkdown>{displayContent}</ReactMarkdown>
          </div>
        )}
      </div>

      {!isUser && agentResponse?.campaignLaunched && (
        <div className="mt-2 ml-2 border border-green-500/20 bg-green-500/5 rounded-xl p-4 w-[300px]">
          <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            Campaign Launched
          </div>
          <div className="text-sm text-muted-foreground mb-3">
            Sending to {agentResponse.campaignLaunched.totalCount} customers
          </div>
          <Link 
            href={`/campaigns/${agentResponse.campaignLaunched.campaignId}`}
            className="text-sm text-foreground flex items-center gap-1 hover:text-primary transition-colors"
          >
            View Campaign <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
