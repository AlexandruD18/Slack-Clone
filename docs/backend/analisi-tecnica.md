# Documento di Analisi Tecnica (DAT)

## Slack-Clone Backend

---

## 📋 Intestazione Documento

| Attributo           | Valore                                |
| ------------------- | ------------------------------------- |
| **Titolo**          | Slack-Clone Backend - Analisi Tecnica |
| **Versione**        | 1.0                                   |
| **Data**            | 19 novembre 2025                      |
| **Autore**          | Team di sviluppo                      |
| **Revisori**        | Da definire                           |
| **Stato**           | Bozza                                 |
| **Confidenzialità** | Interno                               |

---

## 🎯 Scopo e Ambito

### Obiettivo del documento

Questo documento fornisce le **specifiche tecniche dettagliate** per la progettazione, implementazione e deployment del backend di Slack-Clone. Copre:

- ✅ **Architettura del sistema** — Componenti, interazioni, deployment
- ✅ **Scelta tecnologie** — Linguaggi, framework, database
- ✅ **Modelli dati** — Schema database, relazioni
- ✅ **API e protocolli** — REST API, WebSocket, contratti JSON
- ✅ **Implementazione dettagli** — Algoritmi, hashing, replication
- ✅ **Performance tuning** — Ottimizzazioni, benchmarks
- ✅ **Sicurezza** — Authentication, encryption, audit
- ✅ **Deployment e infrastruttura** — Kubernetes, monitoring, scaling

### Ambito

**In scope:**

- Backend system architecture (GS, CS, API Server, PS)
- Database schema design
- REST API contracts
- WebSocket protocol events
- Security measures
- Deployment strategies
- Monitoring & observability

**Out of scope (referenza a DAF):**

- Client UI/UX implementation
- Bot API detailed contracts (Phase 2)
- File storage implementation (Phase 2)

---

## 🏗️ Architettura di Sistema

### High-Level System Design

```
┌─────────────────────────────────────────────────────┐
│ CLIENT LAYER                                         │
│ ├── Web Browser (React/Vue)                        │
│ ├── Mobile (iOS/Android) [Future]                  │
│ └── Bot Client (programmatic)                      │
└────────────┬────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────┐
│ LOAD BALANCER & API GATEWAY LAYER               │
│ ├── Envoy Proxy (Layer 7)                       │
│ ├── TLS Termination (1.3)                       │
│ ├── Request routing                            │
│ └── Rate limiting                              │
└────────────┬────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
  ┌───▼─────┐   ┌──▼────┐
  │ REST    │   │WebSocket│
  │ API     │   │ Gateway│
  │ Server  │   │ Server │
  └────┬────┘   └────┬───┘
       │             │
   ┌───┴─────────────┴────┐
   │ Channel Server (CS)  │ ← Stateful, with sharding
   │ ├── State mgmt      │
   │ ├── Broadcast       │
   │ └── Buffering       │
   └───┬─────────────────┘
       │
  ┌────┴──────────┐
  │ Redis Pub/Sub │ ← Message broker
  │ + Cache       │
  └────┬──────────┘
       │
   ┌───┴─────────────┐
   │ PostgreSQL DB   │ ← Persistence
   │ + Replication   │
   └─────────────────┘
```

### Componenti Principali Dettagliati

#### 1️⃣ Gateway Server (GS)

**Responsabilità:**

- Mantiene connessioni WebSocket con client
- Gestisce upgrade HTTP → WebSocket
- Sottoscrive a Redis topics
- Gestisce heartbeat e keep-alive
- Routing messaggi verso Channel Server
- Session validation via JWT

**Caratteristiche:**

```
Stateless ← Permette scaling orizzontale
├── Sticky sessions via load balancer
├── WebSocket connection pool
├── Message queue per ridondanza
└── Heartbeat ogni 30 secondi
```

**Deployment:**

```
GS Cluster (stateless, replicas)
├── GS Instance #1 (1000 connections)
├── GS Instance #2 (1000 connections)
├── GS Instance #3 (1000 connections)
└── ... (scala fino a 100+ instances)

Load Balancer
├── Sticky session by IP hash
├── Health check /health endpoint
└── Auto-remove unhealthy instances
```

