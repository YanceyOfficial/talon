# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Talon is a desktop AI assistant built with Tauri 2 + React. It provides a floating always-on-top chat interface that connects to an OpenClaw Gateway via WebSocket for AI conversation. The app supports multiple sessions (task-based contexts), system notifications, and auto-switching to sessions with new messages.

## Development Commands

```bash
# Development (runs Vite dev server + Tauri)
pnpm dev

# Build frontend + Tauri app
pnpm build

# Format code (Prettier with import organization and Tailwind sorting)
pnpm format

# Lint (ESLint with TypeScript support)
pnpm lint

# Tauri commands
pnpm tauri dev          # Start dev mode
pnpm tauri build        # Build production app
pnpm tauri icon         # Generate app icons
```

## Architecture

### Multi-Window System

The app uses three separate Tauri windows with shared state via Tauri events:

1. **Main Window** (`main.tsx` → `app.tsx`)
   - Floating, transparent, always-on-top assistant (450x420px)
   - Positioned at bottom-right corner dynamically
   - Compact UI with markdown-compact styling
   - Shows avatar (Lottie animation) + chat bubble

2. **Settings Window** (`settings-main.tsx` → `settings.tsx`)
   - Standard window with sidebar navigation
   - Manages gateway connection, sessions, and API keys
   - Session CRUD operations (create/delete/switch)

3. **Chat Window** (`chat-main.tsx` → `chat.tsx`)
   - Full-screen chat history viewer
   - Rich markdown rendering with syntax highlighting, math (KaTeX)
   - Usage statistics (tokens, cost, model info)
   - Handles multiple message types: user, assistant, toolCall, toolResult

**Inter-window communication**: Uses Tauri events (`session-changed`, `session-messages-updated`, `chat-window-ready`, `chat-window-closed`) for state synchronization.

### Hook Architecture (Three-Layer Design)

The application uses a layered hook architecture for state management:

```
useMultiSessionOpenClaw (top layer - pages use this)
    ├─ useSessionManager (local session config/CRUD)
    │   └─ src/lib/session-manager.ts (persistence via Tauri Store)
    │
    └─ useOpenClaw (WebSocket connection to Gateway)
        └─ Device identity (Ed25519 signing for auth)
```

**Key responsibilities**:

- `useOpenClaw`: WebSocket connection, frame handling (req/res/event), device authentication
- `useSessionManager`: Local session CRUD, active session tracking, Tauri Store persistence
- `useMultiSessionOpenClaw`: Integrates both, manages message history per session, auto-switching, notifications

### OpenClaw Gateway Integration

**Connection flow**:

1. Gateway sends `connect.challenge` event with nonce
2. Client builds device payload (deviceId, signature, token) using Ed25519
3. Client sends `connect` request with signed auth
4. Gateway responds with `hello-ok` and optional deviceToken

**Message format**: WebSocket frames with `type` field:

- `req` (request): method + params (e.g., `chat.send`, `chat.history`, `sessions.list`, `sessions.delete`)
- `res` (response): ok + payload or error
- `event` (server-push): event name + payload (e.g., `agent`, `chat` for streaming)

**Streaming**: Assistant responses come via `agent` events with cumulative `text`. Final message marked with `chat` event state=`final`.

**Session keys**: Format `agent:main:UUID`. Main session uses `agent:main:main`, tasks use UUID-based keys.

### Session Management

**Session types**:

- `main`: Default daily chat (cannot be deleted)
- `task`: User-created sessions for specific contexts (e.g., Gmail monitoring, project tasks)

**Multi-session features**:

- Each session has independent message history (stored in Tauri Store)
- Auto-switch: Polling every 10 seconds checks all sessions for new messages, switches to session with newest assistant message
- System notifications: Desktop notifications for new messages (both active and background sessions)
- Gateway sync: Sessions created locally also send initialization message to Gateway to establish session

### State Persistence

Uses `@tauri-apps/plugin-store` for persistent storage:

- Session configs: `openclaw_sessions` key
- Active session ID: `openclaw_active_session` key
- Message history per session: `session_messages_{sessionId}` keys
- Device identity: `device_identity` key (Ed25519 keypair)
- Gateway settings: `settings` key (URL, token)

**Migration**: Includes `migrateFromLocalStorage()` to move data from localStorage to Tauri Store.

### Device Identity & Authentication

Client generates Ed25519 keypair on first run:

- Private key: Used to sign auth payloads
- Public key: Sent to Gateway for verification
- Device ID: UUID identifying this client
- Signature: Signs payload containing deviceId, nonce, timestamp, token
- Token: Shared secret or device-specific token (from Gateway or settings)

Auth tokens cached with scope: `{deviceId}:{role}:{scope}` → stored in Tauri Store.

### Markdown Rendering

Two variants:

- **Default** (`markdown`): Used in chat window, normal sizing
- **Compact** (`markdown-compact`): Used in main window, smaller fonts (text-xs), tighter spacing

