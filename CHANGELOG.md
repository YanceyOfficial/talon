# Changelog

All notable changes to Talon will be documented in this file.

---

## [Unreleased]

### Changed - March 2026

#### Loading Indicator Improvement

- **Hide dots on first token**: Loading dots (orange) now disappear as soon as the first output token arrives, instead of waiting for the full response to complete
- Uses `isFinal=false` on the streaming assistant message to detect when tokens have started flowing

---

## [0.3.0] - February 2026

### Rename: Clippy → Talon

- Project renamed from Clippy to Talon across all files, configs, and documentation
- Updated app identifier, window titles, and branding

### Added

#### Hide on Blur

- Main window automatically hides when it loses focus
- Tray icon click brings it back (menubar popover behavior)
- Window floats above fullscreen apps via `NSStatusWindowLevel`

#### Multi-Session Support

- Multiple named sessions (main + user-created tasks)
- Independent message history per session stored in Tauri Store
- Auto-switch: polls every 10s, switches to session with newest unread assistant message
- Desktop notifications for messages in background sessions

#### Settings Window

- Separate settings window with sidebar navigation
- Gateway connection configuration (URL + token)
- Session management: create, rename, delete sessions
- API key management

#### Chat History Window

- Full-screen chat history viewer
- Rich markdown rendering: GFM, syntax highlighting (atomOneDark/Light), math (KaTeX)
- Usage statistics: token counts, cost, model info
- Handles all message types: user, assistant, toolCall, toolResult

#### Device Authentication

- Ed25519 keypair generated on first run
- Signed auth payload for Gateway challenge-response flow
- Device tokens cached in Tauri Store with scope keys

---

## [0.2.0] - February 2026

### Added

#### System Tray (Menubar) Integration

- Tray icon in macOS menubar with connection status indicator (green/yellow/red)
- Click tray icon to show/hide main window
- App runs hidden in menubar when window is closed

#### Dark / Light Theme

- Automatic theme detection from system preference
- Manual toggle available in settings
- Uses Tailwind CSS v4 dark mode classes

#### Tauri Store Persistence

- Migrated from `localStorage` to `@tauri-apps/plugin-store`
- All session configs, message history, and device identity stored persistently
- `migrateFromLocalStorage()` utility for upgrades

#### Multi-Window Architecture

- Three independent Tauri windows: main, settings, chat
- Inter-window communication via Tauri events
- Shared state synchronized across windows

---

## [0.1.0] - February 2026

### Added

#### Core Features

- **Tauri Desktop App**: Frameless, transparent, always-on-top floating window
- **Lottie Avatar**: DotLottie animation with state-based variants (idle, thinking, speaking, error)
- **OpenClaw Gateway**: WebSocket connection with streaming assistant responses
- **Chat Interface**: Message bubbles, loading indicator, auto-scroll
- **Session Management**: Local session CRUD with Tauri Store persistence
- **Auto-reconnect**: Reconnects to Gateway on connection drop
- **Visible on all Spaces**: `visibleOnAllWorkspaces` flag so window follows across macOS desktops

#### Components

- `TalonAvatar`: Animated avatar with Lottie state variants
- `MessageBubble`: Renders user/assistant/toolCall/toolResult messages
- `Markdown`: GFM markdown renderer with compact variant for main window
- `useOpenClaw`: WebSocket hook with auth, streaming, and session routing
- `useSessionManager`: Session CRUD with Tauri Store persistence
- `useMultiSessionOpenClaw`: Top-level hook combining sessions + messaging

---

## Technical Stack

- **Frontend**: React 19 + TypeScript
- **Desktop**: Tauri 2.0
- **Styling**: Tailwind CSS 4.x + shadcn/ui
- **Animation**: DotLottie (Lottie Files)
- **AI Backend**: OpenClaw WebSocket Gateway
- **Auth**: Ed25519 (noble-ed25519)
- **Build**: Vite + pnpm

---

_This changelog follows [Keep a Changelog](https://keepachangelog.com/) format._