**Tecnologie:**

- **Linguaggio**: Node.js (TypeScript) o Go
- **WebSocket lib**: socket.io (fallback long-polling) o ws (pure)
- **Message queue**: Bull (if needed), Redis Stream
- **Metrics**: Prometheus client

---

#### 2️⃣ API Server

**Responsabilità:**

- Expone REST API endpoints
- Autenticazione JWT
- Persistenza database
- Business logic (channel creation, etc.)
- Authorization (RBAC)

**Moduli principali:**

```
AuthService
├── Register user
├── Login & JWT generation
├── Token refresh
└── OAuth integration

WorkspaceService
├── Create/delete workspace
├── Manage members
└── RBAC assignments

ChannelService
├── Create/delete channel
├── Member management
├── Permissions
└── Topic/description updates

MessageService
├── Send message
├── Edit/delete
├── Retrieve history
└── Search (Phase 2)

PresenceService
├── Update status
├── Last-seen tracking
└── Activity status
```

**API Stack:**

- **Framework**: Express.js (TypeScript) con middleware security
- **Database**: Drizzle ORM con connection pooling
- **Validation**: Zod per schema validation
- **Logging**: Pino structured logger
- **Error handling**: Global error handler, custom exceptions

**Metrics:**

- Response time distribution (p50, p95, p99)
- Request rate per endpoint
- Database query performance
- Error rates

---

#### 3️⃣ Channel Server (CS)

**Responsabilità:**

- Mantenere stato dei canali in memoria
- Persistere messaggi
- Broadcast agli iscritti
- Implementare sharding con consistent hashing
- Gestire buffer messaggi recenti

**In-Memory State:**

```javascript
{
  "channels": {
    "channel-uuid-1": {
      "id": "uuid-1",
      "workspace_id": "workspace-1",
      "members": ["user-1", "user-2", "user-3"],
      "recent_messages": [ // Buffer last 100
        { id: "msg-1", sender: "user-1", body: "...", ts: 123 },
        { id: "msg-2", sender: "user-2", body: "...", ts: 124 }
      ],
      "last_message_id": "msg-2",
      "updated_at": 1234567890
    }
  },
  "subscriptions": {
    "user-1": ["channel-uuid-1", "channel-uuid-2"],
    "user-2": ["channel-uuid-1"]
  }
}
```

**Sharding Strategy (Consistent Hashing):**

```
Hashing Formula: hash(channel_id) % num_servers
├── channel-1 → hash(1) = 45 → 45 % 3 = CS-0
├── channel-2 → hash(2) = 67 → 67 % 3 = CS-2
├── channel-3 → hash(3) = 89 → 89 % 3 = CS-2
├── channel-4 → hash(4) = 23 → 23 % 3 = CS-1
└── channel-5 → hash(5) = 99 → 99 % 3 = CS-0

Distribution across CS instances:
├── CS-0: [channel-1, channel-5]
├── CS-1: [channel-4]
└── CS-2: [channel-2, channel-3]

Benefit: Predictable routing, add/remove CS with rehashing
```

**Event Flow (Pub/Sub):**

```
1. API Server receives message from client
   POST /channels/123/messages { body: "Hello" }

2. API Server persists to DB
   INSERT INTO messages (id, channel_id, sender_id, body, created_at)

3. API Server publishes to Redis Pub/Sub
   PUBLISH "channel:123" { id, sender, body, created_at }

4. All CS instances subscribed to "channel:*"
   CS-0, CS-1, CS-2 all receive event

5. Owning CS (determined by consistent hash) processes
   CS-2 (responsible for channel-123) updates in-memory buffer
   recent_messages.push(new_message)

6. CS publishes to WebSocket subscribers
   All GS instances with users in channel-123 receive from Redis

7. GS instances push to connected clients
   User-1 WS → "message:new" event
   User-2 WS → "message:new" event
   User-3 WS → "message:new" event

8. Client UI updates message list
   Total latency: < 200ms
```

