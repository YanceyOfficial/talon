# Changelog

All notable changes to Talon will be documented in this file.

---

## [1.5.0](https://github.com/YanceyOfficial/talon/compare/v1.4.3...v1.5.0) (2026-03-11)


### Features

* release new icon ([154131f](https://github.com/YanceyOfficial/talon/commit/154131f2d4c858f7e411b91a976d1a6462140874))
* release new icon ([d01c8aa](https://github.com/YanceyOfficial/talon/commit/d01c8aafa512523505c71ff63d01489770b32ef2))

## [1.4.3](https://github.com/YanceyOfficial/talon/compare/v1.4.2...v1.4.3) (2026-03-10)


### Bug Fixes

* fine-tune caret overlap to 0.5px ([db805a1](https://github.com/YanceyOfficial/talon/commit/db805a1f93ce41a118bc4b734d3d1bd4be3c3cde))
* make caret visually merge with widget card ([d941627](https://github.com/YanceyOfficial/talon/commit/d94162769d424850c0f927e44ec4320ea829e954))
* match caret opacity to card and lighten textarea background ([ef52882](https://github.com/YanceyOfficial/talon/commit/ef5288216fa0fd760cb66e1402c8267223c2a74c))

## [1.4.2](https://github.com/YanceyOfficial/talon/compare/v1.4.1...v1.4.2) (2026-03-10)


### Bug Fixes

* enable native window shadow for settings and chat windows ([2caddec](https://github.com/YanceyOfficial/talon/commit/2caddec7762fa03749cc805a22fe570e6939712e))

## [1.4.1](https://github.com/YanceyOfficial/talon/compare/v1.4.0...v1.4.1) (2026-03-10)


### Bug Fixes

* friendly error when no release published yet, clean up publish workflow ([7589d18](https://github.com/YanceyOfficial/talon/commit/7589d18e17de02aa76b85353bc7adaee3ab03e07))

## [1.4.0](https://github.com/YanceyOfficial/talon/compare/v1.3.0...v1.4.0) (2026-03-10)


### Features

* add auto-update via GitHub releases + refactor settings into tabs ([8aa65dc](https://github.com/YanceyOfficial/talon/commit/8aa65dc7fa16c2ad599742db6a1d9dba4413036d))
* add gateway session label support for better display names ([88afd0a](https://github.com/YanceyOfficial/talon/commit/88afd0a54df6679817d23adab55876d1b8d33177))
* add logs tab in settings + fix theme sync across all windows ([b0f116a](https://github.com/YanceyOfficial/talon/commit/b0f116ad0f61e7ca678f3e6b66674062bd5e9660))
* add system tray, dark widget redesign, and light/dark theme support ([65da540](https://github.com/YanceyOfficial/talon/commit/65da54051e22e3b04a2419263b536a38acccaa50))
* bind main panel to tray icon (menubar popover behavior) ([58efc2e](https://github.com/YanceyOfficial/talon/commit/58efc2ecd171aae56a56e2e05e0d9abbdad83365))
* float panel above fullscreen apps via NSStatusWindowLevel ([49f8b7a](https://github.com/YanceyOfficial/talon/commit/49f8b7a83677aa7dc6e83e8addbcf4ef2ca1001a))
* hide when blur ([9821603](https://github.com/YanceyOfficial/talon/commit/982160348d9d0cb2446321c253bd573cfde49092))
* hide when blur ([af57923](https://github.com/YanceyOfficial/talon/commit/af5792305f90b81b5a3366b6884592d3ea89d888))
* hide when blur ([7c96436](https://github.com/YanceyOfficial/talon/commit/7c96436479a3561c03c7d5a123807b88d9b812c6))
* hide when blur ([22c9a60](https://github.com/YanceyOfficial/talon/commit/22c9a600642092dd7c51476c1e8afc02ca326cf9))
* remove system tray and fix Lottie WASM in production build ([bb31968](https://github.com/YanceyOfficial/talon/commit/bb3196834641535bdf06eb9204b19057cc17a995))
* route WebSocket events by sessionKey and auto-switch on background session completion ([dde63f0](https://github.com/YanceyOfficial/talon/commit/dde63f028827f1a2a79776b328467d7235f67fad))
* show dev-tools in production env ([abf8746](https://github.com/YanceyOfficial/talon/commit/abf87460f753ff8ac85dd0ed95491f1a3275d6dc))
* update styles ([451bedf](https://github.com/YanceyOfficial/talon/commit/451bedf157f31ef5c48bc43bae3dc3bd380f29b1))


### Bug Fixes

* auto-switch to any background session key, including cron sub-sessions ([9146efb](https://github.com/YanceyOfficial/talon/commit/9146efb5d9bf7402dd76caff0a80d7f46e113f30))
* distinguish log/debug badges and improve scroll-to-bottom button ([9e4ba9d](https://github.com/YanceyOfficial/talon/commit/9e4ba9d203401683dafdbe0f0c48a19a6132b506))
* update types ([d17addd](https://github.com/YanceyOfficial/talon/commit/d17addd3e139b11af718232f529332d36038cc0f))

## [1.3.0](https://github.com/YanceyOfficial/talon/compare/talon-v1.2.0...talon-v1.3.0) (2026-03-10)

### Features

- add auto-update via GitHub releases + refactor settings into tabs ([8aa65dc](https://github.com/YanceyOfficial/talon/commit/8aa65dc7fa16c2ad599742db6a1d9dba4413036d))
- add gateway session label support for better display names ([88afd0a](https://github.com/YanceyOfficial/talon/commit/88afd0a54df6679817d23adab55876d1b8d33177))
- add system tray, dark widget redesign, and light/dark theme support ([65da540](https://github.com/YanceyOfficial/talon/commit/65da54051e22e3b04a2419263b536a38acccaa50))
- bind main panel to tray icon (menubar popover behavior) ([58efc2e](https://github.com/YanceyOfficial/talon/commit/58efc2ecd171aae56a56e2e05e0d9abbdad83365))
- float panel above fullscreen apps via NSStatusWindowLevel ([49f8b7a](https://github.com/YanceyOfficial/talon/commit/49f8b7a83677aa7dc6e83e8addbcf4ef2ca1001a))
- hide when blur ([9821603](https://github.com/YanceyOfficial/talon/commit/982160348d9d0cb2446321c253bd573cfde49092))
- hide when blur ([af57923](https://github.com/YanceyOfficial/talon/commit/af5792305f90b81b5a3366b6884592d3ea89d888))
- hide when blur ([7c96436](https://github.com/YanceyOfficial/talon/commit/7c96436479a3561c03c7d5a123807b88d9b812c6))
- hide when blur ([22c9a60](https://github.com/YanceyOfficial/talon/commit/22c9a600642092dd7c51476c1e8afc02ca326cf9))
- remove system tray and fix Lottie WASM in production build ([bb31968](https://github.com/YanceyOfficial/talon/commit/bb3196834641535bdf06eb9204b19057cc17a995))
- route WebSocket events by sessionKey and auto-switch on background session completion ([dde63f0](https://github.com/YanceyOfficial/talon/commit/dde63f028827f1a2a79776b328467d7235f67fad))
- show dev-tools in production env ([abf8746](https://github.com/YanceyOfficial/talon/commit/abf87460f753ff8ac85dd0ed95491f1a3275d6dc))
- update styles ([451bedf](https://github.com/YanceyOfficial/talon/commit/451bedf157f31ef5c48bc43bae3dc3bd380f29b1))

### Bug Fixes

- auto-switch to any background session key, including cron sub-sessions ([9146efb](https://github.com/YanceyOfficial/talon/commit/9146efb5d9bf7402dd76caff0a80d7f46e113f30))
- update types ([d17addd](https://github.com/YanceyOfficial/talon/commit/d17addd3e139b11af718232f529332d36038cc0f))

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
