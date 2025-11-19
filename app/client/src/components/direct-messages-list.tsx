import { useState } from "react";
import { ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PresenceIndicator } from "./presence-indicator";
import { type User } from "@shared/schema";

interface DirectMessagesListProps {
  users: User[];
  onlineUsers: Set<string>;
  currentUserId: string | null;
  selectedUserId: string | null;
  onUserSelect: (user: User) => void;
}

export function DirectMessagesList({
  users,
  onlineUsers,
  currentUserId,
  selectedUserId,
  onUserSelect,
}: DirectMessagesListProps) {
  const [showDMs, setShowDMs] = useState(true);

  // Filter out current user
  const otherUsers = users.filter((u) => u.id !== currentUserId);

  return (
    <div className="px-2 py-2">
      <button
        onClick={() => setShowDMs(!showDMs)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-toggle-dms"
      >
        {showDMs ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        Messaggi diretti
      </button>
      {showDMs && (
        <div className="mt-1 space-y-0.5">
          {otherUsers.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              Nessun altro utente disponibile
            </div>
          ) : (
            otherUsers.map((user) => (
              <Button
                key={user.id}
                variant="ghost"
                className={`
                  w-full justify-start gap-2 px-2 py-1.5 h-auto font-normal
                  hover-elevate active-elevate-2
                  ${selectedUserId === user.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                `}
                onClick={() => onUserSelect(user)}
                data-testid={`dm-user-${user.id}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-6 h-6 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <PresenceIndicator
                    status={onlineUsers.has(user.id) ? "online" : "offline"}
                    size="sm"
                  />
                </div>
                <span className="truncate flex-1 text-left">{user.name}</span>
              </Button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
