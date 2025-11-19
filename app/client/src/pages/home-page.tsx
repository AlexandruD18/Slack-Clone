import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Hash, Menu, Moon, Sun, Users } from "lucide-react";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { ChannelList } from "@/components/channel-list";
import { DirectMessagesList } from "@/components/direct-messages-list";
import { MessageThread } from "@/components/message-thread";
import { MessageInput } from "@/components/message-input";
import { CreateChannelModal } from "@/components/create-channel-modal";
import { UserProfilePanel } from "@/components/user-profile-panel";
import { SearchBar } from "@/components/search-bar";
import { TypingIndicator } from "@/components/typing-indicator";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-provider";
import { useWebSocket } from "@/lib/websocket-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  type Workspace,
  type Channel,
  type MessageWithUser,
  type User,
  type DirectMessageWithUser,
} from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PresenceIndicator } from "@/components/presence-indicator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { socket, sendMessage } = useWebSocket();
  const { toast } = useToast();

  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [selectedDMUser, setSelectedDMUser] = useState<User | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user || !token) {
      setLocation("/auth");
    }
  }, [user, token, setLocation]);

  // Fetch workspaces
  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
    enabled: !!user,
  });

  // Set initial workspace
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [workspaces, currentWorkspace]);

  // Fetch channels for current workspace
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels", currentWorkspace?.id],
    enabled: !!currentWorkspace,
  });

  // Fetch workspace members
  const { data: workspaceUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/workspaces", currentWorkspace?.id, "members"],
    enabled: !!currentWorkspace,
  });

  // Fetch messages for current channel
  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/messages", currentChannel?.id],
    enabled: !!currentChannel && !selectedDMUser,
  });

  // Fetch direct messages
  const { data: directMessages = [] } = useQuery<DirectMessageWithUser[]>({
    queryKey: ["/api/dm", selectedDMUser?.id],
    enabled: !!selectedDMUser,
  });

  // WebSocket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.event) {
          case "message:new":
            if (data.data.channelId === currentChannel?.id) {
              queryClient.invalidateQueries({ queryKey: ["/api/messages", currentChannel.id] });
            }
            break;
          case "dm:new":
            if (data.data.senderId === selectedDMUser?.id || data.data.receiverId === selectedDMUser?.id) {
              queryClient.invalidateQueries({ queryKey: ["/api/dm", selectedDMUser.id] });
            }
            break;
          case "presence:update":
            setOnlineUsers(new Set(data.data.onlineUserIds));
            break;
          case "typing:start":
            if (data.data.channelId === currentChannel?.id) {
              setTypingUsers((prev) => [...new Set([...prev, data.data.userName])]);
            }
            break;
          case "typing:stop":
            setTypingUsers((prev) => prev.filter((name) => name !== data.data.userName));
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, currentChannel, selectedDMUser]);

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/workspaces", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      toast({ title: "Workspace creato", description: "Il workspace è stato creato con successo!" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; isPrivate: boolean }) =>
      apiRequest("POST", "/api/channels", { ...data, workspaceId: currentWorkspace!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", currentWorkspace?.id] });
      toast({ title: "Canale creato", description: "Il canale è stato creato con successo!" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (selectedDMUser) {
        return apiRequest("POST", "/api/dm", { receiverId: selectedDMUser.id, content });
      } else {
        return apiRequest("POST", "/api/messages", { channelId: currentChannel!.id, content });
      }
    },
    onSuccess: () => {
      if (selectedDMUser) {
        queryClient.invalidateQueries({ queryKey: ["/api/dm", selectedDMUser.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", currentChannel?.id] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  const handleTyping = () => {
    if (currentChannel && socket) {
      sendMessage("typing:start", { channelId: currentChannel.id, userName: user?.name });
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setCurrentChannel(channel);
    setSelectedDMUser(null);
    setSidebarOpen(false);
  };

  const handleDMUserSelect = (dmUser: User) => {
    setSelectedDMUser(dmUser);
    setCurrentChannel(null);
    setSidebarOpen(false);
  };

  const displayMessages = selectedDMUser
    ? directMessages.map((dm) => ({
        id: dm.id,
        channelId: "",
        userId: dm.senderId,
        content: dm.content,
        createdAt: dm.createdAt,
        user: dm.senderId === user?.id ? user : dm.sender,
      }))
    : messages;

  const Sidebar = () => (
    <div className="w-64 bg-sidebar border-r flex flex-col h-full">
      <div className="p-3 border-b">
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={setCurrentWorkspace}
          onCreateWorkspace={(name) => createWorkspaceMutation.mutate(name)}
        />
      </div>
      <ChannelList
        channels={channels}
        currentChannelId={currentChannel?.id || null}
        onChannelSelect={handleChannelSelect}
        onCreateChannel={() => setShowCreateChannel(true)}
      />
      <DirectMessagesList
        users={workspaceUsers}
        onlineUsers={onlineUsers}
        currentUserId={user?.id || null}
        selectedUserId={selectedDMUser?.id || null}
        onUserSelect={handleDMUserSelect}
      />
    </div>
  );

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSidebarOpen(true)}
                  data-testid="button-mobile-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <div className="flex items-center gap-2 min-w-0">
              {selectedDMUser ? (
                <>
                  <div className="relative">
                    <Avatar className="w-6 h-6 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                        {selectedDMUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <PresenceIndicator
                      status={onlineUsers.has(selectedDMUser.id) ? "online" : "offline"}
                      size="sm"
                    />
                  </div>
                  <span className="font-semibold truncate" data-testid="text-current-dm">
                    {selectedDMUser.name}
                  </span>
                </>
              ) : currentChannel ? (
                <>
                  <Hash className="w-5 h-5 flex-shrink-0" />
                  <span className="font-semibold truncate" data-testid="text-current-channel">
                    {currentChannel.name}
                  </span>
                  {currentChannel.description && (
                    <span className="text-sm text-muted-foreground hidden lg:inline truncate">
                      {currentChannel.description}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Seleziona un canale</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SearchBar onSearch={(query) => console.log("Search:", query)} />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowUserProfile(user)}
              data-testid="button-user-menu"
            >
              <div className="relative">
                <Avatar className="w-8 h-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <PresenceIndicator status="online" size="sm" />
              </div>
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentChannel || selectedDMUser ? (
            <>
              <MessageThread
                messages={displayMessages}
                isLoading={messagesLoading}
              />
              <TypingIndicator users={typingUsers} />
              <MessageInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                placeholder={
                  selectedDMUser
                    ? `Messaggio a ${selectedDMUser.name}...`
                    : currentChannel
                    ? `Messaggio in #${currentChannel.name}...`
                    : "Scrivi un messaggio..."
                }
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Benvenuto su Slack Clone</h2>
                <p className="text-muted-foreground mb-6">
                  Seleziona un canale dalla sidebar per iniziare a collaborare con il tuo team.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Panel */}
      {showUserProfile && (
        <UserProfilePanel
          user={showUserProfile}
          isCurrentUser={showUserProfile.id === user.id}
          isOnline={onlineUsers.has(showUserProfile.id)}
          onClose={() => setShowUserProfile(null)}
        />
      )}

      {/* Create Channel Modal */}
      <CreateChannelModal
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onCreateChannel={(data) => createChannelMutation.mutate(data)}
      />
    </div>
  );
}
