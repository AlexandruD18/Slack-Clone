# Documento di Analisi Tecnica (DAT)

## Slack-Clone Frontend

---

## 📋 Intestazione Documento

| Attributo    | Valore                                 |
| ------------ | -------------------------------------- |
| **Titolo**   | Slack-Clone Frontend - Analisi Tecnica |
| **Versione** | 1.0                                    |
| **Data**     | 19 novembre 2025                       |
| **Autore**   | Team Architecture                      |
| **Revisori** | Da definire                            |
| **Stato**    | Bozza                                  |
| **Stack**    | React 18+ / TypeScript / Vite          |

---

## 🏗️ Architettura Tecnica

### High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       BROWSER (Client)                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              React Application (SPA)                   │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ UI Layer (Components)                            │  │  │
│  │  │ ├── Auth Views (Login, Signup)                   │  │  │
│  │  │ ├── Chat Interface (Channels, DMs)               │  │  │
│  │  │ ├── Sidebar (Navigation)                         │  │  │
│  │  │ ├── User Settings & Profile                      │  │  │
│  │  │ └── Notification System                          │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                      ↓                                 │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ State Management (Context API / Zustand)         │  │  │
│  │  │ ├── Auth State (user, tokens, session)           │  │  │
│  │  │ ├── Workspace State (current, list)              │  │  │
│  │  │ ├── Channel State (messages, list)               │  │  │
│  │  │ ├── User State (presence, profile)               │  │  │
│  │  │ └── UI State (modals, drawers, theme)            │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                      ↓                                 │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Service Layer (API Clients)                      │  │  │
│  │  │ ├── REST Client (Axios)                          │  │  │
│  │  │ │   ├── AuthService.ts                           │  │  │
│  │  │ │   ├── WorkspaceService.ts                      │  │  │
│  │  │ │   ├── ChannelService.ts                        │  │  │
│  │  │ │   ├── MessageService.ts                        │  │  │
│  │  │ │   └── UserService.ts                           │  │  │
│  │  │ └── WebSocket Client (Socket.io)                 │  │  │
│  │  │     ├── message events                           │  │  │
│  │  │     ├── presence events                          │  │  │
│  │  │     ├── typing events                            │  │  │
│  │  │     └── connection management                    │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                      ↓                                 │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Local Storage & Caching                          │  │  │
│  │  │ ├── Authentication tokens (HttpOnly cookies)     │  │  │
│  │  │ ├── User preferences (localStorage)              │  │  │
│  │  │ ├── Recent messages (Memory cache)               │  │  │
│  │  │ ├── Presence data (In-memory state)              │  │  │
│  │  │ └── Draft messages (localStorage)                │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                      ↓                                 │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ HTTP & WebSocket                                 │  │  │
│  │  │ ├── REST API (https://api.example.com/api)       │  │  │
│  │  │ └── WebSocket (wss://api.example.com/ws)         │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Browser APIs                                           │  │
│  │ ├── localStorage (draft messages, preferences)         │  │
│  │ ├── sessionStorage (temp data)                         │  │
│  │ ├── IndexedDB (large cache, offline data)              │  │
│  │ ├── Service Workers (offline support)                  │  │
│  │ └── Push Notifications API                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (API Server)                      │
├──────────────────────────────────────────────────────────────┤
│ Gateway → API Server → Database / Redis / WebSocket          │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚛️ React Architecture

### Component Hierarchy

```
App.tsx (Root)
├── <Provider> (AuthProvider, WorkspaceProvider, ThemeProvider)
│
├── Routes
│   ├── <AuthRoutes>
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── PasswordReset.tsx
│   │
│   ├── <ProtectedRoutes>
│   │   ├── WorkspaceSelector.tsx
│   │   │   └── WorkspaceCard.tsx (multiple)
│   │   │
│   │   ├── ChatLayout.tsx (main layout)
│   │   │   ├── <Header>
│   │   │   │   ├── WorkspaceDropdown.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── SettingsMenu.tsx
│   │   │   │
│   │   │   ├── <Sidebar>
│   │   │   │   ├── ChannelList.tsx
│   │   │   │   │   └── ChannelItem.tsx (multiple)
│   │   │   │   ├── DMList.tsx
│   │   │   │   │   └── DMItem.tsx (multiple)
│   │   │   │   └── ComposeButton.tsx
│   │   │   │
│   │   │   ├── <MainContent>
│   │   │   │   ├── ChannelHeader.tsx
│   │   │   │   │   └── ChannelInfo.tsx
│   │   │   │   │
│   │   │   │   ├── MessageList.tsx
│   │   │   │   │   ├── MessageItem.tsx (multiple)
│   │   │   │   │   │   ├── MessageContent.tsx
│   │   │   │   │   │   ├── MessageReactions.tsx
│   │   │   │   │   │   └── MessageActions.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   │   └── MessageSeparator.tsx (dates)
│   │   │   │   │
│   │   │   │   └── MessageInput.tsx
│   │   │   │       ├── EmojiPicker.tsx (lazy)
│   │   │   │       ├── AttachmentMenu.tsx (Phase 2)
│   │   │   │       └── FormattingToolbar.tsx
│   │   │   │
│   │   │   └── <RightPanel> (Phase 2)
│   │   │       ├── MemberList.tsx
│   │   │       ├── ChannelInfo.tsx
│   │   │       └── SearchResults.tsx
│   │   │
│   │   ├── Settings.tsx
│   │   │   ├── ProfileSettings.tsx
│   │   │   ├── AccountSettings.tsx
│   │   │   ├── PreferenceSettings.tsx
│   │   │   └── NotificationSettings.tsx
│   │   │
│   │   └── UserProfile.tsx (modal)
│   │       ├── ProfileHeader.tsx
│   │       ├── ProfileInfo.tsx
│   │       └── ProfileActions.tsx
│   │
│   └── <NotFound>
│       └── 404.tsx
│
└── <Toast> (notification system)
```

---

## 🔐 Authentication Flow

### Implementation Sequence

```
┌─────────────────┐
│   User visits   │
│ /auth/login     │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Check token in  │
│  HttpOnly       │──Yes──→ [Redirect to /workspaces]
│  cookie         │
└────────┬────────┘
         │ No
         ↓
┌─────────────────────────────────┐
│ Render Login Component          │
│ ├── Email input + validation    │
│ ├── Password input              │
│ └── Submit button               │
└────────┬────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ User clicks "Sign In"           │
│ POST /api/auth/login            │
│ ├── email: "user@example.com"   │
│ └── password: "hashedPassword"  │
└────────┬────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Backend response:               │
│ {                               │
│   "access_token": "eyJwc...",   │
│   "refresh_token": "abc...",    │
│   "user": { id, email, name }   │
│ }                               │
└────────┬────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Client-side:                    │
│ ├── Store tokens in store       │
│ ├── Set HttpOnly cookies        │
│ ├── Set auth header on axios    │
│ └── Update user context         │
└────────┬────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Redirect to /workspaces         │
│ (Protected route accessible)    │
└─────────────────────────────────┘
```

### Token Management

```typescript
// auth.ts (Authentication service)

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Token stored in:
// - Memory: accessToken (5-minute refresh)
// - HttpOnly Cookie: refresh_token (7-day expiry)

// Axios interceptor:
// - Every request adds: Authorization: Bearer <accessToken>
// - If 401 response:
//   a. Call /api/auth/refresh with refresh_token
//   b. Get new accessToken
//   c. Retry original request
//   d. If refresh fails: logout, redirect to login

// On logout:
// - Clear tokens from memory
// - Clear HttpOnly cookies
// - Clear user context
// - Redirect to /auth/login
```

---

## 🗃️ State Management Architecture

### Context API Structure (Recommended)

```typescript
// contexts/AuthContext.ts
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// contexts/WorkspaceContext.ts
export interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  selectWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
}

// contexts/ChannelContext.ts
export interface ChannelContextType {
  currentChannel: Channel | null;
  channels: Channel[];
  selectChannel: (id: string) => void;
  createChannel: (name: string) => Promise<Channel>;
  updateChannelMessages: (messages: Message[]) => void;
}

// contexts/MessageContext.ts
export interface MessageContextType {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  loadMessages: (channelId: string, limit?: number) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, body: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
}

// contexts/PresenceContext.ts
export interface PresenceContextType {
  onlineUsers: Set<string>;
  userPresence: Map<string, UserPresence>;
  updatePresence: (userId: string, status: PresenceStatus) => void;
}

// contexts/UIContext.ts
export interface UIContextType {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  isDrawerOpen: boolean;
  toggleDrawer: () => void;
  toast: (message: string, type: "info" | "error" | "success") => void;
}
```

### Alternative: Zustand Store

```typescript
// store/authStore.ts
import create from "zustand";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  login: async (email, password) => {
    // Implementation
    set({ user: response.user, accessToken: response.token });
  },

  logout: async () => {
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));

// Usage in component:
// const user = useAuthStore((state) => state.user);
// const login = useAuthStore((state) => state.login);
```

---

## 🔌 API Integration

### Axios Configuration

```typescript
// lib/api.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000/api",
  timeout: 10000,
  withCredentials: true, // Include cookies
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (handle 401, refresh token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          "/api/auth/refresh",
          {},
          {
            withCredentials: true,
          }
        );

        useAuthStore.setState({ accessToken: data.access_token });

        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = "/auth/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Service Classes

```typescript
// services/authService.ts
export class AuthService {
  static async login(email: string, password: string) {
    return apiClient.post("/auth/login", { email, password });
  }

  static async signup(data: SignupData) {
    return apiClient.post("/auth/register", data);
  }

  static async logout() {
    return apiClient.post("/auth/logout");
  }

  static async refreshToken() {
    return apiClient.post("/auth/refresh");
  }

  static async resetPassword(email: string) {
    return apiClient.post("/auth/password-reset", { email });
  }
}

// services/workspaceService.ts
export class WorkspaceService {
  static async listWorkspaces() {
    return apiClient.get("/workspaces");
  }

  static async createWorkspace(name: string, description?: string) {
    return apiClient.post("/workspaces", { name, description });
  }

  static async getWorkspace(id: string) {
    return apiClient.get(`/workspaces/${id}`);
  }

  static async updateWorkspace(id: string, data: Partial<Workspace>) {
    return apiClient.patch(`/workspaces/${id}`, data);
  }

  static async deleteWorkspace(id: string) {
    return apiClient.delete(`/workspaces/${id}`);
  }

  static async leaveWorkspace(id: string) {
    return apiClient.delete(`/workspaces/${id}/leave`);
  }
}

// services/channelService.ts
export class ChannelService {
  static async listChannels(workspaceId: string) {
    return apiClient.get(`/workspaces/${workspaceId}/channels`);
  }

  static async createChannel(
    workspaceId: string,
    name: string,
    type: "public" | "private" = "public"
  ) {
    return apiClient.post(`/workspaces/${workspaceId}/channels`, {
      name,
      type,
    });
  }

  static async getMessages(channelId: string, limit = 50, offset = 0) {
    return apiClient.get(`/channels/${channelId}/messages`, {
      params: { limit, offset },
    });
  }

  static async searchMessages(channelId: string, query: string) {
    return apiClient.get(`/channels/${channelId}/messages/search`, {
      params: { q: query },
    });
  }
}

// services/messageService.ts
export class MessageService {
  static async sendMessage(channelId: string, body: string) {
    return apiClient.post(`/messages`, { channel_id: channelId, body });
  }

  static async updateMessage(id: string, body: string) {
    return apiClient.patch(`/messages/${id}`, { body });
  }

  static async deleteMessage(id: string) {
    return apiClient.delete(`/messages/${id}`);
  }

  static async addReaction(messageId: string, emoji: string) {
    return apiClient.post(`/messages/${messageId}/reactions`, { emoji });
  }

  static async removeReaction(messageId: string, emoji: string) {
    return apiClient.delete(`/messages/${messageId}/reactions/${emoji}`);
  }
}
```

---

## 📡 WebSocket Integration

### Socket.io Configuration

```typescript
// lib/socket.ts
import io, { Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(process.env.REACT_APP_WS_URL || "http://localhost:4000", {
    auth: {
      token,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("WebSocket connected");
  });

  socket.on("disconnect", (reason) => {
    console.log("WebSocket disconnected:", reason);
  });

  socket.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### Event Listeners (Hook-based)

```typescript
// hooks/useWebSocket.ts
export const useWebSocket = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const socket = initializeSocket(useAuthStore.getState().accessToken!);

    // Message events
    socket.on("message:new", (message: Message) => {
      useMessageStore.getState().addMessage(message);

      // Show toast notification if not in current channel
      if (
        message.channel_id !== useChannelStore.getState().currentChannel?.id
      ) {
        useUIStore.getState().toast(`New message in #${message.channel_id}`);
      }
    });

    socket.on("message:updated", (data: { id: string; body: string }) => {
      useMessageStore.getState().updateMessage(data.id, data.body);
    });

    socket.on("message:deleted", (data: { id: string }) => {
      useMessageStore.getState().deleteMessage(data.id);
    });

    // Presence events
    socket.on("presence:changed", (data: UserPresence) => {
      usePresenceStore.getState().updatePresence(data.user_id, data.status);
    });

    // Typing events
    socket.on(
      "typing:started",
      (data: { user_id: string; user_name: string }) => {
        useUIStore.getState().addTypingUser(data);
      }
    );

    socket.on("typing:stopped", (data: { user_id: string }) => {
      useUIStore.getState().removeTypingUser(data.user_id);
    });

    // Channel membership
    socket.on("channel:member:joined", (data: ChannelMemberEvent) => {
      useChannelStore.getState().addMember(data);
    });

    socket.on("channel:member:left", (data: ChannelMemberEvent) => {
      useChannelStore.getState().removeMember(data);
    });

    return () => {
      // Cleanup event listeners if needed
      socket.off("message:new");
      socket.off("message:updated");
      socket.off("message:deleted");
      // ... other off() calls
    };
  }, [user]);
};
```

### Emitting Events

```typescript
// hooks/useMessageSend.ts
export const useMessageSend = () => {
  const socket = getSocket();
  const { currentChannel } = useChannelStore();
  const { user } = useAuthStore();

  const sendMessage = async (body: string) => {
    if (!currentChannel || !user || !socket) return;

    // Optimistic update (show locally immediately)
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      channel_id: currentChannel.id,
      sender_id: user.id,
      body,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null,
    };

    useMessageStore.getState().addMessage(tempMessage);

    try {
      // Send via REST API
      const response = await MessageService.sendMessage(
        currentChannel.id,
        body
      );

      // Replace temp with real message
      useMessageStore.getState().updateMessage(tempMessage.id, response.data);
    } catch (error) {
      // Show error, mark message as failed
      useUIStore.getState().toast("Failed to send message", "error");
      useMessageStore.getState().setMessageStatus(tempMessage.id, "failed");
    }
  };

  const notifyTyping = () => {
    if (!currentChannel || !socket) return;
    socket.emit("typing:started", { channel_id: currentChannel.id });
  };

  const notifyTypingStop = () => {
    if (!currentChannel || !socket) return;
    socket.emit("typing:stopped", { channel_id: currentChannel.id });
  };

  return { sendMessage, notifyTyping, notifyTypingStop };
};
```

---

## 💾 Caching Strategy

### Data Caching Levels

```
Level 1: In-Memory Cache (Zustand store)
├── Current channel messages (100-500 most recent)
├── Online users list
├── Typing indicators
└── TTL: Session duration

