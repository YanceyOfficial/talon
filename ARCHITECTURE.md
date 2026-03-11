# Talon Architecture

## Overview

Talon is a desktop AI assistant built with Tauri 2 + React. It provides a floating always-on-top chat interface that connects to an OpenClaw Gateway via WebSocket for AI conversation, supporting multiple sessions, system notifications, and auto-switching to sessions with new messages.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Desktop shell | Tauri 2.0 (Rust) |
| Styling | Tailwind CSS 4.x + shadcn/ui (Radix UI) |
| Animation | DotLottie (Lottie format) |
| AI backend | OpenClaw WebSocket Gateway (`ws://localhost:18789`) |
| Auth | Ed25519 keypair signing (`@noble/ed25519`) |
| Persistence | `@tauri-apps/plugin-store` |

## Project Structure

```
talon/
├── src/
│   ├── components/
│   │   ├── markdown.tsx          # Markdown renderer (default + compact variants)
│   │   ├── message-bubble.tsx    # Message display (user/assistant/toolCall/toolResult)
│   │   ├── talon-avatar.tsx      # Lottie avatar with state variants
│   │   └── ui/                   # shadcn/ui components
│   ├── hooks/
│   │   ├── use-multi-session.ts  # Top-level hook (pages use this)
│   │   ├── use-open-claw.ts      # WebSocket connection + frame handling
│   │   ├── use-session-manager.ts# Session CRUD + persistence
│   │   └── use-theme.ts          # Dark/light theme management
│   ├── lib/
│   │   ├── device-identity.ts    # Ed25519 keypair + auth token caching
│   │   ├── message-utils.ts      # Message transformation utilities
│   │   ├── notification.ts       # System notification helpers
│   │   ├── session-manager.ts    # Session persistence logic (Tauri Store)
│   │   ├── store.ts              # Tauri Store wrapper + localStorage migration
│   │   └── windows.ts            # Multi-window management
│   ├── pages/
│   │   ├── app.tsx               # Main window UI
│   │   ├── chat.tsx              # Chat history window UI
│   │   └── settings/             # Settings window (tabbed)
│   │       ├── connection-tab.tsx
│   │       ├── sessions-tab.tsx
│   │       └── ...
│   ├── types/
│   │   ├── gateway.ts            # Gateway API types
│   │   ├── openclaw.ts           # OpenClaw message types
│   │   ├── session.ts            # Session configuration types
│   │   └── talon.ts              # App-level types
│   ├── main.tsx                  # Main window entry
│   ├── chat-main.tsx             # Chat window entry
│   └── settings-main.tsx         # Settings window entry
├── src-tauri/
│   └── src/
│       └── lib.rs                # Tauri commands, tray icon, window positioning
├── screenshots/                  # App screenshots (used in README)
└── public/
```

## Multi-Window System

The app uses three separate Tauri windows with shared state via Tauri events:

### 1. Main Window (`main.tsx` → `app.tsx`)

- Floating, transparent, always-on-top assistant (450×420px)
- Positioned at bottom-right corner dynamically
- Compact UI with `markdown-compact` styling (`text-xs`, tighter spacing)
- Shows Lottie avatar + chat bubble; max bubble height `380px`
- Hides on blur, shown/hidden via tray icon click

### 2. Settings Window (`settings-main.tsx` → `settings.tsx`)

- Standard window with sidebar navigation (General, Connection, Agents, Logs, About)
- Manages gateway connection, session CRUD, and display settings

### 3. Chat Window (`chat-main.tsx` → `chat.tsx`)

- Full-screen chat history viewer
- Rich markdown with syntax highlighting (atomOneDark/Light) and math (KaTeX)
- Usage statistics: tokens, cost, model info
- Handles all message types: user, assistant, toolCall, toolResult

**Inter-window communication** — Tauri events:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `session-changed` | main → chat | Active session switched |
| `session-messages-updated` | main → chat | New message appended |
| `chat-window-ready` | chat → main | Chat window loaded, request sync |
| `chat-window-closed` | chat → main | Chat window closed |
| `gateway-settings-changed` | settings → main | Connection config updated |

## Hook Architecture (Three-Layer Design)

```
useMultiSessionOpenClaw  ← pages use this
    ├─ useSessionManager
    │   └─ src/lib/session-manager.ts  (Tauri Store)
    │
    └─ useOpenClaw
        └─ src/lib/device-identity.ts  (Ed25519 auth)
```

| Hook | Responsibility |
|------|---------------|
| `useOpenClaw` | WebSocket lifecycle, frame parsing, device authentication |
| `useSessionManager` | Session CRUD, active session tracking, Tauri Store persistence |
| `useMultiSessionOpenClaw` | Combines both; message history per session, auto-switching, desktop notifications |

