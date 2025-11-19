import { Hash, Lock, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { type Channel } from "@shared/schema";
import { useState } from "react";

interface ChannelListProps {
  channels: Channel[];
  currentChannelId: string | null;
  onChannelSelect: (channel: Channel) => void;
  onCreateChannel: () => void;
}

export function ChannelList({
  channels,
  currentChannelId,
  onChannelSelect,
  onCreateChannel,
}: ChannelListProps) {
  const [showChannels, setShowChannels] = useState(true);

  const publicChannels = channels.filter((ch) => !ch.isPrivate);
  const privateChannels = channels.filter((ch) => ch.isPrivate);

  return (
    <ScrollArea className="flex-1">
      <div className="px-2 py-2 space-y-4">
        {/* Public Channels */}
        <div>
          <button
            onClick={() => setShowChannels(!showChannels)}
            className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-channels"
          >
            {showChannels ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Canali
          </button>
          {showChannels && (
            <div className="mt-1 space-y-0.5">
              {publicChannels.map((channel) => (
                <Button
                  key={channel.id}
                  variant="ghost"
                  className={`
                    w-full justify-start gap-2 px-2 py-1.5 h-auto font-normal
                    hover-elevate active-elevate-2
                    ${currentChannelId === channel.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                  `}
                  onClick={() => onChannelSelect(channel)}
                  data-testid={`channel-item-${channel.id}`}
                >
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{channel.name}</span>
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-2 py-1.5 h-auto font-normal hover-elevate active-elevate-2"
                onClick={onCreateChannel}
                data-testid="button-add-channel"
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi canale</span>
              </Button>
            </div>
          )}
        </div>

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div>
            <div className="flex items-center gap-1 px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Canali privati
              </span>
            </div>
            <div className="mt-1 space-y-0.5">
              {privateChannels.map((channel) => (
                <Button
                  key={channel.id}
                  variant="ghost"
                  className={`
                    w-full justify-start gap-2 px-2 py-1.5 h-auto font-normal
                    hover-elevate active-elevate-2
                    ${currentChannelId === channel.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                  `}
                  onClick={() => onChannelSelect(channel)}
                  data-testid={`channel-private-item-${channel.id}`}
                >
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{channel.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
