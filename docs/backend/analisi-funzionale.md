# Documento di Analisi Funzionale (DAF)

## Slack-Clone Backend

---

## 📋 Intestazione documento

| Attributo           | Valore                                   |
| ------------------- | ---------------------------------------- |
| **Titolo**          | Slack-Clone Backend - Analisi Funzionale |
| **Versione**        | 1.0                                      |
| **Data**            | 19 novembre 2025                         |
| **Autore**          | Team di sviluppo                         |
| **Revisori**        | Da definire                              |
| **Stato**           | Bozza                                    |
| **Classificazione** | Interno                                  |

---

## 🎯 Scopo e Ambito

### Obiettivo del documento

Questo documento definisce in dettaglio **i requisiti funzionali** e **non funzionali** del backend di un'applicazione di messaggistica in tempo reale simile a Slack. Fornisce una mappatura completa:

- ✅ Cosa il sistema deve fare (requisiti funzionali)
- ✅ Come il sistema deve comportarsi (requisiti non-funzionali)
- ✅ Chi sono gli attori principali (personas)
- ✅ Quali sono i casi d'uso critico (use cases)
- ✅ Quali vincoli e dipendenze esistono
- ✅ Quali rischi affrontare e come mitigarli
- ✅ Qual è la roadmap di implementazione

### Ambito incluso

**In scope per la fase 1 (MVP):**

```
├── Workspace isolation
├── Public & private channels
├── Direct messages (1-to-1)
├── Message persistence (database)
├── Real-time broadcast (WebSocket)
├── User presence tracking
├── Basic authentication (JWT)
├── Message history retrieval
├── Reconnection handling
└── Basic API REST
```

**Out of scope (future fasi):**

```
├── Bot integrations [Phase 2]
├── File/media upload [Phase 2]
├── Video calls/screen share [Phase 3]
├── End-to-end encryption [Phase 3+]
├── Push notifications mobile [Phase 2]
├── Threads/nested conversations [Phase 2]
├── Advanced search/filtering [Phase 2]
├── Analytics dashboard [Phase 2]
└── 3rd party integrations [Phase 2+]
```

### Glossario tecnico

| Termine                 | Definizione                                                     | Contesto                        |
| ----------------------- | --------------------------------------------------------------- | ------------------------------- |
| **Workspace**           | Spazio di lavoro isolato, con propri canali, utenti, messaggi   | Organizzazione logica top-level |
| **Canale**              | Chat di gruppo all'interno di workspace (pubblico/privato)      | Organizzazione conversazioni    |
| **Direct Message (DM)** | Conversazione privata 1-a-1 tra due utenti                      | Chat personale                  |
| **WebSocket (WS)**      | Connessione persistente bidirezionale client ↔ server           | Real-time communication         |
| **Gateway Server (GS)** | Server che mantiene connessioni WebSocket con client            | Frontend del sistema real-time  |
| **Channel Server (CS)** | Server stateful che gestisce stato canali, buffer, broadcast    | Backend real-time processing    |
| **Pub/Sub**             | Pattern publish-subscribe per distribuzione messaggi tra server | Scalabilità orizzontale         |
| **Presence**            | Stato online/offline utente, visualizzato in tempo reale        | User awareness                  |
| **JWT**                 | JSON Web Token, token di autenticazione firmato                 | Sessione user                   |
| **Sharding**            | Distribuzione dati (canali/workspace) su più istanze            | Scalabilità dati                |

---

## 🔍 Contesto e Problematiche

### Contesto attuale

Attualmente, le piattaforme di chat enterprise richiedono:

1. **Comunicazione in tempo reale** — messaggi devono arrivare entro millisecondi
2. **Affidabilità totale** — zero perdite di messaggi
3. **Scalabilità massima** — supporto migliaia di utenti contemporanei
4. **Persistenza completa** — cronologia messaggi indefinita
5. **Presence awareness** — chi è online, chi è offline
6. **Multi-tenancy** — isolamento dati tra workspace

Nessuno dei sistemi attuali semplici fornisce tutte queste capacità in un'architettura coerente.

### Problematiche critiche da risolvere

#### 1️⃣ Real-time Inefficiente

**Problema:** I messaggi potrebbero non arrivare istantaneamente ai destinatari

- Mancanza di WebSocket persistente
- Polling inefficiente (latenza alta)
- Architettura non distribuita per broadcast