**Buffer Management:**

```
Buffer size: 100 messages per channel
Eviction policy: LRU (remove oldest when > 100)
Persistance: All messages in database
Use case: Fast recovery on reconnect without DB query
```

---

#### 4️⃣ Presence Server (PS)

**Responsabilità:**

- Tracciamento online/offline utenti
- Cache stato in Redis
- Notifica cambi stato
- Activity tracking

**Presence State (Redis Hash):**

```
HSET workspace:1:presence user:1 { "status": "online", "last_seen": 1234567890, "activity": "active" }
HSET workspace:1:presence user:2 { "status": "idle", "last_seen": 1234567800, "activity": "idle" }
HSET workspace:1:presence user:3 { "status": "offline", "last_seen": 1234567600, "activity": "none" }
```

**State Transitions:**

```
┌─────────┐
│ Offline │
└────┬────┘
     │ User connects WS
     ↓
┌──────────────┐
│ Online       │
│ (connected)  │
└────┬────────┘
     │
     ├─ Last activity > 5 min → mark "idle"
     │
     │ User disconnects WS
     ↓
┌──────────────────┐
│ Reconnecting     │
│ (grace period)   │ ← 30 second timeout
└────┬─────────────┘
     │ Timeout expired
     ↓
┌─────────┐
│ Offline │
└─────────┘
```

**Activity Levels:**

```
active:       User actively interacting (mouse/keyboard)
idle:         No activity for 5+ minutes
away:         User marked "away" explicitly
dnd:          Do Not Disturb (user set)
offline:      Disconnected or grace period expired
```

**Broadcast on Status Change:**

```
User-1 connects
  → PS updates Redis
  → Pub/Sub publish "presence:update" { user_id: 1, status: "online" }
  → All GS receive event
  → Broadcast to workspace members
  → All users see "User-1 is now online"
```

---

### Service Discovery & Load Balancing

**Service Discovery (Consul/Kubernetes DNS):**

```
GS Services:
  gs-1.slack-clone.default.svc.cluster.local:3000
  gs-2.slack-clone.default.svc.cluster.local:3000
  gs-3.slack-clone.default.svc.cluster.local:3000

CS Services:
  cs-0.slack-clone.default.svc.cluster.local:3001
  cs-1.slack-clone.default.svc.cluster.local:3001
  cs-2.slack-clone.default.svc.cluster.local:3001
```

**Load Balancer (Envoy):**

```yaml
frontends:
  - name: http_api
    bind: 0.0.0.0:80
    backend: api_backend

  - name: websocket
    bind: 0.0.0.0:443
    backend: ws_backend
    mode: websocket
    options:
      - sticky_sessions: true # For GS affinity
      - persistence: ip # Hash by client IP

backends:
  api_backend:
    servers: [api-1, api-2, api-3]
    balance: roundrobin

  ws_backend:
    servers: [gs-1, gs-2, gs-3]
    balance: leastconn
    stickiness: ip_hash
```

---

## 🗄️ Database Schema

### Schema Principale

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- Argon2
  full_name VARCHAR(255),
  avatar_url VARCHAR(512),
  status VARCHAR(50) DEFAULT 'offline', -- online, idle, away, offline, dnd
  last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_last_seen (last_seen)
);
```

#### Workspaces Table

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id),
  plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  max_members INTEGER DEFAULT 10000,
  settings JSONB, -- public_registration, email_domain_restriction, etc.
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,

  -- Indexes
  INDEX idx_owner_id (owner_id),
  INDEX idx_slug (slug)
);
```

#### Workspace Members Table

```sql
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, viewer
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Composite unique
  UNIQUE(workspace_id, user_id),

  -- Indexes
  INDEX idx_workspace_id (workspace_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role (role)
);
```

