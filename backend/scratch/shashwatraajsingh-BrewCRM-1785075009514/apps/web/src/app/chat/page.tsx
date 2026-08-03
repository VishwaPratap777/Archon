import { ChatWindow } from '@/components/chat/chat-window';

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            ✦ AI Co-pilot
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Chat to build segments, draft messages, and launch campaigns.</p>
        </div>
      </div>
      
      <ChatWindow />
    </div>
  );
}