**Impatto:** Esperienza utente scadente, ridotta engagement

**Soluzione:** WebSocket + Pub/Sub per broadcast distribuito

---

#### 2️⃣ Persistenza Debole o Assente

**Problema:** Le conversazioni possono andare perse in caso di crash server

- Nessuna persistenza su database
- Nessuna replica/backup
- Recovery impossibile

**Impatto:** Perdita dati, trust ridotto su piattaforma

**Soluzione:** Persistenza atomica on immediate ogni messaggio + replication

---

#### 3️⃣ Scalabilità Limitata

**Problema:** Un singolo server non può gestire connessioni WebSocket e load database

- Bottleneck su numero connessioni simultanee
- Database non dimensionato per alto throughput
- Architettura monolitica non scalabile

**Impatto:** Impossibile supportare crescita organica utenti

**Soluzione:** Sharding, stateless GS, CS distribuito, multi-DB replica

---

#### 4️⃣ Assenza di Gestione Presenza

**Problema:** Impossibile visualizzare chi è online/offline

- Nessun tracking di stato utente
- Nessuna notifica di cambio stato
- Nessun last-seen

**Impatto:** Esperienza utente incompleta, user confusion

**Soluzione:** Presence Server dedicato + real-time state updates

---

#### 5️⃣ Multi-Workspace Complexity

**Problema:** Difficile gestire isolamento dati tra organizzazioni diverse

- Rischi di security breach (data leaking)
- Permessi e autorizzazione complessa
- Scalabilità ridotta

**Impatto:** Enterprise non adotta piattaforma per compliance

**Soluzione:** RBAC rigoroso + sharding per workspace + audit logging

---

## ✅ Requisiti Funzionali Dettagliati

### RF-01: Autenticazione e Autorizzazione

```
┌──────────────────────────────────────────────┐
│ AUTENTICAZIONE E AUTORIZZAZIONE              │
│                                              │
│ L'utente deve potersi autenticare in modo   │
│ sicuro, ottenere una sessione valida, e     │
│ accedere solo a risorse autorizzate.        │
└──────────────────────────────────────────────┘
```

| ID      | Funzionalità         | Descrizione                     | Priorità  | AC (Acceptance Criteria)                                                           |
| ------- | -------------------- | ------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| RF-01.1 | Registrazione utente | Nuovo utente con email/password | **Alta**  | ✓ Email validato, ✓ Password >= 8 char, ✓ Hashing Argon2, ✓ Duplicate email check  |
| RF-01.2 | Login                | Autenticazione con credenziali  | **Alta**  | ✓ JWT generato, ✓ TTL 1h, ✓ Rate limit 5 tentativi/min, ✓ Password attempt logging |
| RF-01.3 | Logout               | Invalidazione sessione          | **Alta**  | ✓ Token blacklisted, ✓ Session cleared, ✓ Audit log                                |
| RF-01.4 | Refresh token        | Rinnovo sessione lunga          | **Alta**  | ✓ TTL 7 giorni, ✓ Rotate on refresh, ✓ HttpOnly cookie                             |
| RF-01.5 | OAuth                | Google/GitHub optional          | **Media** | ✓ OpenID Connect flow, ✓ Email auto-verified, ✓ Link to existing account           |
| RF-01.6 | Password reset       | Reset via email                 | **Media** | ✓ Token scadenza 1h, ✓ Secure link, ✓ Email confirmation                           |
| RF-01.7 | RBAC workspace       | Ruoli (owner, member, viewer)   | **Alta**  | ✓ Owner full permissions, ✓ Member messaggi/canali, ✓ Viewer read-only             |
| RF-01.8 | RBAC canale          | Permessi per canale             | **Alta**  | ✓ Private whitelist, ✓ Public auto-join, ✓ Owner can remove                        |
| RF-01.9 | Audit logging        | Log accessi sensibili           | **Media** | ✓ Timestamp, ✓ User, ✓ Action, ✓ IP, ✓ Outcome (success/fail)                      |

**Workflow Registrazione:**

```
User
  ↓ POST /auth/register {email, password, name}
  ↓ Validation (email format, password strength)
  ↓ Check duplicate email
  ↓ Hash password (Argon2)
  ↓ Create user record
  ↓ Send verification email
  ↓ Response: {userId, status: "verification_pending"}
  ↓ User clicks email link
  ↓ Email verified
  ↓ User can now login
```

