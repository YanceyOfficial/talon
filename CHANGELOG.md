# Changelog

All notable changes to Talon will be documented in this file.

## 1.0.0 (2026-03-09)


### Features

* add gateway session label support for better display names ([88afd0a](https://github.com/YanceyOfficial/talon/commit/88afd0a54df6679817d23adab55876d1b8d33177))
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

## [Unreleased]

### Changed - February 15, 2026

#### Status Indicator Moved to Menubar

- **Removed from window**: Status dot no longer displayed on Talon avatar
- **Added to menubar**: Connection status shown in menubar menu
- **Menu structure**: Status displayed as first item (🟢/🟡/🔴)
- **Real-time updates**: Event-driven updates from frontend to backend
- **Cleaner UI**: Window now shows only Talon and chat bubble

### Added - February 14, 2026

#### Transparent Window Design

- **Removed white background**: Window is now fully transparent
- **Smart backgrounds**: Only chat panel has background (white/95% opacity + blur)
- **Floating design**: Talon avatar appears to float on desktop
- **Status indicator**: Small dot in top-left corner (green/yellow/red)
- **Improved visuals**: Refined message bubbles, shadows, and spacing

#### System Tray (Menubar) Integration

- **Menubar icon**: Talon icon appears in macOS menubar
- **Click to toggle**: Left-click icon to show/hide window
- **Context menu**: Right-click for options:
  - Show Talon
  - Hide Talon
  - Quit
- **Background operation**: App can run hidden in menubar

#### All Desktop Spaces Support

- **visibleOnAllWorkspaces**: Window visible on all macOS Spaces
- **Always on top**: Stays above all other windows
- **Hidden from Dock**: Doesn't appear in Dock or Cmd+Tab

#### UI Improvements

- **Purple gradient header**: Chat panel header with gradient
- **Better shadows**: Enhanced depth with proper drop shadows
- **Focus effects**: Input box has purple focus ring
- **Refined spacing**: Tighter, more polished layout
- **Larger avatar**: Increased from 120px to 140px

### Changed - February 14, 2026

#### Styling Migration to Tailwind CSS

- **Converted all CSS**: Migrated from custom CSS to Tailwind utilities
- **Deleted CSS files**: Removed `ChatBubble.css` and `InputBox.css`
- **Minimal custom CSS**: Only 60 lines for animations
- **Consistent styling**: All components use utility-first approach

#### Window Configuration

- **Added label**: Window labeled as "main" for Tauri 2.0
- **Increased height**: Changed from 400px to 450px for better chat view
- **Skip taskbar**: Window doesn't appear in system task switcher

### Technical

#### Rust Backend

- **System tray setup**: `setup_tray()` function in lib.rs
- **New commands**:
  - `toggle_window`: Show/hide window
  - `show_window`: Show and focus window
  - `hide_window`: Hide window
- **Menu handling**: Event handlers for tray menu items
- **Click handling**: Left-click tray icon to toggle

#### Dependencies

- Added: `@tauri-apps/plugin-shell` (for future features)
- Already had: `tauri` with `tray-icon` feature

---

## [0.1.0] - February 14, 2026

### Added

#### Core Features

- **Tauri Desktop App**: Small, frameless, transparent window
- **Lottie Animation**: DotLottie format (11KB) with state management
- **OpenClaw Integration**: WebSocket connection to local gateway
- **Chat Interface**: Message bubbles, typing indicator, auto-scroll
- **Window Dragging**: Magnetic snap to screen edges
- **Auto-reconnect**: Reconnects to OpenClaw if connection drops

#### Components

- `TalonAvatar`: Animated Talon with state-based animations
- `ChatBubble`: Message display with user/assistant distinction
- `InputBox`: Text input with auto-resize and Enter to send
- `useOpenClaw`: WebSocket hook for OpenClaw connection
- `useWindowDrag`: Hook for draggable window with snap

#### Documentation

- `README.md`: Project overview and setup guide
- `ARCHITECTURE.md`: Technical architecture details
- `QUICKSTART.md`: Step-by-step setup instructions
- `OPENCLAW_INTEGRATION.md`: OpenClaw integration guide
- `CURRENT_STATUS.md`: Current implementation status
- `TAILWIND_MIGRATION.md`: Styling migration documentation
- `TRANSPARENT_DESIGN.md`: Transparent window design guide

---

## Technical Stack

- **Frontend**: React 19 + TypeScript
- **Desktop**: Tauri 2.0
- **Styling**: Tailwind CSS 4.x
- **Animation**: DotLottie (Lottie Files)
- **AI Backend**: OpenClaw WebSocket Gateway
- **Build**: Vite + pnpm

---

## Migration Notes

### From 0.0.0 to 0.1.0

**Styling**: If upgrading, remove all custom CSS imports and use Tailwind classes instead.

**Window Management**:

- Window now uses `label: "main"` instead of implicit ID
- Added `visibleOnAllWorkspaces` and `skipTaskbar` properties

**System Tray**:

- App now runs in menubar
- Use menubar to show/hide window instead of minimizing

---

## Known Issues

### Current

- Bundle size warning (870KB) - considered acceptable for Lottie app
- Peer dependency warnings with React 19 - cosmetic only

### Fixed

- TypeScript error with `NodeJS.Timeout` → changed to `number`
- Missing window label → added `label: "main"`

---

## Roadmap

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed roadmap.

### Phase 2: Task Management (Planned)

- Background task execution
- Task queue visualization
- System notifications on completion
- Cron job integration

### Phase 3: Advanced Features (Future)

- Voice input
- Custom skills integration
- Settings panel
- Multi-monitor support
- Themes (light/dark)

---

## Credits

- **Original Talon**: Microsoft Office Assistant
- **AI Backend**: [OpenClaw](https://openclaw.ai/)
- **Lottie Animation**: Microsoft Talon Lottie files
- **Development**: Yancey Leo + Claude Sonnet 4.5

---

_This changelog follows [Keep a Changelog](https://keepachangelog.com/) format._
