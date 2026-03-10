# Talon Architecture

## Overview

Talon is a desktop AI assistant built with Tauri 2 + React. It provides a floating always-on-top chat interface that connects to an OpenClaw Gateway via WebSocket for AI conversation, supporting multiple sessions, system notifications, and auto-switching to sessions with new messages.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop**: Tauri 2.0
- **Styling**: Tailwind CSS 4.x + shadcn/ui (Radix UI)
- **Animation**: Lottie (DotLottie format)
- **AI Backend**: OpenClaw WebSocket Gateway (ws://127.0.0.1:18789)
- **State Management**: React hooks + Tauri Store (plugin-store)
- **Auth**: Ed25519 keypair signing

## Project Structure

```
talon/
├── src/
│   ├── components/
│   │   ├── markdown.tsx          # Markdown renderer (default + compact variants)
│   │   ├── message-bubble.tsx    # Message display (user/assistant/toolCall/toolResult)
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
│   │   └── settings.tsx          # Settings window UI
│   ├── store/
│   │   └── atoms.ts              # Shared state atoms
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
└── public/
```

## Multi-Window System

The app uses three separate Tauri windows with shared state via Tauri events:

### 1. Main Window (`main.tsx` → `app.tsx`)

- Floating, transparent, always-on-top assistant (450×420px)
- Positioned at bottom-right corner dynamically
- Compact UI with `markdown-compact` styling
- Shows avatar (Lottie animation) + chat bubble
- Hides on blur, shown via tray icon click

### 2. Settings Window (`settings-main.tsx` → `settings.tsx`)

- Standard window with sidebar navigation
- Manages gateway connection, sessions, and API keys
- Session CRUD operations (create/delete/switch)

### 3. Chat Window (`chat-main.tsx` → `chat.tsx`)

- Full-screen chat history viewer
- Rich markdown with syntax highlighting and math (KaTeX)
- Usage statistics (tokens, cost, model info)
- Handles all message types: user, assistant, toolCall, toolResult

**Inter-window communication**: Tauri events — `session-changed`, `session-messages-updated`, `chat-window-ready`, `chat-window-closed`.

## Hook Architecture (Three-Layer Design)

```
useMultiSessionOpenClaw  ← pages use this
    ├─ useSessionManager
    │   └─ src/lib/session-manager.ts  (Tauri Store)
    │
    └─ useOpenClaw
        └─ src/lib/device-identity.ts  (Ed25519 auth)
```

| Hook                      | Responsibility                                                            |
| ------------------------- | ------------------------------------------------------------------------- |
| `useOpenClaw`             | WebSocket connection, frame handling, device authentication               |
| `useSessionManager`       | Session CRUD, active session tracking, Tauri Store persistence            |
| `useMultiSessionOpenClaw` | Combines both; message history per session, auto-switching, notifications |

## OpenClaw Gateway Integration

### Connection Flow

1. Gateway sends `connect.challenge` with a nonce
2. Client builds device payload (deviceId, signature, token) using Ed25519
3. Client sends `connect` request with signed auth
4. Gateway responds with `hello-ok` and optional `deviceToken`

### WebSocket Frame Types

- **`req`**: Client → Gateway (e.g. `chat.send`, `chat.history`, `sessions.list`)
- **`res`**: Gateway → Client (ok + payload, or error)
- **`event`**: Server-push (e.g. `agent`, `chat` for streaming; `connect.challenge` for auth)

### Streaming Flow

1. User sends message → `isStreaming = true`
2. `agent` events arrive with cumulative `text` → `updateAssistantMessage(prev, text, false)` (isFinal=false)
3. `chat` event with `state='final'` → `markLastMessageFinal`, `isStreaming = false`

**Loading indicator logic**: Show dots only when `isStreaming=true` AND no in-progress assistant message (`isFinal=false`) exists yet — i.e. waiting for the first output token.

## Session Management

**Session types**:

- `main` — Default daily chat (cannot be deleted), key: `agent:main:main`
- `task` — User-created sessions, key: `agent:main:{UUID}`

**Auto-switch polling** (every 10s):

- Fetch last message from each non-active session via `chat.history` (limit=1)
- If newer assistant message found → send desktop notification + switch session
- Only switches to one session per poll cycle

## State Persistence

All state stored via `@tauri-apps/plugin-store`:

| Key                            | Content                       |
| ------------------------------ | ----------------------------- |
| `openclaw_sessions`            | Session configs array         |
| `openclaw_active_session`      | Active session ID             |
| `session_messages_{sessionId}` | Message history per session   |
| `device_identity`              | Ed25519 keypair + device UUID |
| `settings`                     | Gateway URL + token           |

## UI Components

Based on shadcn/ui (Radix UI + Tailwind CSS v4):

- **`TalonAvatar`**: Lottie animation with state variants (idle, thinking, speaking, error)
- **`MessageBubble`**: Renders all message types with structured content blocks
- **`Markdown`**: Two variants — default (chat window) and compact (main window, `text-xs`)

## macOS-Specific

- `macOSPrivateApi: true` for transparent + always-on-top window features
- Window floats above fullscreen apps via `NSStatusWindowLevel`
- Tray icon in menu bar: click to show/hide main window (popover behavior)
- Window flags: `alwaysOnTop`, `visibleOnAllWorkspaces`, `skipTaskbar`, `acceptFirstMouse`
- Hides automatically on blur