Features: GFM, math (KaTeX), syntax highlighting (atomOneDark/Light), frontmatter extraction, copy buttons on code blocks.

### UI Components

Based on shadcn/ui (Radix UI + Tailwind CSS v4). Key customizations:

- `TalonAvatar`: Lottie animation with state-based variants (idle, thinking, speaking, error)
- `MessageBubble`: Handles different message types (user, assistant, toolCall, toolResult) with structured content blocks
- Compact styling for main window: smaller fonts, reduced spacing, `max-h-[380px]` bubble constraint

## Key Files

### Frontend

- `src/hooks/use-multi-session.ts` - Top-level hook combining session + messaging
- `src/hooks/use-open-claw.ts` - WebSocket connection and frame handling
- `src/hooks/use-session-manager.ts` - Session CRUD operations
- `src/lib/session-manager.ts` - Session persistence logic
- `src/lib/device-identity.ts` - Ed25519 signing and device auth
- `src/lib/notification.ts` - System notification helpers
- `src/lib/windows.ts` - Multi-window management
- `src/lib/store.ts` - Tauri Store wrapper with migration
- `src/types/openclaw.ts` - OpenClaw Gateway types
- `src/types/session.ts` - Session configuration types

### Backend (Rust)

- `src-tauri/src/lib.rs` - Tauri commands, tray icon, window positioning
- `src-tauri/tauri.conf.json` - Window config, permissions, plugins
- `src-tauri/capabilities/default.json` - Permission capabilities

## Critical Implementation Details

### Loading State

The orange loading dots have two phases:

1. **Waiting for first token** (`isStreaming=true`, no in-progress assistant message): show dots
2. **Tokens flowing** (`isStreaming=true`, assistant message with `isFinal=false` exists): hide dots

Implemented via `isWaitingForFirstToken` in `app.tsx`:
```ts
const isWaitingForFirstToken =
  isStreaming &&
  !openClawMessages.some(
    (msg) => msg.role === MessageRole.ASSISTANT && !msg.isFinal
  )
```

When switching sessions, always reset `isStreaming` state to `false` in `switchToSession()` to prevent stuck loading indicators.

### Window Height Constraints

Main window uses nested flex containers. For scrolling to work:

- Outer bubble: `max-h-[380px]` (matches window height minus padding)
- Content wrapper: `flex-1 min-h-0` (NOT `h-full`)
- Messages area: `flex-1 min-h-0 overflow-y-auto`

The `min-h-0` is critical - it allows flex items to shrink below content size, enabling overflow.

### Auto-Scroll Behavior

Chat window implements smart auto-scroll:

- Tracks user scroll position (within 150px of bottom = "near bottom")
- Only auto-scrolls if: user sent message OR user is at bottom
- Uses `smooth` scroll during streaming to reduce jitter
- Prevents disrupting users browsing history after initial load

### Session Deletion

Two-step process:

1. Delete from Gateway: WebSocket `sessions.delete` with `key` (sessionKey) and `deleteTranscript: true`
2. Delete locally: Remove from Tauri Store, clear cached messages, switch to main if was active

### Notification Permission

Request on app mount. macOS requires `notification:default` permission in capabilities. Notifications show message preview (80 char limit).

## Common Patterns

### Creating a New Window

1. Add HTML entry point (e.g., `chat.html`)
2. Create React entry point (e.g., `chat-main.tsx`)
3. Add window config to `tauri.conf.json`
4. Add window label to `capabilities/default.json`
5. Create window opener in `src/lib/windows.ts`
6. Implement page component in `src/pages/`

### Adding a Gateway API Call

1. Add method to `useOpenClaw` using `callGateway(method, params)`
2. Define TypeScript types for request/response
3. Expose method in hook return object
4. Use in `useMultiSessionOpenClaw` or pages

### Session Auto-Switch Logic

Polling happens in `useMultiSessionOpenClaw`:

- Every 10s, fetch last message from each non-active session via `chat.history` with limit=1
- Compare timestamp with cached message timestamp
- If newer assistant message found: send notification + switch to that session
- Only switches to one session per poll cycle

## Configuration Files

- `tailwind.config.js` - Tailwind CSS v4 config
- `tsconfig.json` - TypeScript config with path aliases (`@/*` → `src/*`)
- `vite.config.ts` - Vite config with React plugin
- `eslint.config.js` - ESLint flat config with TypeScript rules
- `.prettierrc` - Prettier with plugin order: organize-imports, tailwindcss

## macOS-Specific

- Uses `macOSPrivateApi: true` for window features
- Window positioning calculated dynamically based on screen size (bottom-right with 20px margin)
- Tray icon in menu bar with connection status indicator
- Window flags: `alwaysOnTop`, `visibleOnAllWorkspaces`, `skipTaskbar`, `acceptFirstMouse`