---

### RF-02: Workspace e Canali

```
┌──────────────────────────────────────────────┐
│ WORKSPACE & CHANNELS MANAGEMENT              │
│                                              │
│ Admins possono creare workspace, invitare   │
│ utenti, creare canali pubblici/privati,     │
│ e gestire permessi su canali.               │
└──────────────────────────────────────────────┘
```

| ID      | Funzionalità        | Descrizione                   | Priorità  | AC                                                                                |
| ------- | ------------------- | ----------------------------- | --------- | --------------------------------------------------------------------------------- |
| RF-02.1 | Creazione workspace | Nuovo workspace isolato       | **Alta**  | ✓ Creator = owner, ✓ Unique name/workspace, ✓ Default #general channel            |
| RF-02.2 | Invita utenti       | Aggiungi utenti a workspace   | **Alta**  | ✓ Email invite, ✓ Token expiry 7 giorni, ✓ Role assignment, ✓ Notify user         |
| RF-02.3 | Rimuovi utenti      | Kick utente da workspace      | **Alta**  | ✓ Owner only, ✓ Revoke all tokens, ✓ Archive DMs, ✓ Audit log                     |
| RF-02.4 | Crea canale         | Nuovo canale (pub/priv)       | **Alta**  | ✓ Unique name per workspace, ✓ Creator = channel owner, ✓ Default #general public |
| RF-02.5 | Modifica canale     | Edit nome, descrizione, topic | **Media** | ✓ Owner only, ✓ Notify members, ✓ Audit log                                       |
| RF-02.6 | Archivio canale     | Soft delete, keep history     | **Media** | ✓ Owner only, ✓ Retain messages, ✓ Prevent messages, ✓ Mark archived              |
| RF-02.7 | Join canale         | Unisciti a canale pubblico    | **Alta**  | ✓ Auto-subscribe, ✓ Download recent history, ✓ Notify channel                     |
| RF-02.8 | Leave canale        | Esci da canale                | **Alta**  | ✓ Unsubscribe WS, ✓ Retain chat history, ✓ Notify channel                         |
| RF-02.9 | Notifiche canale    | Mute/unmute notifiche         | **Media** | ✓ Per-channel mute, ✓ Keyword mention alerts, ✓ Settings persisted                |

**Data Model Workspace:**

```json
{
  "workspace": {
    "id": "uuid",
    "name": "ACME Corp",
    "slug": "acme",
    "owner_id": "uuid",
    "created_at": "2025-11-19T10:00:00Z",
    "settings": {
      "public_registration": false,
      "allow_external_sharing": true,
      "email_domain_restriction": "@acme.com"
    },
    "plan": "enterprise",
    "max_members": 10000
  },
  "channel": {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "general",
    "type": "public|private",
    "topic": "General discussions",
    "created_at": "2025-11-19T10:00:00Z",
    "creator_id": "uuid",
    "is_archived": false,
    "members_count": 45
  }
}
```

---

### RF-03: Invio Messaggi

```
┌──────────────────────────────────────────────┐
│ MESSAGE SENDING                              │
│                                              │
│ Utenti possono inviare messaggi nei canali  │
│ o chat private, con validazione e           │
│ timestamp monotonic.                         │
└──────────────────────────────────────────────┘
```

| ID      | Funzionalità       | Descrizione                    | Priorità         | AC                                                                                                |
| ------- | ------------------ | ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------- |
| RF-03.1 | Invia in canale    | Messagio a tutto il canale     | **Alta**         | ✓ Max 4000 char, ✓ Timestamp monotonic, ✓ Sender auth, ✓ Rate limit 100/min                       |
| RF-03.2 | Invia DM           | Messaggio privato 1-a-1        | **Alta**         | ✓ Auto-create DM group, ✓ Both must be members workspace, ✓ No spam to non-members                |
| RF-03.3 | Modifica messaggio | Edit con timestamp updated_at  | **Media**        | ✓ Owner only, ✓ Keep edit history, ✓ Notify subscribers, ✓ Mark as edited                         |
| RF-03.4 | Elimina messaggio  | Soft delete, traccia audit     | **Media**        | ✓ Owner or channel admin, ✓ Keep audit record, ✓ Show "[deleted]" to others, ✓ Remove from search |
| RF-03.5 | Menzione utente    | @user notification             | **Media**        | ✓ Trigger presence notification, ✓ User highlight, ✓ Desktop notification if settings             |
| RF-03.6 | Menzione canale    | @channel notification          | **Media**        | ✓ Notify all active members, ✓ Rate limit (1 per hour), ✓ Permission check                        |
| RF-03.7 | Reply (thread)     | Risposta a messaggio specifico | **Bassa/Phase2** | ✓ Thread ID link, ✓ Separate thread view, ✓ Notify message author                                 |
| RF-03.8 | Reazione emoji     | Aggiungi emoji a messaggio     | **Bassa/Phase2** | ✓ Multiple reactions per message, ✓ Multiple users per emoji, ✓ Persist in DB                     |

