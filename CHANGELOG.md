# Changelog

All notable changes to Talon will be documented in this file.

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