Level 2: Local Storage
├── User preferences (theme, language, timezone)
├── Workspace/channel selections
├── Draft messages
└── TTL: 30 days

Level 3: IndexedDB (Service Worker)
├── Message history (up to 1000 per channel)
├── Attachment metadata
├── User presence history
└── TTL: 7 days

Cache Invalidation:
├── Manual: On logout
├── Time-based: Periodic refresh (5 min)
├── Event-based: On WebSocket updates
└── Manual clear in settings
```

### Message Pagination

```typescript
// Hook for lazy-loading older messages
export const useMessagePagination = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 50;

  const loadMoreMessages = async () => {
    try {
      const response = await ChannelService.getMessages(
        channelId,
        PAGE_SIZE,
        offset
      );

      setMessages([...response.data.messages, ...messages]);
      setOffset(offset + PAGE_SIZE);
      setHasMore(response.data.total > offset + PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  return { messages, hasMore, loadMoreMessages };
};
```

---

## 🎨 Responsive Design Implementation

### CSS Media Queries & Breakpoints

```css
/* Tailwind configuration (tailwind.config.ts) */
module.exports = {
  theme: {
    screens: {
      'xs': '320px',  // Extra small mobile
      'sm': '640px',  // Small mobile
      'md': '768px',  // Tablet portrait
      'lg': '1024px', // Tablet landscape / Small desktop
      'xl': '1280px', // Desktop
      '2xl': '1536px', // Large desktop
    },
  },
};

/* Component responsive layout */
<div className="flex flex-col lg:flex-row gap-4">
  {/* Sidebar: hidden on mobile, visible on lg+ */}
  <aside className="hidden lg:block w-64">
    {/* Channel list */}
  </aside>

  {/* Main content: full width on mobile */}
  <main className="flex-1">
    {/* Chat messages */}
  </main>

  {/* Right panel: hidden on mobile, visible on xl+ (Phase 2) */}
  <aside className="hidden xl:block w-64">
    {/* Member list */}
  </aside>
</div>

/* Mobile hamburger menu */
<button className="lg:hidden" onClick={toggleSidebar}>
  ☰ Menu
</button>

/* Touch-friendly button sizing */
<button className="min-h-12 min-w-12"> {/* 48px minimum */}
  Click me
</button>
```

---

## 🧪 Testing Strategy

### Unit Tests (Jest + React Testing Library)

```typescript
// __tests__/components/MessageInput.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import MessageInput from "@components/MessageInput";

describe("MessageInput", () => {
  it("renders input field", () => {
    render(<MessageInput onSend={jest.fn()} />);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
  });

  it("sends message on submit", async () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith("Hello");
  });

  it("clears input after sending", async () => {
    render(<MessageInput onSend={jest.fn()} />);

    const input = screen.getByPlaceholderText(
      /type a message/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(input.value).toBe("");
  });
});
```

### Integration Tests (API mocking with MSW)

```typescript
// __tests__/integration/auth.test.tsx
import { setupServer } from "msw/node";
import { rest } from "msw";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@pages/auth/login";

const server = setupServer(
  rest.post("/api/auth/login", (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: "mock-token",
        user: { id: "1", email: "test@example.com" },
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Login Flow", () => {
  it("logs in user successfully", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/workspaces");
    });
  });
});
```

### E2E Tests (Cypress)

```typescript
// e2e/auth.cy.ts
describe("Authentication", () => {
  it("completes full login flow", () => {
    cy.visit("http://localhost:5173/auth/login");

    cy.get('input[type="email"]').type("test@example.com");
    cy.get('input[type="password"]').type("password123");
    cy.get('button:contains("Sign In")').click();

    cy.url().should("include", "/workspaces");
    cy.get('h1:contains("Your Workspaces")').should("be.visible");
  });

  it("sends and receives message in real-time", () => {
    cy.login("user@example.com", "password123");
    cy.visit("http://localhost:5173/chat/general");

    cy.get('input[placeholder="Type a message"]').type("Hello team!");
    cy.get('button:contains("Send")').click();

    cy.contains("Hello team!").should("be.visible");
  });
});
```

---

## ♿ Accessibility Implementation

### Semantic HTML & ARIA

```typescript
// Bad ❌
<div onClick={handleClick}>Send</div>