**Message Schema:**

```json
{
  "message": {
    "id": "uuid",
    "channel_id": "uuid|null (for DM)",
    "sender_id": "uuid",
    "body": "Hello team! 👋",
    "created_at": "2025-11-19T10:05:30.123Z",
    "updated_at": null,
    "deleted_at": null,
    "mentions": ["@john", "@team"],
    "thread_id": "uuid|null",
    "reactions": {
      "👍": ["user1", "user2"],
      "❤️": ["user3"]
    },
    "attachments": []
  }
}
```

---

### RF-04: Real-Time Broadcasting

```
┌──────────────────────────────────────────────┐
│ REAL-TIME EVENT BROADCAST                    │
│                                              │
│ Nuovi messaggi vengono notificati a tutti   │
│ i client del canale in < 200ms via          │
│ WebSocket Pub/Sub architecture.              │
└──────────────────────────────────────────────┘
```

| ID      | Funzionalità        | Descrizione                       | Priorità  | AC                                                                            |
| ------- | ------------------- | --------------------------------- | --------- | ----------------------------------------------------------------------------- |
| RF-04.1 | Broadcast messaggio | Invia a tutti channel subscribers | **Alta**  | ✓ Via Redis Pub/Sub, ✓ Latency < 200ms P95, ✓ Preserve order, ✓ No duplicates |
| RF-04.2 | Typing indicator    | Notifica "X is typing"            | **Media** | ✓ TTL 5 sec, ✓ Update while typing, ✓ Clear on send/blur                      |
| RF-04.3 | Presence update     | Status change online/offline      | **Media** | ✓ Broadcast to workspace, ✓ Update immediately, ✓ Last-seen timestamp         |
| RF-04.4 | Member joined       | Notifica quando user join canale  | **Media** | ✓ Notify all channel members, ✓ Include user name, ✓ Timestamp                |
| RF-04.5 | Member left         | Notifica quando user leave canale | **Media** | ✓ Notify all channel members, ✓ Remove from list, ✓ Archive DMs               |
| RF-04.6 | Channel update      | Canale modificato (nome, topic)   | **Media** | ✓ Broadcast to subscribers, ✓ Update client UI, ✓ Persist new state           |

**Event Architecture:**

```
Client sends message
  ↓
Gateway Server (WS)
  ↓
API Server (validate, persist)
  ↓
Database (INSERT message)
  ↓
Redis Pub/Sub: publish("channel:123", message)
  ↓
┌─────────────────┬──────────────────┬──────────────┐
↓                 ↓                  ↓
GS-A          GS-B             GS-C
(Client A)    (Client B)       (Client C)
  ↓             ↓                ↓
Subscribers receive message via WS
  ↓
All clients updated instantly
Total latency: < 200ms
```

---

### RF-05: Persistenza Messaggi

| ID      | Funzionalità     | Descrizione                | Priorità  | AC                                                                                      |
| ------- | ---------------- | -------------------------- | --------- | --------------------------------------------------------------------------------------- |
| RF-05.1 | Salva messaggio  | Persist atomicamente su DB | **Alta**  | ✓ On save, ✓ Atomic transaction, ✓ Timestamp monotonic, ✓ Unique ID                     |
| RF-05.2 | Idempotence      | Deduplica invii duplicati  | **Alta**  | ✓ Client sends idempotency key, ✓ Check if exists, ✓ Return same ID                     |
| RF-05.3 | Backup           | Snapshot DB automatici     | **Alta**  | ✓ Daily backups, ✓ Geo-replicated, ✓ PITR available, ✓ Test restoration                 |
| RF-05.4 | Retention policy | Delete old messages        | **Media** | ✓ Configurable per workspace, ✓ Default 2+ years, ✓ Enterprise unlimited                |
| RF-05.5 | Soft delete      | Retain audit trail         | **Media** | ✓ Mark deleted_at, ✓ Keep for audit, ✓ Don't show to users, ✓ Include in search (admin) |