#### Channels Table

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'public', -- public, private, direct
  description TEXT,
  topic TEXT,
  topic_set_by UUID REFERENCES users(id),
  topic_set_at TIMESTAMPTZ,
  creator_id UUID NOT NULL REFERENCES users(id),
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,

  -- Composite unique (per workspace)
  UNIQUE(workspace_id, name),

  -- Indexes
  INDEX idx_workspace_id (workspace_id),
  INDEX idx_type (type),
  INDEX idx_is_archived (is_archived),
  INDEX idx_created_at (created_at)
);
```

#### Channel Members Table

```sql
CREATE TABLE channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member', -- owner, member, viewer
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Composite unique
  UNIQUE(channel_id, user_id),

  -- Indexes
  INDEX idx_channel_id (channel_id),
  INDEX idx_user_id (user_id)
);
```

#### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  channel_id UUID REFERENCES channels(id), -- NULL for DMs
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  metadata JSONB, -- mentions, thread_id, etc.
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ,
  edited_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),

  -- Indexes (performance critical!)
  INDEX idx_channel_id (channel_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_created_at (created_at),
  INDEX idx_workspace_id (workspace_id),
  COMPOUND INDEX idx_channel_created (channel_id, created_at DESC),

  -- Partitioning by date for large tables
  PARTITION BY RANGE (DATE_TRUNC('month', created_at))
);
```

#### Direct Messages Table

```sql
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_a_id UUID NOT NULL REFERENCES users(id),
  user_b_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Composite unique (DM between two users is unique)
  UNIQUE(workspace_id, LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id)),

  -- Indexes
  INDEX idx_workspace_id (workspace_id),
  INDEX idx_user_a (user_a_id),
  INDEX idx_user_b (user_b_id)
);
```

#### Reactions Table (Phase 2)

```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Composite unique
  UNIQUE(message_id, user_id, emoji),

  -- Index
  INDEX idx_message_id (message_id)
);
```

### Data Integrity Constraints

```sql
-- Prevent self-mentions in DMs
ALTER TABLE direct_messages
  ADD CONSTRAINT prevent_self_dm
  CHECK (user_a_id != user_b_id);

-- Prevent deleted users from sending messages
ALTER TABLE messages
  ADD CONSTRAINT sender_not_deleted
  CHECK (sender_id NOT IN (SELECT id FROM users WHERE deleted_at IS NOT NULL));

-- Ensure channel creator is member
ALTER TABLE channels
  ADD CONSTRAINT creator_is_member
  FOREIGN KEY (creator_id, id) REFERENCES channel_members(user_id, channel_id);
```

### Indexing Strategy

```sql
-- Query optimization
-- Most frequent: Get messages for channel with pagination
EXPLAIN ANALYZE
  SELECT * FROM messages
  WHERE channel_id = $1
  ORDER BY created_at DESC
  LIMIT 50;

-- Index: (channel_id, created_at DESC) ✓

-- User lookup
EXPLAIN ANALYZE
  SELECT * FROM users WHERE email = $1;
-- Index: (email) ✓

-- Workspace member check
EXPLAIN ANALYZE
  SELECT * FROM workspace_members
  WHERE workspace_id = $1 AND user_id = $2;
-- Index: (workspace_id, user_id) ✓
```

---

## 📡 API REST Specification

### Authentication & Authorization

#### Request Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Request-ID: uuid (optional, for tracing)
```

#### Response Structure

```json
{
  "success": true,
  "data": {
    /* response payload */
  },
  "error": null,
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "reason": "Must be valid email"
    }
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
```

### Auth Endpoints

#### POST /api/auth/register

```yaml
Request:
  Body:
    - email: string (required, valid email)
    - password: string (required, ≥8 chars, mix)
    - full_name: string (optional)

Response (201):
  - user_id: uuid
  - email: string
  - status: "verification_pending"
  - verification_token: string (in email)

Errors:
  - 400: Invalid email format
  - 409: Email already registered
  - 429: Too many attempts
```

#### POST /api/auth/login

```yaml
Request:
  Body:
    - email: string
    - password: string

Response (200):
  - access_token: string (JWT, TTL 1h)
  - refresh_token: string (HttpOnly cookie, TTL 7d)
  - user:
      - id: uuid
      - email: string
      - full_name: string

Errors:
  - 400: Missing credentials
  - 401: Invalid credentials
  - 429: Too many failed attempts (rate limit)
  - 403: Email not verified
