import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type MessageWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface MessageThreadProps {
  messages: MessageWithUser[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function MessageThread({
  messages,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (messages.length > 0 && messages[messages.length - 1].id !== lastMessageRef.current) {
      lastMessageRef.current = messages[messages.length - 1].id;
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <MoreHorizontal className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nessun messaggio ancora</h3>
          <p className="text-sm text-muted-foreground">
            Inizia la conversazione inviando un messaggio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {hasMore && onLoadMore && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onLoadMore}
            data-testid="button-load-more"
          >
            Carica messaggi precedenti
          </Button>
        )}
        {messages.map((message, index) => {
          const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;
          const timeGap = index > 0
            ? new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime()
            : 0;
          const showTimestamp = timeGap > 5 * 60 * 1000; // 5 minutes

          return (
            <div
              key={message.id}
              className={`group flex gap-3 hover-elevate rounded-md px-3 py-2 -mx-3 ${showTimestamp ? "mt-6" : ""}`}
              data-testid={`message-${message.id}`}
            >
              <div className="flex-shrink-0">
                {showAvatar ? (
                  <Avatar className="w-9 h-9 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                      {message.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-9 h-9" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {showAvatar && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm" data-testid={`message-sender-${message.id}`}>
                      {message.user.name}
                    </span>
                    <span className="text-xs text-muted-foreground" data-testid={`message-time-${message.id}`}>
                      {formatDistanceToNow(new Date(message.createdAt), {
                        addSuffix: true,
                        locale: it,
                      })}
                    </span>
                  </div>
                )}
                <div className="text-base leading-relaxed whitespace-pre-wrap break-words" data-testid={`message-content-${message.id}`}>
                  {message.content}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  data-testid={`button-message-actions-${message.id}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