---

### RF-06: Cronologia e Recupero

| ID      | Funzionalità           | Descrizione                     | Priorità         | AC                                                                                         |
| ------- | ---------------------- | ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| RF-06.1 | Recupera messaggi      | GET /channels/:id/messages      | **Alta**         | ✓ Pagination (limit, offset), ✓ Cursor-based optional, ✓ Descending order (newest first)   |
| RF-06.2 | Cronologia con filtri  | Filter by user, date, keyword   | **Media**        | ✓ Query performance < 100ms, ✓ Index su sender_id, created_at                              |
| RF-06.3 | Re-sync post-reconnect | Recupera messaggi mancanti      | **Alta**         | ✓ Client send last received message id, ✓ Server returns newer, ✓ Include in-memory buffer |
| RF-06.4 | Search full-text       | Ricerca per contenuto messaggio | **Media/Phase2** | ✓ Index su body text, ✓ Filter by channel/user/date, ✓ Ranking by relevance                |
| RF-06.5 | Export chat            | Esporta cronologia canale       | **Bassa**        | ✓ JSON o CSV format, ✓ Admin only, ✓ Include attachments                                   |

---

### RF-07: Gestione della Presenza

| ID      | Funzionalità             | Descrizione                  | Priorità         | AC                                                                                            |
| ------- | ------------------------ | ---------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| RF-07.1 | Online/Offline detection | Tracciamento stato utente    | **Alta**         | ✓ Connected WS = online, ✓ Disconnected > 30s = offline, ✓ Broadcast state change             |
| RF-07.2 | Last-seen timestamp      | Salva ultimo accesso         | **Media**        | ✓ Update on disconnect, ✓ Store in Redis for perf, ✓ Sync to DB periodically                  |
| RF-07.3 | Status di attività       | Idle, active, do-not-disturb | **Media/Phase2** | ✓ Client set via UI, ✓ Auto-idle after 5 min inactivity, ✓ Notify workspace                   |
| RF-07.4 | Visibilità presence      | Chi può vedere chi è online  | **Media**        | ✓ Same workspace members, ✓ Public workspaces show guest presence, ✓ Respect privacy settings |

---

### RF-08: Typing Indicator

| ID      | Funzionalità     | Descrizione                 | Priorità  | AC                                                                          |
| ------- | ---------------- | --------------------------- | --------- | --------------------------------------------------------------------------- |
| RF-08.1 | Typing start     | User inzia a scrivere       | **Media** | ✓ Send event on first char, ✓ TTL 5 sec, ✓ No DB persist                    |
| RF-08.2 | Typing stop      | User smette di scrivere     | **Media** | ✓ Send on blur/send, ✓ Clear indicator, ✓ Auto-clear after TTL              |
| RF-08.3 | Multiple typists | Mostra se più user scrivono | **Media** | ✓ Aggregate all typing users, ✓ UI shows list, ✓ Limit to 3 shown per space |

---

## 📊 Requisiti Non-Funzionali

### RNF-01: Performance & Latenza

```
┌──────────────────────────────────────────────┐
│ PERFORMANCE TARGETS                          │
│                                              │
│ Il sistema deve operare con latenza         │
│ minima, garantendo responsiveness all'user. │
└──────────────────────────────────────────────┘
```

| ID       | Metrica              | Target   | Misurazione       | Impatto se non rispettato        |
| -------- | -------------------- | -------- | ----------------- | -------------------------------- |
| RNF-01.1 | WebSocket latency    | < 200 ms | P95 end-to-end    | User percepisce ritardo messaggi |
| RNF-01.2 | API response (read)  | < 100 ms | P95               | User wait visible delays         |
| RNF-01.3 | API response (write) | < 150 ms | P95               | Responsiveness ridotto           |
| RNF-01.4 | DB query latency     | < 50 ms  | P99               | Bottleneck overall system        |
| RNF-01.5 | Reconnection time    | < 2 sec  | End-to-end        | User frustration                 |
| RNF-01.6 | Typing indicator     | < 100 ms | Server processing | Appears laggy                    |

**Monitoring Targets:**