```

#### POST /api/auth/refresh

```yaml
Request:
  Headers:
    - Cookie: refresh_token=...

Response (200):
  - access_token: string (new JWT)
  - expires_in: 3600 (seconds)

Errors:
  - 401: Invalid or expired refresh token
```

#### POST /api/auth/logout

```yaml
Request:
  Headers:
    - Authorization: Bearer ...

Response (200):
  - message: "Logged out successfully"

Side effects:
  - Blacklist JWT
  - Clear refresh token cookie
  - Revoke all WS connections
```

### Workspace Endpoints

#### POST /api/workspaces

```yaml
Request:
  Auth: Required (JWT)
  Body:
    - name: string (required, 1-255 chars)
    - slug: string (required, unique, lowercase)

Response (201):
  - id: uuid
  - name: string
  - slug: string
  - owner_id: uuid
  - created_at: timestamp

Errors:
  - 400: Invalid input
  - 409: Slug already taken
  - 401: Unauthorized
```

#### GET /api/workspaces

```yaml
Request:
  Auth: Required

Response (200):
  - workspaces: [{ id, name, slug, owner_id }, ...]
  - count: number

Errors:
  - 401: Unauthorized
```

#### GET /api/workspaces/:workspace_id/members

```yaml
Request:
  Auth: Required
  Params:
    - workspace_id: uuid

Response (200):
  - members: [{ user_id, email, full_name, role, joined_at }, ...]

Errors:
  - 404: Workspace not found
  - 403: Not a member
```

### Channel Endpoints

#### POST /api/channels

```yaml
Request:
  Auth: Required
  Body:
    - workspace_id: uuid
    - name: string (1-255, lowercase, unique per workspace)
    - type: "public"|"private"
    - description: string (optional)

Response (201):
  - id: uuid
  - name: string
  - type: string
  - created_at: timestamp
  - created_by: uuid

Errors:
  - 400: Invalid input
  - 404: Workspace not found
  - 409: Channel name taken
```

#### GET /api/channels/:channel_id/messages

```yaml
Request:
  Auth: Required
  Params:
    - channel_id: uuid
  Query:
    - limit: number (default 50, max 100)
    - offset: number (default 0)
    - from_id: uuid (optional, cursor-based pagination)

Response (200):
  - messages:
      [
        {
          id: uuid,
          sender: { id, email, full_name },
          body: string,
          created_at: timestamp,
          updated_at: timestamp|null,
          reactions: { "👍": ["user1", "user2"] },
        },
        ...,
      ]
  - total: number
  - has_more: boolean

Errors:
  - 404: Channel not found
  - 403: No access
```

#### POST /api/channels/:channel_id/messages

```yaml
Request:
  Auth: Required
  Body:
    - body: string (required, 1-4000 chars)
    - idempotency_key: uuid (optional, for deduplication)

Response (201):
  - id: uuid
  - sender_id: uuid
  - body: string
  - created_at: timestamp

Errors:
  - 400: Empty message
  - 404: Channel not found
  - 403: No permission to post
  - 429: Rate limited
```

#### PUT /api/channels/:channel_id/messages/:message_id

```yaml
Request:
  Auth: Required
  Body:
    - body: string

Response (200):
  - id: uuid
  - body: string
  - updated_at: timestamp
  - edited_by: uuid

Errors:
  - 404: Message not found
  - 403: Not the author
  - 410: Message deleted
```

#### DELETE /api/channels/:channel_id/messages/:message_id

```yaml
Request:
  Auth: Required

Response (204):
  - (no body)

Errors:
  - 404: Message not found
  - 403: Not the author
```

---

## 🔌 WebSocket Protocol

### Connection Handshake

```javascript
// Client
const ws = new WebSocket("wss://api.slack-clone.io/ws");

ws.onopen = () => {
  // Send auth handshake
  ws.send(JSON.stringify({
    type: "auth",
    payload: {
      token: "eyJhbGc...",
      workspace_id: "uuid",
      device: "browser"
    }
  }));
};

