# Documento di Analisi Funzionale (DAF)

## Slack-Clone Frontend

---

## 📋 Intestazione Documento

| Attributo    | Valore                                    |
| ------------ | ----------------------------------------- |
| **Titolo**   | Slack-Clone Frontend - Analisi Funzionale |
| **Versione** | 1.0                                       |
| **Data**     | 19 novembre 2025                          |
| **Autore**   | Team Frontend                             |
| **Revisori** | Da definire                               |
| **Stato**    | Bozza                                     |

---

## 🎯 Scopo e Ambito

### Obiettivo del Documento

Questo documento **descrive in dettaglio i requisiti funzionali** dell'interfaccia frontend di Slack-Clone. Fornisce:

- ✅ Mappatura completa delle funzionalità UI/UX
- ✅ Dettagli di ogni schermata e componente
- ✅ Flussi utente specifici (user flows)
- ✅ Interazioni e comportamenti
- ✅ Validazioni e gestione errori
- ✅ Accessibilità e responsiveness
- ✅ Tracciabilità verso requisiti backend

### Ambito

**In scope (MVP):**

- Authentication (signup, login, logout)
- Workspace creation & switching
- Channel browsing & creation
- Message sending & receiving
- Real-time presence
- User profile
- Basic settings
- Responsive UI (mobile → desktop)

**Out of scope (Phase 2+):**

- Advanced search
- File uploads
- Emoji reactions
- Message threads
- Dark mode
- Keyboard shortcuts
- 2FA
- Integrations

---

## 📸 Architettura dell'Interfaccia

### Layout Principale (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                          │
│ └─ Logo | Workspace Selector | Search | Settings | Logout       │
├──────────────────┬──────────────────────────┬───────────────────┤
│                  │                          │                   │
│   SIDEBAR        │      MAIN CHAT AREA      │   MEMBER PANEL    │
│   (Left Panel)   │    (Content Area)        │   (Right Panel)   │
│                  │                          │   [Phase 2+]      │
│ - Channels       │ ┌──────────────────────┐ │                   │
│ - DMs            │ │ Channel Header       │ │ - Members list    │
│ - Favorites      │ ├──────────────────────┤ │ - Channel info    │
│ - Online         │ │ Messages History     │ │ - Search in       │
│ - Compose        │ │ (Scrollable)         │ │   channel         │
│                  │ ├──────────────────────┤ │                   │
│                  │ │ Message Input Box    │ │                   │
│                  │ └──────────────────────┘ │                   │
└──────────────────┴──────────────────────────┴───────────────────┘
```

### Layout Mobile (< 640px)

```
┌───────────────────────────────────────────┐
│ NAVBAR                                    │
│ └─ Menu | Search | Settings               │
├───────────────────────────────────────────┤
│                                           │
│  MAIN CHAT AREA                           │
│  ┌─────────────────────────────────────┐  │
│  │ Channel: #general                   │  │
│  ├─────────────────────────────────────┤  │
│  │                                     │  │
│  │ Message History (full width)        │  │
│  │                                     │  │
│  ├─────────────────────────────────────┤  │
│  │ [Type message...] [Send]            │  │
│  └─────────────────────────────────────┘  │
│                                           │
│ ← Drawer (hidden, slide from left)        │
│   Sidebar content on demand               │
└───────────────────────────────────────────┘
```

---

## 🔐 Authentication & Session

### Schermata: Sign Up

**URL:** `/auth/signup`

**Componenti:**

```
┌─────────────────────────────────┐
│  SLACK CLONE                    │
│                                 │
│  Create your account            │
│                                 │
│  Full Name                      │
│  [________________]             │
│                                 │
│  Email Address                  │
│  [________________]             │
│  ↳ Will verify via email        │
│                                 │
│  Password                       │
│  [________________]             │
│  ↳ 🔓 Show | Password strength │
│                                 │
│  ☑ I agree to Terms of Service │
│                                 │
│  [Create Account]               │
│                                 │
│  Already have account? Log in   │
└─────────────────────────────────┘
```

**Behavior:**

1. User enters email, password, name
2. Client-side validation:
   - Email format check
   - Password ≥ 8 chars, contains uppercase + number
   - Name ≥ 2 chars
3. Real-time feedback (green check/red X)
4. Submit → POST /api/auth/register
5. Backend validates, hashes password
6. Sends verification email
7. Redirect to "Check your email" page
8. User clicks link → marks email verified
9. Can now login

**Error States:**

```
Email already in use
↳ "This email is already registered. Log in or use another email."

Weak password
↳ "Password must include uppercase, number, and be 8+ characters"

Invalid email format
↳ "Please enter a valid email address"