// Good ✅
<button onClick={handleClick} aria-label="Send message">
  Send
</button>

// Form with labels
<form>
  <label htmlFor="email-input">Email Address</label>
  <input
    id="email-input"
    type="email"
    required
    aria-describedby="email-help"
  />
  <span id="email-help">We'll never share your email</span>
</form>

// Live regions (for dynamic content)
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {statusMessage}
</div>

// Skip navigation link
<a href="#main-content" className="sr-only">
  Skip to main content
</a>

// Focus management in modals
<dialog ref={dialogRef} onKeyDown={handleEscape}>
  {/* Content */}
</dialog>
```

### Focus & Keyboard Navigation

```typescript
// Custom hook for keyboard navigation
export const useKeyboardNavigation = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = useRef<HTMLElement[]>([]);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        setActiveIndex((prev) => (prev + 1) % items.current.length);
        items.current[activeIndex]?.focus();
        e.preventDefault();
        break;
      case "ArrowUp":
        setActiveIndex((prev) =>
          prev === 0 ? items.current.length - 1 : prev - 1
        );
        items.current[activeIndex]?.focus();
        e.preventDefault();
        break;
      case "Enter":
        items.current[activeIndex]?.click();
        break;
    }
  };

  return { handleKeyDown, items };
};
```

---

## 🚀 Performance Optimization

### Code Splitting & Lazy Loading

```typescript
// routes.tsx
import { lazy, Suspense } from "react";