// Server responds
{
  "type": "auth:success",
  "payload": {
    "user_id": "uuid",
    "workspace_id": "uuid",
    "session_id": "uuid"
  }
}
```

### Event Types

#### Message Events

```javascript
// Incoming: New message broadcast
{
  "type": "message:new",
  "payload": {
    "id": "uuid",
    "channel_id": "uuid",
    "sender": { "id": "uuid", "email": "..." },
    "body": "Hello!",
    "created_at": "2025-11-19T10:30:00.000Z"
  }
}

// Incoming: Message edited
{
  "type": "message:updated",
  "payload": {
    "id": "uuid",
    "body": "Hello (edited)",
    "updated_at": "2025-11-19T10:31:00.000Z"
  }
}

// Incoming: Message deleted
{
  "type": "message:deleted",
  "payload": {
    "id": "uuid",
    "channel_id": "uuid"
  }
}
```

#### Presence Events

```javascript
// Incoming: User came online
{
  "type": "presence:changed",
  "payload": {
    "user_id": "uuid",
    "status": "online",
    "activity": "active",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}

// Incoming: User went offline
{
  "type": "presence:changed",
  "payload": {
    "user_id": "uuid",
    "status": "offline",
    "last_seen": "2025-11-19T10:35:00.000Z",
    "timestamp": "2025-11-19T10:35:30.000Z"
  }
}

// Incoming: User is typing
{
  "type": "typing:started",
  "payload": {
    "user_id": "uuid",
    "channel_id": "uuid",
    "user_name": "John"
  }
}

// Incoming: User stopped typing
{
  "type": "typing:stopped",
  "payload": {
    "user_id": "uuid",
    "channel_id": "uuid"
  }
}
```

#### Channel Events

```javascript
// Incoming: Member joined
{
  "type": "channel:member:joined",
  "payload": {
    "channel_id": "uuid",
    "user_id": "uuid",
    "user_name": "John",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}

// Incoming: Member left
{
  "type": "channel:member:left",
  "payload": {
    "channel_id": "uuid",
    "user_id": "uuid",
    "timestamp": "2025-11-19T10:35:00.000Z"
  }
}

// Incoming: Channel updated
{
  "type": "channel:updated",
  "payload": {
    "channel_id": "uuid",
    "name": "new-name",
    "topic": "new topic",
    "updated_at": "2025-11-19T10:30:00.000Z"
  }
}
```

#### Outgoing Client Events

```javascript
// Client sends message
{
  "type": "message:send",
  "payload": {
    "channel_id": "uuid",
    "body": "Hello team!",
    "idempotency_key": "uuid"
  }
}

// Client indicates typing
{
  "type": "typing:start",
  "payload": {
    "channel_id": "uuid"
  }
}

// Client indicates stopped typing
{
  "type": "typing:stop",
  "payload": {
    "channel_id": "uuid"
  }
}

// Client joins channel
{
  "type": "channel:join",
  "payload": {
    "channel_id": "uuid"
  }
}

// Client leaves channel
{
  "type": "channel:leave",
  "payload": {
    "channel_id": "uuid"
  }
}

// Heartbeat
{
  "type": "ping"
}

// Server responds to ping
{
  "type": "pong"
}
```

---

## 🔐 Sicurezza

### Authentication Flow

```
┌─────────────────────────────────────┐
│ 1. Client invia credenziali         │
│    POST /auth/login                 │
│    { email, password }              │
└────────────┬────────────────────────┘
             │
      ┌──────▼──────┐
      │ Validation  │
      │ ├─ Email ok │
      │ ├─ Exists   │
      │ └─ Verify   │
      └──────┬──────┘
             │
   ┌─────────▼─────────┐
   │ Hash password      │
   │ Argon2id(pass)    │
   │ Compare with DB   │
   └─────────┬─────────┘
             │
    ┌────────▼────────┐
    │ Match? ✓        │
    └────────┬────────┘
             │
    ┌────────▼─────────────────┐
    │ Generate JWT              │
    │ {                         │
    │   sub: user_id,           │
    │   iat: now,               │
    │   exp: now + 3600,        │
    │   workspace_id            │
    │ }                         │
    │ Sign with HS256           │
    └────────┬─────────────────┘
             │
    ┌────────▼─────────────────┐
    │ Return tokens             │
    │ access_token: JWT         │
    │ refresh_token: (httponly) │
    └─────────────────────────┘
```

### Token Validation

```javascript
// On every request
const validateToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "slack-clone",
      audience: "api",
    });

    // Check if blacklisted (revoked)
    if (isBlacklisted(decoded.jti)) {
      throw new Error("Token revoked");
    }

    return decoded;
  } catch (err) {
    return null;
  }
};
```

### Password Hashing

```javascript
const argon2 = require("argon2");

