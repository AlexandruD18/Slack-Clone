# Slack Clone - Real-time Team Messaging Application

## Overview

This is a full-stack Slack clone built with React, Express, and PostgreSQL. The application provides real-time team communication with workspaces, channels, direct messaging, and presence tracking. It uses WebSocket for live updates and follows a modern three-column layout inspired by Slack's interface.

**Core Features:**
- Workspace and channel management
- Real-time messaging with WebSocket
- Direct messaging between users
- User presence indicators (online/offline status)
- Message history persistence
- Responsive design with mobile support

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Monorepo Structure

The application uses a monorepo pattern with shared TypeScript types between frontend and backend:

- **`client/`** - React frontend with Vite
- **`server/`** - Express backend with WebSocket support
- **`shared/`** - Common TypeScript schemas and types (Drizzle ORM models, Zod validation)

**Rationale:** Co-locating frontend and backend enables type safety across the entire stack and simplifies development by sharing validation schemas and data models.

### Frontend Architecture

**Technology Stack:**
- **React 18** with TypeScript
- **Vite** for build tooling and development server
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and caching
- **Shadcn/ui + Radix UI** for accessible component primitives
- **Tailwind CSS** with custom design tokens

**Key Design Decisions:**

1. **Component-Based Architecture**: UI is built from composable components in `client/src/components/` with a separate `ui/` subdirectory for base design system components.

2. **Context Providers for Cross-Cutting Concerns**:
   - `AuthContext` - User authentication state and JWT token management
   - `WebSocketContext` - WebSocket connection lifecycle and message broadcasting
   - `ThemeContext` - Light/dark mode theming

3. **Real-time Updates via WebSocket**: The `WebSocketProvider` maintains a persistent connection to `/ws` endpoint, automatically reconnecting on disconnect. Components subscribe to WebSocket events for live message delivery.

4. **State Management Pattern**: TanStack Query handles server-side data fetching and caching, while React Context manages client-side global state (auth, WebSocket, theme).

### Backend Architecture

**Technology Stack:**
- **Express.js** with TypeScript
- **Drizzle ORM** for database queries
- **Neon Serverless PostgreSQL** (via `@neondatabase/serverless`)
- **WebSocket (`ws` library)** for real-time communication
- **JWT** for authentication
- **bcrypt** for password hashing

**Key Design Decisions:**

1. **RESTful API + WebSocket Hybrid**:
   - REST endpoints (`/api/*`) handle CRUD operations (user registration, channel creation, etc.)
   - WebSocket (`/ws`) handles real-time message broadcasting and presence updates
   - **Rationale:** REST for request/response patterns, WebSocket for push-based updates eliminates polling overhead

2. **Stateful WebSocket Connections**: Server maintains in-memory maps:
   - `userConnections` - Maps user IDs to active WebSocket connections
   - `channelSubscriptions` - Tracks which connections are subscribed to which channels
   - **Trade-off:** Simple implementation for MVP; would need Redis/pub-sub for multi-instance deployments

3. **Authentication Flow**:
   - JWT tokens generated on login (`/api/auth/login`) and registration (`/api/auth/register`)
   - Middleware `authenticateJWT` validates Bearer tokens on protected routes
   - WebSocket connections authenticate via query parameter token (`/ws?token=...`)

4. **Database Layer Abstraction**: `server/storage.ts` provides a repository pattern interface over Drizzle ORM, making it easier to swap implementations or add caching later.

### Database Schema

**Tables:**
- `users` - User accounts with email, hashed password, name, avatar, and status
- `workspaces` - Team workspaces with owner relationships
- `workspace_members` - Junction table for workspace membership with roles
- `channels` - Chat channels (public/private) within workspaces
- `channel_members` - Junction table for channel membership
- `messages` - Channel messages with references to user and channel
- `direct_messages` - One-to-one messages between users

**Key Relationships:**
- Users can belong to multiple workspaces (many-to-many via `workspace_members`)
- Channels belong to one workspace, users subscribe to channels (many-to-many via `channel_members`)
- Messages are polymorphic: channel messages vs. direct messages stored in separate tables

**Rationale:** Normalized schema prevents data duplication. Separate tables for channel vs. direct messages simplify queries and allow different indexing strategies.

### WebSocket Protocol

**Client-to-Server Events:**
- `subscribe_channel` - Join a channel's message stream
- `unsubscribe_channel` - Leave a channel's message stream
- `new_message` - Send a message to a channel
- `new_dm` - Send a direct message to another user
- `typing` - Broadcast typing indicator

**Server-to-Client Events:**
- `new_message` - Broadcast incoming channel message
- `new_dm` - Deliver incoming direct message
- `user_online` / `user_offline` - Presence notifications
- `typing` - Relay typing indicators to channel members

**Broadcast Strategy**: When a message is sent, the server iterates through all WebSocket connections subscribed to that channel and sends the message payload. Direct messages are sent only to the recipient's active connections.

### Design System

**Theming:** The application uses CSS custom properties (`--background`, `--primary`, etc.) defined in `client/src/index.css` with light/dark mode variants toggled via `.dark` class on root element.

**Spacing & Typography:** Follows Tailwind's utility-first approach with custom spacing units (2, 4, 6, 8, 12) for consistent rhythm. Design guidelines in `design_guidelines.md` specify a three-column layout (240px sidebar, flexible main content, 280px collapsible right panel).

**Component Library:** Shadcn/ui components (configured via `components.json`) provide accessible, unstyled primitives (dialogs, dropdowns, etc.) that are styled with Tailwind classes.

## External Dependencies

### Third-Party Services

1. **Neon Serverless PostgreSQL**
   - Managed PostgreSQL database with WebSocket support
   - Connection pooling via `@neondatabase/serverless` package
   - Environment variable: `DATABASE_URL`

2. **Drizzle ORM**
   - Type-safe database query builder
   - Schema-first approach with TypeScript models in `shared/schema.ts`
   - Migration management via `drizzle-kit`

### Authentication & Security

- **JWT (jsonwebtoken)**: Token-based authentication with `JWT_SECRET` environment variable
- **bcrypt**: Password hashing with configurable salt rounds (default: 10)
- **CORS & Security**: Express middleware handles request validation; production deployments should configure CORS properly

### UI Component Libraries

- **Radix UI**: Headless, accessible component primitives (dialogs, popovers, dropdowns, etc.)
- **Lucide React**: Icon library for consistent iconography
- **date-fns**: Date formatting and manipulation (Italian locale support)

### Development Tools

- **Vite**: Frontend build tool and dev server with HMR
- **TypeScript**: Type safety across frontend, backend, and shared code
- **ESBuild**: Backend bundling for production builds
- **Replit Plugins**: Development banner and cartographer for Replit-specific features