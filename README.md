# Clippy - Your Desktop AI Assistant

A modern reimagination of the classic Microsoft Office Clippy, powered by [OpenClaw](https://openclaw.ai/) AI assistant framework.

## Features

- 🤖 **AI-Powered**: Connects to OpenClaw for intelligent conversations
- 🎨 **Animated Avatar**: Lottie-based Clippy animations with multiple states
- 🪟 **Floating Design**: Transparent window that floats on your desktop
- 🧲 **Magnetic Snap**: Automatically snaps to screen edges
- 🌐 **All Spaces**: Visible on all macOS desktop spaces
- 📍 **Menubar Integration**: Control from menubar, hidden from Dock
- 💬 **Simple Chat**: Clean, intuitive chat interface
- 🔒 **Privacy-First**: All data stays local (requires local OpenClaw installation)

## Prerequisites

### 1. Install OpenClaw

Clippy requires OpenClaw to be running on your machine. Install it with:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Or visit [OpenClaw's website](https://openclaw.ai/) for alternative installation methods.

### 2. Start OpenClaw Gateway

Before running Clippy, start the OpenClaw gateway:

```bash
openclaw gateway
```

This will start the WebSocket server at `ws://127.0.0.1:18789`.

## Installation & Development

### Install Dependencies

```bash
pnpm install
```

(If you don't have `pnpm`, install it with `npm install -g pnpm`)

### Run Development Mode

```bash
pnpm tauri dev
```

This will:

1. Start the Vite dev server
2. Launch the Tauri window
3. Enable hot-reload for React changes

### Build for Production

```bash
pnpm tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
clippy/
├── src/
│   ├── components/           # React components
│   │   ├── ClippyAvatar.tsx  # Lottie animation controller
│   │   ├── ChatBubble.tsx    # Message display
│   │   └── InputBox.tsx      # User input
│   ├── hooks/                # Custom React hooks
│   │   ├── useOpenClaw.ts    # WebSocket connection
│   │   └── useWindowDrag.ts  # Window dragging logic
│   ├── types/                # TypeScript types
│   └── assets/               # Lottie files
├── src-tauri/                # Rust/Tauri backend
└── ARCHITECTURE.md           # Detailed architecture docs
```

## How It Works

1. **OpenClaw Connection**: Clippy connects to your local OpenClaw gateway via WebSocket
2. **Message Flow**: User messages → OpenClaw → AI response → Clippy display
3. **Animation States**: Clippy's animation changes based on conversation state (idle, thinking, speaking, etc.)
4. **Window Management**: Tauri provides the desktop window with drag-and-snap functionality

## Usage

1. **Start OpenClaw**: Make sure `openclaw gateway` is running
2. **Launch Clippy**: Run the app or use `pnpm tauri dev`
3. **Menubar Icon**: Look for Clippy icon in your macOS menubar
4. **Show/Hide**: Click menubar icon to toggle window visibility
5. **Click Clippy**: Click the avatar to open the chat panel
6. **Chat**: Type your message and press Enter
7. **Drag**: Click and drag Clippy avatar to move the window
8. **All Spaces**: Clippy appears on all desktop spaces automatically

## Configuration

Clippy will automatically:

- Connect to OpenClaw at `ws://127.0.0.1:18789`
- Save window position between sessions
- Reconnect if the connection drops

## Roadmap

### Phase 1: Simple Chat ✅

- [x] Basic UI with Lottie animation
- [x] OpenClaw WebSocket connection
- [x] Draggable window with snap
- [x] Chat interface

### Phase 2: Task Management (Coming Soon)

- [ ] Background task execution
- [ ] Task queue visualization
- [ ] System notifications
- [ ] Cron job integration

### Phase 3: Advanced Features (Future)

- [ ] Voice input
- [ ] Custom skills integration
- [ ] Settings panel
- [ ] Multi-monitor support

## Technologies

- **Frontend**: React 19 + TypeScript
- **Desktop**: Tauri 2.0
- **Styling**: Tailwind CSS 4.x
- **Animation**: DotLottie (11KB)
- **AI Backend**: OpenClaw
- **Build**: Vite + pnpm

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Original Clippy design by Microsoft
- Powered by [OpenClaw](https://openclaw.ai/)

---

Made with ❤️ by Yancey Leo