Network error
↳ "Failed to create account. Check connection and try again."
```

---

### Schermata: Login

**URL:** `/auth/login`

**Componenti:**

```
┌─────────────────────────────────┐
│  SLACK CLONE                    │
│                                 │
│  Welcome back                   │
│                                 │
│  Email Address                  │
│  [________________]             │
│                                 │
│  Password                       │
│  [________________]             │
│  ↳ 🔓 Show | Forgot password?   │
│                                 │
│  ☑ Keep me logged in (30 days)  │
│                                 │
│  [Sign In]                      │
│                                 │
│  Don't have account? Sign up    │
└─────────────────────────────────┘
```

**Behavior:**

1. User enters email & password
2. Click "Sign In"
3. POST /api/auth/login
4. Backend validates credentials
5. Returns JWT token + refresh token
6. Client stores in HttpOnly cookie
7. Redirect to workspace selector
8. Set session valid for 7 days
9. "Keep me logged in" extends to 30 days

**Error States:**

```
Incorrect password (after 3 attempts)
↳ "Invalid email or password. (2 attempts remaining)"

Too many failed attempts
↳ "Too many login attempts. Try again in 15 minutes."

Email not verified
↳ "Please verify your email first. Resend link"

Network error
↳ "Failed to login. Check connection and try again."
```

---

## 🏢 Workspace Management

### Schermata: Workspace Selector

**URL:** `/workspaces`

**Componenti:**

```
┌─────────────────────────────────────────────┐
│  SLACK CLONE                                │
│  Hi, John! Here are your workspaces        │
│                                             │
│  ┌──────────────────┐  ┌──────────────────┐│
│  │ ACME Corp        │  │ Design Collective││
│  │ 📍 acme-corp     │  │ 📍 design-co     ││
│  │ 45 members       │  │ 12 members       ││
│  │ 8 channels       │  │ 3 channels       ││
│  │ [Enter] [Leave]  │  │ [Enter] [Leave]  ││
│  └──────────────────┘  └──────────────────┘│
│                                             │
│  [+ Create New Workspace]                  │
│  [+ Join with Invite Code]                 │
└─────────────────────────────────────────────┘
```

**Behavior:**

1. Display all workspaces user is member of
2. Show workspace: name, slug, member count, channel count
3. Click workspace → load main chat interface
4. "Create New Workspace" → dialog form
5. "Leave Workspace" → confirmation dialog

---

### Schermata: Create Workspace

**Dialog/Modal:**

```
┌─────────────────────────────────┐
│  Create Workspace               │
│                                 │
│  Workspace Name                 │
│  [Example Corp____]             │
│  ↳ URL will be: example-corp    │
│                                 │
│  Description (optional)         │
│  [________________]             │
│                                 │
│  Visibility                     │
│  ○ Public (anyone can join)     │
│  ○ Private (invite only)        │
│                                 │
│  [Create] [Cancel]              │
└─────────────────────────────────┘
```

**Behavior:**

1. User enters name, description, visibility
2. Client generates slug (lowercase, no spaces, hyphens)
3. Real-time slug preview below input
4. POST /api/workspaces
5. Backend creates workspace, sets user as owner
6. Redirect to workspace main interface

---

## 💬 Main Chat Interface

### Schermata: Channel View (Desktop)

**Left Sidebar (Channels):**

```
┌──────────────────────────────┐
│ SLACK CLONE                  │
│ ACME Corp ▼                  │
├──────────────────────────────┤
│ ⭐ Starred                   │
│   • general                  │
│   • announcements            │
│                              │
│ CHANNELS (8)      ⤺ Collapse │
│   # general       ⭐         │
│   # random        🔔         │
│   # #dev
│   # design                   │
│   # sales                    │
│   # management               │
│   # social-media             │
│   # archive                  │
│                              │
│ DIRECT MESSAGES (3)          │
│   @ alice         💬 (2)     │
│   @ bob                      │
│   @ carol         💬 (5)     │
│                              │
│ [+ New Channel]              │
│ [+ Direct Message]           │
└──────────────────────────────┘
```

**Main Chat Area:**

```
┌────────────────────────────────────────────────────┐
│ ← GENERAL        Topic: General discussion    ℹ️   │
│ (45 members)                                       │
├────────────────────────────────────────────────────┤
│                                                    │
│ Jun 12                                             │
│ ────────────────────────────────────────────────── │
│                                                    │
│ [Avatar] Alice (09:30 AM)                         │
│          Hey everyone! Welcome to #general 👋     │
│          Feel free to introduce yourselves        │
│                                                    │
│ [Avatar] Bob (09:45 AM)                           │
│          Thanks Alice! I'm the backend dev 🚀     │
│          Let's build something great              │
│          ↳ ❤️ Alice, Charlie (2)                   │
│                                                    │
│ [Avatar] Carol typing... ✎                        │
│                                                    │
├────────────────────────────────────────────────────┤
│ [You're all caught up! ✓]                         │
│                                                    │
│ [Type a message...          ]  📎 😀 [Send]       │
│ (Press Ctrl+Enter to send)                        │
└────────────────────────────────────────────────────┘
```

**Message Details:**

```
Per-message interactions (on hover):
├── ❤️ (React with emoji)
├── ⋯ (More options)
│   ├── Edit message
│   ├── Copy text
│   ├── Copy link
│   ├── Reply in thread (Phase 2)
│   ├── Mark as important
│   └── Delete (if owner)
└── Time stamp (clickable → permalink)
```

---

### Schermata: Direct Message

**Sidebar - DM List:**

```
DIRECT MESSAGES (3)
  @ alice Smith      💬 (2)
    ↳ Last: "Good catch! 👍"

  @ bob Johnson
    ↳ Last: "See you tomorrow"

  @ carol Davis      💬 (5)
    ↳ Last: "Can you review PR #123?"
```

**Main Area (same as channel, but 1-a-1):**

```
┌────────────────────────────────────────────────────┐
│ alice Smith                             ✓ Online    │
│ Last active: just now                              │
├────────────────────────────────────────────────────┤
│ [Message history...]                               │
├────────────────────────────────────────────────────┤
│ [Type a message...          ]  📎 😀 [Send]       │
└────────────────────────────────────────────────────┘
```

---

## 👤 User Profile

### Schermata: Profile Card (Click on User Avatar)

**Popover/Drawer:**

```
┌─────────────────────────────┐
│  [Avatar]                   │
│  Alice Smith                │
│  @alice                     │
│                             │
│  ✅ Online • Active         │
│  Last active: just now      │
│                             │
│  Software Engineer @ ACME   │
│  San Francisco, CA 🌉      │
│                             │
│  ┌───────────────────────┐  │
│  │ 🇬🇧 English           │  │
│  │ 🌍 San Francisco      │  │
│  │ 💼 5 years experience │  │
│  └───────────────────────┘  │
│                             │
│  [Message] [View Profile]   │
│  [Block]                    │
└─────────────────────────────┘
```

### Schermata: Settings (User Preferences)

**URL:** `/settings`

```
┌────────────────────────────────────┐
│ ⚙️ Settings                        │
├────────────────────────────────────┤
│                                    │
│ ACCOUNT                            │
│ ├─ Profile                         │
│ │  [Avatar] [Upload]               │
│ │  Full Name: [Alice Smith____]    │
│ │  Display Name: @alice            │
│ │  Bio: [Software Engineer__]      │
│ │  Pronouns: [she/her        ▼]    │
│ │  Timezone: [America/Los_A ▼]     │
│ │  [Save Changes]                  │
│ │                                  │
│ ├─ Security                        │
│ │  Email: alice@acme.com           │
│ │  [Change Email]                  │
│ │  Password: ••••••••••            │
│ │  [Reset Password]                │
│ │  [Enable 2FA] (Phase 2)           │
│ │                                  │
│ ├─ Preferences                     │
│ │  Language: [English         ▼]    │
│ │  Theme: ◉ Light ○ Dark           │
│ │  Desktop Notifications: [On]     │
│ │  Sound: [On] [Test Sound]        │
│ │  Message Preview: [On]           │
│ │  Auto-away after: [5 min   ▼]    │
│ │  [Save]                          │
│ │                                  │
│ ├─ Privacy                         │
│ │  Show online status: [On]        │
│ │  Show in member directory: [On]  │
│ │  Allow DMs from anyone: [On]     │
│ │                                  │
│ ├─ Data & Accounts                 │
│ │  [Download my data]              │
│ │  [Delete account]                │
│ │                                  │
│ └─ [Logout]                        │
│                                    │
└────────────────────────────────────┘
```

---

## 🔔 Notifications & Indicators

### Unread Badge System

```
Sidebar Indicators:
├── Red badge: # unread (1-9+)
├── Bold text: Channel has unread
├── Highlight: DM has unread
└── Mute indicator (🔇): Channel muted

Message Badges:
├── @ mention: "Alice mentioned you"
├── !important: Pin to top
└── 💬 (n): Replies count (Phase 2)
```

### Desktop Notification

```
┌─────────────────────────────────┐
│ 🔔 Slack Clone                  │
│                                 │
│ Alice Smith                     │
│ @general: Hey team, check this  │
│                                 │
│ [Open]                    [×]   │
└─────────────────────────────────┘
```

---

## 🔍 Search Interface

### Search Modal (Cmd+K or Click Search)

```
┌────────────────────────────────────┐
│  🔍 Search Slack Clone             │
│  [Search messages, channels, users] │
│                                    │
│  RESULTS (30)                      │
│                                    │
│  CHANNELS (3)                      │
│  ├── #general (45 members)         │
│  ├── #random (8 members)           │
│  └── #dev (12 members)             │
│                                    │
│  MESSAGES (15)                     │
│  ├── Alice: "Check the API docs"   │
│  │   #dev • Jun 15, 2:30 PM        │
│  ├── Bob: "Deploy to prod"         │
│  │   #deployments • Jun 12, 9 AM   │
│  └── ...                           │
│                                    │
│  PEOPLE (5)                        │
│  ├── Alice Smith (@alice)          │
│  │   Software Engineer • Online    │
│  ├── Bob Johnson (@bob)            │
│  │   Backend Dev • Away            │
│  └── ...                           │
│                                    │
│  [Advanced Search ↓]               │
└────────────────────────────────────┘
```

---

## ✅ Validation & Error Handling

### Message Input Validation

```
Rules:
├── Max 4000 characters
├── Trim whitespace
├── @mention autocomplete
├── Link detection + preview
├── Emoji support
└── Markdown formatting (basic)

Feedback:
├── Character counter (blue → red at limit)
├── "X is typing..." indicator
├── "Message sending..." spinner
├── "Failed to send" with retry button
└── "(edited)" indicator on updates
```

### Channel Name Validation

```
Rules:
├── 1-80 characters
├── Lowercase + hyphens
├── No special characters
├── Unique per workspace
├── Can't start/end with hyphen

Real-time feedback:
├── ✓ Green (available)
├── ✗ Red (taken)
├── ⚠️ Orange (invalid format)
```

---

## 🔄 Real-Time Updates via WebSocket

### Events the Frontend Listens For

```javascript
message:new
  ↳ New message in subscribed channel
     { id, channel_id, sender, body, created_at }

message:updated
  ↳ Message edited
     { id, body, updated_at }

message:deleted
  ↳ Message removed
     { id, channel_id }

presence:changed
  ↳ User online/offline/idle
     { user_id, status, last_seen }

typing:started
  ↳ User is typing
     { user_id, channel_id, user_name }

typing:stopped
  ↳ User finished typing
     { user_id, channel_id }

channel:member:joined
  ↳ New member joined channel
     { channel_id, user_id, user_name }

channel:member:left
  ↳ Member left channel
     { channel_id, user_id }
```

---

## 📐 Accessibility Checklist

```
✓ Keyboard Navigation
  ├── Tab through all interactive elements
  ├── Enter/Space to activate buttons
  ├── Arrow keys for list navigation
  └── Escape to close modals

✓ Screen Reader Support
  ├── ARIA labels on buttons
  ├── Form labels with input
  ├── Alt text on avatars/images
  └── Semantic HTML (nav, main, aside)

✓ Color Contrast
  ├── Text: 4.5:1 (large: 3:1)
  ├── UI elements: 3:1
  ├── No color-only information
  └── Tested with aXe / Lighthouse

✓ Focus Management
  ├── Visible focus indicator
  ├── Logical tab order
  ├── Trap focus in modals
  └── Return focus after close

✓ Motion
  ├── prefers-reduced-motion honored
  ├── No auto-playing video
  ├── No flashing > 3x/sec
  └── Animation duration < 500ms
```

---

## 📱 Mobile-Specific Behavior

```
Layout:
├── Single column (full width)
├── Hamburger menu for sidebar
├── Bottom sheet for options
└── Fixed input box at bottom

Touch:
├── 48px min touch targets
├── Long-press for context menu
├── Swipe to dismiss
├── Swipe to navigate (drawer)

Performance:
├── Lazy load message history
├── Virtual scrolling for long lists
├── Image compression (mobile)
└── Service worker for offline

Notifications:
├── Vibration on new message
├── Badge on app icon
├── Native push notifications
```

---

## 🧪 Testing Scenarios

### Critical User Flows to Test

```
1. Authentication Flow
   ├── Sign up → verify email → login ✓
   ├── Login → remember me → auto-login ✓
   ├── Logout → session cleared ✓

2. Channel Navigation
   ├── Switch channels (messages update) ✓
   ├── Scroll to top/bottom ✓
   ├── Load older messages ✓

3. Messaging
   ├── Send message → appears immediately ✓
   ├── Edit message → update visible ✓
   ├── Delete message → removed ✓
   ├── Offline → queue → sync on reconnect ✓

4. Presence
   ├── Come online → show in list ✓
   ├── Go offline → hide from list ✓
   ├── Typing indicator → show/clear ✓

5. Notifications
   ├── Mention → notify + badge ✓
   ├── DM → notify + badge ✓
   ├── Sound → play/mute ✓
```

---

**Documento:** Slack-Clone Frontend - Analisi Funzionale  
**Versione:** 1.0  
**Status:** 🟡 **Bozza - In Review**  
**Ultimo update:** 19 novembre 2025