const hashPassword = async (password: string) => {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3, // 3 iterations
    parallelism: 1,
    raw: false,
  });
};

const verifyPassword = async (password: string, hash: string) => {
  return await argon2.verify(hash, password);
};
```

### RBAC Implementation

```javascript
// Role-based access control
const ROLE_PERMISSIONS = {
  owner: [
    "channel:create",
    "channel:delete",
    "channel:update",
    "message:send",
    "message:edit",
    "message:delete",
    "member:invite",
    "member:remove",
    "member:promote",
  ],
  admin: [
    "channel:create",
    "channel:update",
    "message:send",
    "message:edit",
    "message:delete",
    "member:invite",
  ],
  member: [
    "channel:view",
    "message:send",
    "message:edit:own",
    "message:delete:own",
  ],
  viewer: ["channel:view", "message:view"],
};

// Middleware check
const authorize = (requiredPermission: string) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (!ROLE_PERMISSIONS[userRole].includes(requiredPermission)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};
```

### Transport Security

```
TLS 1.3 mandatory
├── Certificate from trusted CA
├── HSTS header (Strict-Transport-Security)
├── Perfect Forward Secrecy (PFS)
└── Cipher suites modern (ECDHE + AEAD)

Headers:
├── Strict-Transport-Security: max-age=31536000
├── X-Content-Type-Options: nosniff
├── X-Frame-Options: DENY
├── Content-Security-Policy: default-src 'self'
└── X-XSS-Protection: 1; mode=block
```

### Input Validation

```javascript
// Schema validation with Zod
const messageSchema = z.object({
  body: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message too long")
    .transform((s) => s.trim()),
  channel_id: z.string().uuid("Invalid channel ID"),
  idempotency_key: z.string().uuid().optional(),
});

// Rate limiting
const rateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests
  message: "Too many requests",
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## 📈 Performance & Optimization

### Caching Strategy

```
┌─────────────────────────────────────┐
│ CACHING LAYERS                      │
├─────────────────────────────────────┤
│ L1: Browser cache (HTTP caching)    │
│ L2: CDN cache (static assets)       │
│ L3: Redis cache (session, presence) │
│ L4: Database query cache (DB)       │
│ L5: Database (source of truth)      │
└─────────────────────────────────────┘
```

#### Redis Caching

```javascript
// Cache user presence
const cachePresence = async (workspaceId, userId, status) => {
  const key = `presence:${workspaceId}:${userId}`;
  await redis.hset(
    `presence:${workspaceId}`,
    userId,
    JSON.stringify({ status, last_seen: Date.now() }),
    "EX", // Expire in
    86400 // 24 hours
  );
};

// Get all presence in workspace
const getPresence = async (workspaceId) => {
  const data = await redis.hgetall(`presence:${workspaceId}`);
  return Object.entries(data).map(([userId, json]) => ({
    userId,
    ...JSON.parse(json),
  }));
};
```

### Database Query Optimization

```sql
-- BEFORE (slow, N+1 query)
SELECT * FROM messages WHERE channel_id = $1;
-- Then for each message: SELECT * FROM users WHERE id = sender_id;

-- AFTER (optimized with JOIN)
SELECT m.*, u.id, u.email, u.full_name
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.channel_id = $1
ORDER BY m.created_at DESC
LIMIT 50;

-- With index: (channel_id, created_at DESC)
```

### Connection Pooling