const LoginPage = lazy(() => import("@pages/auth/login"));
const ChatLayout = lazy(() => import("@layouts/ChatLayout"));
const Settings = lazy(() => import("@pages/settings"));

export const Routes = () => (
  <Suspense fallback={<LoadingSpinner />}>{/* Route definitions */}</Suspense>
);
```

### Memoization & Re-render Prevention

```typescript
// MessageList component (prevent unnecessary re-renders)
export const MessageList = React.memo(
  ({ messages, onLoad }: Props) => {
    return (
      <div>
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if messages change
    return prevProps.messages === nextProps.messages;
  }
);

// Virtual scrolling for large lists
import { FixedSizeList } from "react-window";

export const VirtualMessageList = ({ messages }: Props) => (
  <FixedSizeList height={600} itemCount={messages.length} itemSize={60}>
    {({ index, style }) => (
      <div style={style}>
        <MessageItem message={messages[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

### Image Optimization

```typescript
// Avatar image with optimization
<img
  src={userAvatar}
  alt={userName}
  loading="lazy"
  decoding="async"
  width="48"
  height="48"
  srcSet={`${avatar48} 48w, ${avatar96} 96w`}
/>;

// Next.js Image component (if using Next.js)
import Image from "next/image";

<Image
  src={userAvatar}
  alt={userName}
  width={48}
  height={48}
  priority={isCurrentUser}
  placeholder="blur"
  blurDataURL={placeholderDataUrl}
/>;
```

---

## 📦 Build & Deployment

### Vite Configuration

```typescript
// vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: "dist",
    sourcemap: false, // true for dev, false for prod
    rollupOptions: {
      output: {
        manualChunks: {
          // Code splitting strategy
          vendor: ["react", "react-dom", "axios"],
          socket: ["socket.io-client"],
        },
      },
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:4000",
        ws: true,
      },
    },
  },
});
```

### Environment Variables

```bash
# .env.local
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_WS_URL=http://localhost:4000
REACT_APP_ENV=development

# .env.production
REACT_APP_API_URL=https://api.example.com/api
REACT_APP_WS_URL=wss://api.example.com
REACT_APP_ENV=production
```

---

## 🔒 Security Considerations

### Input Sanitization

```typescript
// DOMPurify for sanitizing HTML
import DOMPurify from "dompurify";

export const sanitizeHTML = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a"],
    ALLOWED_ATTR: ["href", "target"],
  });
};

// In message display:
<div>{sanitizeHTML(message.body)}</div>;
```

### CSRF Protection

```typescript
// Auto-included with credentials: true
apiClient.defaults.withCredentials = true;

// Backend sends CSRF token in Set-Cookie header
// Frontend automatically includes it in X-CSRF-Token header
```

### Content Security Policy (CSP)

```html
<!-- index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' wss: https:;
    font-src 'self' data:;
  "
/>
```

---

**Documento:** Slack-Clone Frontend - Analisi Tecnica  
**Versione:** 1.0  
**Status:** 🟡 **Bozza - In Review**  
**Ultimo update:** 19 novembre 2025