```
WebSocket latency distribution (target)
    │
100%│ ░░░░░░░░░░░░░░░░░
 95%│ ░░░░░░░░░░░░░░░░░
 90%│ ░░░░░░░░░░░░░░░
 50%│ ░░░░░░░░
    └─────────────────────
        0ms  50ms 100ms 200ms

Target: P95 < 200ms ✓
```

---

### RNF-02: Scalabilità

| ID       | Requisito                 | Target           | Strategia                             |
| -------- | ------------------------- | ---------------- | ------------------------------------- |
| RNF-02.1 | Connessioni WS simultanee | ≥ 100.000        | Horizontal scaling GS, load balancing |
| RNF-02.2 | Throughput messaggi       | ≥ 10.000 msg/s   | Pub/Sub + async DB writes             |
| RNF-02.3 | Utenti per workspace      | ≥ 1.000.000      | Sharding user data                    |
| RNF-02.4 | Canali per workspace      | ≥ 100.000        | Efficient channel indexing            |
| RNF-02.5 | Messaggi persistiti       | ≥ 10 miliardi    | DB partitioning by date               |
| RNF-02.6 | Crescita lineare          | Latency constant | Stateless GS, distributed CS          |

---

### RNF-03: Affidabilità & Durabilità

| ID       | Requisito                      | Target              | Mitigazione                           |
| -------- | ------------------------------ | ------------------- | ------------------------------------- |
| RNF-03.1 | Uptime mensile                 | ≥ 99,9%             | Multi-zone deployment, failover auto  |
| RNF-03.2 | Perdita messaggi               | ≤ 0,01% (< 1:10000) | Atomic persistence + retry queue      |
| RNF-03.3 | Data durability                | ≥ 99,99%            | Replication 3x, backup geo-replicated |
| RNF-03.4 | Recovery Time Objective (RTO)  | < 5 minuti          | Automated failover, health checks     |
| RNF-03.5 | Recovery Point Objective (RPO) | < 1 minuto          | DB WAL + continuous replication       |

**Availability Calculation:**

```
99.9% uptime = 43 minutes downtime per month
99.99% uptime = 4 minutes downtime per month

Target: 99.9% achievable, 99.99% aspiration
```

---

### RNF-04: Sicurezza

| ID       | Aspetto          | Controllo         | Implementazione                 |
| -------- | ---------------- | ----------------- | ------------------------------- |
| RNF-04.1 | Autenticazione   | JWT token         | RSA-256 signing, TTL 1h         |
| RNF-04.2 | Autorizzazione   | RBAC              | Role-based, resource-level      |
| RNF-04.3 | Trasporto        | TLS 1.3           | HTTPS + WSS required            |
| RNF-04.4 | Password         | Hashing           | Argon2id con salt               |
| RNF-04.5 | Input validation | Sanitization      | Whitelist patterns, max lengths |
| RNF-04.6 | Rate limiting    | DDoS protection   | Per-IP + per-user throttling    |
| RNF-04.7 | CORS             | Origin validation | Whitelist domains               |
| RNF-04.8 | Audit logging    | Compliance        | Structured JSON, immutable      |

---

### RNF-05: Manutenibilità

| ID       | Aspetto             | Obiettivo                | Implementazione                     |
| -------- | ------------------- | ------------------------ | ----------------------------------- |
| RNF-05.1 | Logging             | Visibility               | Structured logging (Pino/Winston)   |
| RNF-05.2 | Monitoring          | Real-time alerts         | Prometheus + Grafana dashboards     |
| RNF-05.3 | Tracing distribuito | Debug requests           | OpenTelemetry + Jaeger              |
| RNF-05.4 | CI/CD               | Deploy frequenti         | GitHub Actions, automated tests     |
| RNF-05.5 | Documentation       | API clearness            | Swagger/OpenAPI + examples          |
| RNF-05.6 | Runbooks            | Operational preparedness | Step-by-step troubleshooting guides |

---

## 👥 Attori e Personas

### Attore 1: Utente Team

**Descrizione:** Membro di un team che usa la piattaforma per comunicare

**Obiettivi:**

- Ricevere messaggi in tempo reale
- Conversare con colleghi
- Accedere alla cronologia
- Sapere chi è online

**Frustazioni attuali:**

- Latenza messaggi
- Perdita cronologia
- Impossibile sapere chi è online

**Use cases principali:**

