# Clippy Architecture

## Overview

A desktop AI assistant inspired by Microsoft Office Clippy, powered by OpenClaw.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri 2.0
- **Styling**: Tailwind CSS 4.x (utility-first CSS framework)
- **Animation**: Lottie (DotLottie format - 11KB)
- **AI Backend**: OpenClaw WebSocket Gateway (ws://127.0.0.1:18789)
- **State Management**: React hooks (simple for Phase 1)

## Project Structure

```
clippy/
├── src/
│   ├── components/
│   │   ├── ClippyAvatar.tsx      # Lottie animation controller
│   │   ├── ChatBubble.tsx        # Message display
│   │   ├── InputBox.tsx          # User input
│   │   └── DragHandle.tsx        # Window drag functionality
│   ├── hooks/
│   │   ├── useOpenClaw.ts        # WebSocket connection to OpenClaw
│   │   ├── useWindowDrag.ts      # Draggable window with snap
│   │   └── useAudioFeedback.ts   # Sound effects
│   ├── types/
│   │   └── openclaw.ts           # OpenClaw message types
│   ├── utils/
│   │   ├── windowSnap.ts         # Magnetic snap to edges
│   │   └── animations.ts         # Animation state mapping
│   └── assets/
│       ├── Clippy.lottie         # Main animation (use this one!)
│       └── sounds/               # Sound effects
├── src-tauri/
│   └── src/
│       └── lib.rs                # Tauri commands for window control
└── docs/
    └── ANIMATIONS.md             # Animation segments documentation
```

## Phase 1: Simple Chat (Current)

### Features

- ✅ Small, draggable, always-on-top window (200x300)
- ✅ Transparent background with Clippy avatar
- ✅ Simple text input + send button
- ✅ Connect to OpenClaw Gateway via WebSocket
- ✅ Display chat messages
- ✅ Animation states: idle, thinking, speaking
- ✅ Magnetic snap to screen edges (right/bottom preferred)

### Animation States

```typescript
enum ClippyState {
  IDLE, // Default waiting animation
  LISTENING, // User is typing
  THINKING, // Processing request (loading animation)
  SPEAKING, // AI is responding
  COMPLETE, // Task finished (celebration)
  ERROR // Error occurred
}
```

### OpenClaw Integration

```typescript
// WebSocket message format
interface OpenClawMessage {
  type: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

// Connection flow
1. Check if OpenClaw is running (ws://127.0.0.1:18789)
2. Connect and send session init
3. Stream messages bidirectionally
4. Handle reconnection on disconnect
```

## Phase 2: Task Management (Future)

- [ ] Task queue visualization
- [ ] Background task execution
- [ ] System notifications on completion
- [ ] Cron job integration
- [ ] Memory/context visualization

## Phase 3: Advanced Features (Future)

- [ ] Voice input (Tauri microphone API)
- [ ] Multi-monitor support
- [ ] Custom skills integration
- [ ] Settings panel
- [ ] Mini/expanded view toggle

## Design Decisions

### Why Clippy.lottie over Clippy.json?

- **Size**: 11KB vs 115KB (10x smaller)
- **Format**: DotLottie is the modern standard
- **Performance**: Better parsing and rendering
- **Library**: Use `@lottiefiles/dotlottie-react` or `@dotlottie/react-player`

### Why OpenClaw?

- Local-first, privacy-focused
- Multi-LLM support (Claude, GPT, local models)
- Built-in memory and context management
- Mature ecosystem with skills/tools
- WebSocket API for real-time streaming

### Window Management

- No native window decorations (custom UI)
- Use Tauri's `data-tauri-drag-region` for dragging
- Snap logic: 20px threshold to screen edges
- Save position to localStorage

## Dependencies to Add

```json
{
  "dependencies": {
    "@dotlottie/react-player": "^1.6.19",
    "clsx": "^2.1.0"
  }
}
```

## Resources

- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Docs](https://openclaw.ai/)
- [Tauri Window Docs](https://tauri.app/v1/api/js/window)
- [DotLottie](https://dotlottie.io/)