## OpenClaw Gateway Integration

### Connection Flow

1. Gateway sends `connect.challenge` event with a nonce
2. Client builds device payload `{ deviceId, signature, token, timestamp }` using Ed25519
3. Client sends `connect` request with signed auth
4. Gateway responds with `hello-ok` and optional `deviceToken`
5. Subsequent requests use the cached `deviceToken`

### Device Approval

On first connection, the gateway must approve the device:

```bash
openclaw devices approve
```

The device ID (UUID) and Ed25519 public key are stored in Tauri Store under `device_identity`.

### WebSocket Frame Types

| Type | Direction | Description |
|------|-----------|-------------|
| `req` | Client → Gateway | Method + params (e.g. `chat.send`, `chat.history`, `sessions.list`, `sessions.delete`) |
| `res` | Gateway → Client | `{ ok: true, payload }` or `{ ok: false, error }` |
| `event` | Gateway → Client | Server-push: `connect.challenge`, `agent` (streaming text), `chat` (final state) |

### Streaming Flow

1. User sends message → `isStreaming = true`
2. `agent` events arrive with cumulative `text` → append/update assistant message (`isFinal = false`)
3. `chat` event with `state = 'final'` → mark message final, `isStreaming = false`

**Loading indicator**: Show dots only when `isStreaming=true` AND no in-progress assistant message (`isFinal=false`) exists — i.e., waiting for the first output token.

## Session Management

### Session Types

| Type | Key format | Notes |
|------|-----------|-------|
| `main` | `agent:main:main` | Default daily chat; cannot be deleted |
| `task` | `agent:main:{UUID}` | User-created; can be deleted |

### Auto-Switch Polling (every 10 s)

1. For each non-active session, fetch its last message via `chat.history` (limit=1)
2. Compare timestamp with cached timestamp
3. If a newer assistant message is found → send desktop notification + switch to that session
4. Only one switch per poll cycle

## State Persistence

All state stored via `@tauri-apps/plugin-store`:

| Key | Content |
|-----|---------|
| `openclaw_sessions` | Session configs array |
| `openclaw_active_session` | Active session ID |
| `session_messages_{sessionId}` | Message history per session |
| `device_identity` | Ed25519 keypair + device UUID |
| `settings` | Gateway URL + token |

**Migration**: `migrateFromLocalStorage()` moves legacy data from `localStorage` to Tauri Store on first run.

## UI Components

Based on shadcn/ui (Radix UI + Tailwind CSS v4):

- **`TalonAvatar`**: Lottie animation — states: idle, thinking, speaking, error
- **`MessageBubble`**: Renders all message types with structured content blocks; collapses tool results
- **`Markdown`**: Two variants — default (chat window, normal sizing) and compact (main window, `text-xs`)

### Window Height Constraints (Main Window)

Nested flex containers — the `min-h-0` is critical for correct scroll behaviour:

```
outer container       flex flex-col h-full
  bubble              max-h-[380px]
    content-wrapper   flex-1 min-h-0          ← allows shrinking below content
      messages area   flex-1 min-h-0 overflow-y-auto
```

### Auto-Scroll (Chat Window)

- Tracks whether user is within 150 px of the bottom ("near bottom")
- Only auto-scrolls if: user sent a message OR user is already near the bottom
- Uses `smooth` scroll during streaming to reduce jitter
- Does not interrupt users browsing history

## macOS-Specific

- `macOSPrivateApi: true` for transparent + always-on-top window features
- Window floats above fullscreen apps via `NSStatusWindowLevel`
- Tray icon in menu bar — click toggles main window visibility
- Window flags: `alwaysOnTop`, `visibleOnAllWorkspaces`, `skipTaskbar`, `acceptFirstMouse`
- Hides automatically on blur
- Window position calculated at runtime: screen size − window size − 20 px margin

## Adding a New Window

1. Create HTML entry point (e.g. `newwindow.html`)
2. Create React entry point (e.g. `src/newwindow-main.tsx`)
3. Add window config to `src-tauri/tauri.conf.json`
4. Add window label to `src-tauri/capabilities/default.json`
5. Add opener helper to `src/lib/windows.ts`
6. Implement page component in `src/pages/`

## Adding a Gateway API Call

1. Add a method to `useOpenClaw` using `callGateway(method, params)`
2. Define TypeScript request/response types in `src/types/`
3. Expose the method via the hook's return object
4. Consume in `useMultiSessionOpenClaw` or directly in a page