- UC-01: Login alla piattaforma
- UC-03: Inviare messaggio in canale
- UC-04: Visualizzare cronologia
- UC-05: Vedere chi è online

---

### Attore 2: Amministratore Workspace

**Descrizione:** Team leader che gestisce workspace e canali

**Obiettivi:**

- Creare workspace e canali
- Gestire utenti e permessi
- Monitorare attività
- Conformità GDPR

**Frustazioni attuali:**

- Nessuno strumento management
- Difficile scalare a molti utenti
- Nessun audit logging

**Use cases principali:**

- UC-02: Creare workspace
- UC-02.1: Invitare utenti
- UC-02.2: Creare canali
- UC-02.3: Gestire permessi

---

### Attore 3: Sviluppatore Bot/Integrazione

**Descrizione:** Sviluppatore che automatizza task via API

**Obiettivi:**

- Inviare messaggi programmatici
- Ricevere webhooks
- Automatizzare notifiche
- Integrare servizi esterni

**Frustazioni attuali:**

- API limitata
- Nessun bot support
- Nessuna webhook

**Use cases principali:**

- UC-06: Bot login
- UC-06.1: Invia messaggio programmatico
- UC-06.2: Ricevi webhook

---

## 📋 Casi d'Uso Principali (Use Cases)

### UC-01: Registrazione e Login

```
Attore: Utente Team / Admin
Precondizione: Utente non registrato
Flusso principale:
  1. Utente accede a registration form
  2. Inserisce email, password, name
  3. Sistema valida email (format + unique)
  4. Sistema verifica password strength (≥8 char, mix)
  5. Sistema invia verification email
  6. Utente clicca link
  7. Email verified, can login

Postcondizione: Utente autenticato, JWT issued
Alternate: OAuth flow (Google/GitHub)
```

---

### UC-02: Creazione Workspace e Canali

```
Attore: Administrator Workspace
Precondizione: Utente autenticato
Flusso principale:
  1. Admin naviga "Create Workspace"
  2. Inserisce nome workspace
  3. Sistema crea workspace (owner = admin)
  4. Sistema crea default #general channel
  5. Admin importa CSV member list
  6. Sistema invia invite emails
  7. Admin crea canali (public/private)
  8. Sistema assegna permissions

Postcondizione: Workspace live, users invited, channels ready
```

---

### UC-03: Invio e Ricezione Messaggi Real-Time

```
Attore: Utente Team
Precondizione: Utente in canale, WS connected
Flusso principale:
  1. Utente digita messaggio
  2. Clicca "send" o premi Enter
  3. Client invia via WS a Gateway Server
  4. GS valida token JWT
  5. GS invia a API Server
  6. API Server persiste on DB
  7. API Server pubblica su Redis Pub/Sub
  8. Tutti GS ricevono evento
  9. Broadcast a tutti client nel canale
 10. Client riceve evento via WS
 11. UI aggiorna messaggio list

Postcondizione: Messaggio visibile a tutti, persistito
Latency: < 200ms P95
Alternative: Message failed → retry queue
```

---

### UC-04: Visualizzazione Cronologia Messaggi

```
Attore: Utente Team
Precondizione: Utente in canale
Flusso principale:
  1. Utente click "View History"
  2. Client invia GET /channels/:id/messages
  3. Server ritorna pagina messaggi (50 messages)
  4. UI mostra messaggi
  5. User scroll up (load older)
  6. Client invia cursor-based query
  7. Server ritorna pagina precedente

Postcondizione: Cronologia visualizzata con pagination
Performance: < 100ms per page load
```

---

### UC-05: Gestione Presence Utenti

```
Attore: Utente Team (passive observer)
Precondizione: Utente in canale
Flusso principale:
  1. Utente A accede al canale
  2. Presence Server registra: "User A online"
  3. Broadcast to all workspace members
  4. Tutti vedono User A "online" badge
  5. Utente A digita messaggio (active)
  6. Activity tracker aggiorna status
  7. Utente A disconnect
  8. After 30s, mark offline
  9. Broadcast to all
 10. Tutti vedono User A "offline"

Postcondizione: Presence up-to-date for all users
Update latency: < 200ms
```

---

### UC-06: Bot Integration (Programmatic Message)