```javascript
// PostgreSQL connection pool
const pool = new Pool({
  host: "db-primary.internal",
  port: 5432,
  database: "slack_clone",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000, // Query timeout
});
```

### WebSocket Optimization

```javascript
// Binary protocol (instead of JSON for lower bandwidth)
// Use compression (permessage-deflate)
// Limit message size (4KB max)
// Batch small updates
// Use connection pooling

const ws = require("ws");

const wss = new ws.Server({
  perMessageDeflate: {
    zlevel: 6, // Compression level
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
  },
  maxPayload: 4096,
  maxBackpressure: 1024 * 1024,
});
```

---

## 📊 Monitoring & Observability

### Metrics Collection

```
┌──────────────────────────────────┐
│ PROMETHEUS METRICS               │
├──────────────────────────────────┤
│ HTTP Requests                    │
│  ├─ request_duration_seconds     │
│  ├─ request_total                │
│  └─ request_errors_total         │
│                                  │
│ WebSocket                        │
│  ├─ ws_connections_active        │
│  ├─ ws_messages_sent_total       │
│  └─ ws_latency_seconds           │
│                                  │
│ Database                         │
│  ├─ db_query_duration_seconds    │
│  ├─ db_connections_active        │
│  └─ db_errors_total              │
│                                  │
│ Business                         │
│  ├─ messages_sent_total          │
│  └─ users_online_gauge           │
└──────────────────────────────────┘
```

### Alerting Rules

```yaml
groups:
  - name: slack-clone
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.2
        for: 10m
        annotations:
          summary: "API latency above 200ms"

      - alert: WebSocketConnectionDrop
        expr: rate(ws_connections_closed_total[5m]) > 100
        for: 5m
        annotations:
          summary: "Unusually high WS disconnect rate"
```

### Distributed Tracing

```
Request arrives at API Gateway
  │
  └─ Span: API.request
     │
     ├─ Span: auth.validate_token (10ms)
     │
     ├─ Span: db.query (45ms)
     │  ├─ Span: db.connection.acquire (2ms)
     │  ├─ Span: db.statement.execute (40ms)
     │  └─ Span: db.connection.release (1ms)
     │
     ├─ Span: redis.publish (5ms)
     │
     └─ Response sent (60ms total)

Visualized in Jaeger:
  ┌──────────────────────────────────┐
  │ POST /api/channels/:id/messages  │
  │ ├─ validate_token ▓░░░░░░░░░░░░  │
  │ ├─ db.query       ▓▓▓▓▓▓░░░░░░░░ │
  │ ├─ redis.publish  ▓░░░░░░░░░░░░░ │
  │ └─ response       ▓▓▓▓▓▓▓░░░░░░░ │
  │   0ms    50ms   100ms  150ms 200ms │
  └──────────────────────────────────┘
```

---

## 🚀 Deployment Architecture

### Kubernetes Manifests

#### Deployment: API Server

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: slack-clone
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api
          image: slack-clone/api:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: url
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

#### Service & Ingress

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server-svc
spec:
  selector:
    app: api-server
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: slack-clone-ingress
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.slack-clone.io
      secretName: tls-cert
  rules:
    - host: api.slack-clone.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server-svc
                port:
                  number: 80
```

---

## 🔄 Replica & Disaster Recovery

### Database Replication

```
Primary (Write)
  ├─ WAL (Write-Ahead Log)
  │
  └─ Streaming Replication
     │
     ├─ Replica 1 (Standby) ← Synchronous
     └─ Replica 2 (Standby) ← Asynchronous

RPO (Recovery Point Objective): < 1 minute
RTO (Recovery Time Objective): < 5 minutes (failover to replica)
```

### Backup Strategy

```
Daily automated backup
├─ Full backup (once per week)
├─ Incremental (daily)
└─ Point-in-time recovery (PITR)
   ├─ 30 days retention
   └─ Test restoration weekly
```

---

**Documento:** Slack-Clone Backend - Analisi Tecnica  
**Versione:** 1.0  
**Status:** 🟡 **Bozza - In Review**  
**Ultimo update:** 19 novembre 2025
