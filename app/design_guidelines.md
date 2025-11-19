# Design Guidelines: Slack Clone Application

## Design Approach

**Reference-Based Approach**: Drawing from Slack's proven interface patterns while maintaining clean, modern aesthetics. This is a productivity-focused application where efficiency, clarity, and familiarity drive user success.

**Core Principle**: Maximize information density without sacrificing readability. Users need quick access to workspaces, channels, messages, and presence indicators.

---

## Layout System

**Three-Column Application Structure**:
- **Left Sidebar (240px fixed)**: Workspace switcher, channel list, direct messages
- **Main Content Area (flex-1)**: Message thread, channel header, input area  
- **Right Panel (280px, collapsible)**: User details, thread replies (context-dependent)

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12** for consistent rhythm
- Tight spacing: p-2, gap-2 (list items, inline elements)
- Standard spacing: p-4, gap-4 (cards, sections)
- Generous spacing: p-6, p-8 (major sections, headers)

**Responsive Behavior**:
- Mobile: Stack to single column, hamburger menu for sidebar
- Tablet: Two-column (hide right panel by default)
- Desktop: Full three-column layout

---

## Typography System

**Font Stack**: System font stack for performance
```
font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

**Hierarchy**:
- **Workspace/Channel Names**: text-lg font-bold (18px)
- **Message Sender**: text-sm font-semibold (14px)
- **Message Body**: text-base (16px) - optimized for reading
- **Timestamps**: text-xs (12px) with reduced opacity
- **UI Labels**: text-sm font-medium (14px)
- **Input Placeholders**: text-sm (14px)

**Line Height**: Generous for message content (leading-relaxed), tight for lists (leading-tight)

---

## Component Library

### Navigation Components

**Workspace Switcher**:
- Fixed top section (h-12) with workspace name and dropdown icon
- Compact button with workspace avatar/icon
- Dropdown reveals workspace list on click

**Channel List**:
- Scrollable section (overflow-y-auto)
- Channel items: py-1 px-3, hover:bg with subtle transition
- Active channel: distinct background treatment
- Unread indicators: bold text + count badge (rounded-full, px-2, text-xs)
- Section headers: text-xs font-semibold uppercase tracking-wide, mt-6 mb-2

**Direct Messages**:
- User avatars (w-6 h-6 rounded-full) with presence dot (absolute, bottom-0, right-0)
- Online: solid dot, Offline: hollow ring

### Message Components

**Message Thread**:
- Individual messages: py-2 px-4, hover:bg for actions reveal
- Message structure: flex with avatar (mt-1) + content column
- Avatar: w-9 h-9 rounded-lg (slightly rounded, not full circle)
- Timestamp: text-xs, ml-auto, shown on hover
- Action bar: absolute top-0 right-4 with buttons (reply, emoji, more)

**Message Input**:
- Fixed bottom area (border-t)
- Rich text editor area: min-h-24, p-4
- Toolbar: flex gap-2 with icon buttons (text-xl)
- Send button: Only enabled when text present

**Channel Header**:
- Sticky top (sticky top-0, z-10)
- Channel name + description
- Member count, pins, search icons
- Height: h-14, border-b

### Modal & Overlay Components

**Create Channel Modal**:
- Centered overlay with backdrop (bg-black/50)
- Modal: max-w-lg, rounded-lg, p-6
- Form fields: space-y-4
- Radio buttons for public/private selection
- Action buttons: flex justify-end gap-3

**User Profile Panel**:
- Slide-in from right (transition-transform)
- Avatar large (w-24 h-24)
- Bio, status, contact info
- Tabbed interface for messages/files

### Form Elements

**Input Fields**:
- Consistent height: h-10
- Padding: px-3
- Border radius: rounded-md
- Focus states with ring treatment

**Buttons**:
- Primary: px-4 py-2 rounded-md font-medium
- Secondary: Same size, border variant
- Icon-only: p-2 rounded-md
- Sizes: Small (h-8), Medium (h-10), Large (h-12)

---

## Real-Time Features

**Typing Indicator**:
- Display below message input in active channel
- Animated ellipsis, text-sm italic
- "User is typing..." format

**Presence Indicators**:
- Consistent dot system across all avatars
- Size: w-3 h-3 with border (border-2 border-white)
- Position: Absolute bottom-0 right-0

**Message Status**:
- Sending: reduced opacity (opacity-60)
- Sent: full opacity
- Failed: Error icon with retry option

---

## Interactive States

**Hover States**:
- Subtle background changes (hover:bg-opacity-80)
- List items: hover:bg with smooth transition
- Buttons: hover:bg with scale-105 for primary actions

**Active/Selected States**:
- Distinct background for active channel/conversation
- Maintain visibility of text and icons

**Loading States**:
- Skeleton screens for initial load
- Shimmer effect: animate-pulse
- Spinner for actions (w-5 h-5 animate-spin)

---

## Iconography

**Icon Library**: Heroicons (outline for default, solid for active states)

**Icon Sizing**:
- Small UI icons: w-4 h-4 (navigation, inline actions)
- Standard icons: w-5 h-5 (buttons, headers)
- Large icons: w-6 h-6 (prominent actions)

**Icon Usage**:
- Consistent across similar actions
- Pair with text labels in primary navigation
- Icon-only for secondary actions with tooltips

---

## Images & Avatars

**User Avatars**:
- Generated placeholder when no image (initials on solid background)
- Consistent sizing: Small (w-6 h-6), Medium (w-9 h-9), Large (w-24 h-24)
- Rounded corners: rounded-lg for avatars, rounded-full for minimal UI

**Workspace Icons**:
- Size: w-10 h-10
- Support for uploaded logos or letter-based placeholders

**No hero images** - This is a productivity application focused on functional interface.

---

## Accessibility

- Semantic HTML throughout (nav, main, aside, article)
- ARIA labels for icon buttons
- Keyboard navigation: Tab order, Enter/Space for actions
- Focus visible states (focus:ring-2)
- Screen reader announcements for new messages
- Sufficient contrast ratios for all text

---

## Performance Considerations

- Virtual scrolling for long message lists
- Lazy load images and avatars
- Debounce typing indicators
- Optimistic UI updates for instant feedback
- Message pagination (load 50 at a time)