```
Attore: Sviluppatore Bot
Precondizione: Bot authenticated con API key
Flusso principale:
  1. Bot logic triggered (e.g., new GitHub PR)
  2. Bot POST /api/messages/send
  3. Include: channel_id, body, bot_token
  4. API Server validates bot permission
  5. API Server persists message (sender = bot)
  6. API Server publishes to Pub/Sub
  7. All users see notification message

Postcondizione: Automated message sent and broadcasted
Usefulness: Notifications, reminders, alerts
```

---

## 🔗 Vincoli e Dipendenze

### Vincoli Architetturali

| Vincolo                   | Descrizione                                | Implicazione                              |
| ------------------------- | ------------------------------------------ | ----------------------------------------- |
| **WebSocket required**    | Real-time richiede connessione persistente | Infrastruttura con connessioni long-lived |
| **Postgres mandatory**    | Persistenza dati relazionali               | Setup DB cluster, replication             |
| **Redis required**        | Pub/Sub for broadcast scaling              | Redis cluster, monitoring                 |
| **Stateless GS**          | Scale orizzontale richiede stateless       | Sticky sessions, shared state in Redis    |
| **Sharding by workspace** | Scalabilità dati richiede isolamento       | Complex routing, consistent hashing       |

### Dipendenze Esterne

| Servizio            | Descrizione          | Criticità | Fallback                        |
| ------------------- | -------------------- | --------- | ------------------------------- |
| **PostgreSQL**      | Database persistenza | Critica   | none (must run)                 |
| **Redis**           | Pub/Sub, cache       | Critica   | Fall back to polling (degraded) |
| **SMTP provider**   | Email invites        | Alta      | Manual invite links             |
| **OAuth providers** | Google/GitHub auth   | Media     | Local auth fallback             |

---

## ⚠️ Rischi e Mitigazioni

### Risk Register

| #   | Rischio            | Probabilità | Impatto | Mitigazione                          |
| --- | ------------------ | ----------- | ------- | ------------------------------------ |
| R1  | Perdita messaggi   | Bassa       | Critica | Atomic DB write + idempotency keys   |
| R2  | Sovraccarico GS    | Media       | Alta    | Autoscaling, load balancing          |
| R3  | Redis unavailable  | Bassa       | Critica | Fallback to polling, cluster setup   |
| R4  | DB crash           | Bassa       | Critica | Backup 3x replication, PITR          |
| R5  | Attacco DDoS       | Media       | Alta    | Rate limiting, WAF, DDoS protection  |
| R6  | Auth bypass        | Bassa       | Critica | JWT validation, CORS, HTTPS only     |
| R7  | Data breach        | Bassa       | Critica | TLS, password hashing, audit logs    |
| R8  | Latenza geografica | Media       | Media   | Multi-region GS deployment           |
| R9  | Scalabilità DB     | Media       | Alta    | Read replicas, caching, sharding     |
| R10 | Monitoring failure | Bassa       | Media   | Redundant monitoring, on-call alerts |

---

## 🗓️ Roadmap (Macro)

```
Month:      1  2  3  4  5  6  7  8  9  10 11 12
Phase 1:    [=========]
Phase 2:          [=========]
Phase 3:               [=========]
Phase 4:                    [=========]
Phase 5:                         [==========]
Phase 6:                              [=====]
Beta:                                    [====]
Production:                                  [====]
```

---

## 📚 Allegati & Appendici

### Documenti Correlati

- **DAT (Analisi Tecnica)** — Dettagli architetturali e implementazione
- **PRD (Product Requirements)** — Visione prodotto e strategy
- **Schema DB** — ER diagram e migrations
- **API Reference** — Swagger/OpenAPI spec
- **WebSocket Protocol** — Evento specification

### Appendice A: Glossario Abbreviazioni

| Abbreviazione | Significato                        |
| ------------- | ---------------------------------- |
| GS            | Gateway Server                     |
| CS            | Channel Server                     |
| PS            | Presence Server                    |
| WS            | WebSocket                          |
| JWT           | JSON Web Token                     |
| RBAC          | Role-Based Access Control          |
| GDPR          | General Data Protection Regulation |
| TTL           | Time To Live                       |
| PITR          | Point-In-Time Recovery             |
| RTO           | Recovery Time Objective            |
| RPO           | Recovery Point Objective           |
| SLA           | Service Level Agreement            |

---

**Documento:** Slack-Clone Backend - Analisi Funzionale  
**Versione:** 1.0  
**Status:** 🟡 **Bozza - In Review**  
**Ultimo update:** 19 novembre 2025
