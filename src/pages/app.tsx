import '@/assets/base.css'
import { ClippyAvatar } from '@/components/clippy-avatar'
import { Markdown } from '@/components/markdown'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useMultiSessionOpenClaw } from '@/hooks/use-multi-session'
import { migrateFromLocalStorage } from '@/lib/store'
import { openChatWindow, openSettingsWindow } from '@/lib/windows'
import { ChatMessage, ClippyState } from '@/types/clippy'
import { ConnectionStatus, MessageRole } from '@/types/openclaw'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ArrowRight, Maximize, Settings } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

// Constants
const TEXTAREA_MAX_HEIGHT = 80
const SPEAKING_ANIMATION_DURATION = 2000

function App() {
  const {
    activeSession,
    status,
    messages: openClawMessages,
    isStreaming,
    sendMessage
  } = useMultiSessionOpenClaw()

  const [clippyState, setClippyState] = useState<ClippyState>(ClippyState.IDLE)
  const [input, setInput] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isTyping, setIsTyping] = useState(false)

  const isConnected = status === ConnectionStatus.CONNECTED

  // Convert OpenClaw messages to chat messages
  const chatMessages: ChatMessage[] = useMemo(() => {
    return openClawMessages
      .filter(
        (msg) =>
          msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT
      )
      .map((msg, index): ChatMessage => {
        // Extract text content from structured content
        let textContent = ''
        if (typeof msg.content === 'string') {
          textContent = msg.content
        } else if (Array.isArray(msg.content)) {
          // Only extract text blocks for display (skip thinking and toolCall in main window)
          textContent = msg.content
            .filter((block) => block.type === 'text')
            .map((block) => ('text' in block ? block.text : '') || '')
            .join('\n')
        }

        return {
          id: `${msg.timestamp || 0}-${index}`,
          role: (msg.role === MessageRole.USER ? 'user' : 'assistant') as
            | 'user'
            | 'assistant',
          content: textContent,
          timestamp: msg.timestamp || 0
        }
      })
      .filter((msg) => msg.content.trim().length > 0) // Filter out empty messages
  }, [openClawMessages])

  // Update Clippy state based on connection and streaming status
  useEffect(() => {
    // This effect derives UI state from props - safe to call setState here
    /* eslint-disable react-hooks/set-state-in-effect */
    if (status === ConnectionStatus.ERROR) {
      setClippyState(ClippyState.ERROR)
      return
    }

    if (isStreaming) {
      setClippyState(ClippyState.THINKING)
      return
    }

    // Check if last message is from assistant
    const lastMessage = chatMessages[chatMessages.length - 1]
    if (lastMessage?.role === 'assistant') {
      setClippyState(ClippyState.SPEAKING)
      const timer = setTimeout(
        () => setClippyState(ClippyState.IDLE),
        SPEAKING_ANIMATION_DURATION
      )
      return () => clearTimeout(timer)
    }

    setClippyState(ClippyState.IDLE)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [status, isStreaming, chatMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      // Use smooth scroll during streaming to reduce jitter
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: isStreaming ? 'smooth' : 'auto'
      })
    }
  }, [chatMessages, isStreaming])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
  }, [input])

  // Initialize: migrate from localStorage on first load
  useEffect(() => {
    migrateFromLocalStorage()
  }, [])

  // Listen for chat window ready event and hide main window with fade animation
  useEffect(() => {
    const mainWindow = getCurrentWindow()
    const appElement = document.getElementById('root')

    const unlistenReady = listen('chat-window-ready', async () => {
      if (appElement) {
        // Add fade-out animation
        appElement.style.transition = 'opacity 0.2s ease-out'
        appElement.style.opacity = '0'

        // Wait for animation to complete, then hide window
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      await mainWindow.hide()
    })

    const unlistenClose = listen('chat-window-closed', async () => {
      // Show window first (but it's still invisible)
      await mainWindow.show()

      if (appElement) {
        // Reset opacity to 0 before fade-in
        appElement.style.opacity = '0'

        // Trigger fade-in animation
        requestAnimationFrame(() => {
          appElement.style.transition = 'opacity 0.2s ease-in'
          appElement.style.opacity = '1'
        })
      }
    })

    return () => {
      unlistenReady.then((fn) => fn())
      unlistenClose.then((fn) => fn())
    }
  }, [])

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleSendMessage = () => {
    const trimmed = input.trim()
    if (!trimmed || !isConnected) return

    sendMessage(trimmed)
    setInput('')
    resetTextareaHeight()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isTyping) {
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const hasMessages = chatMessages.length > 0

  return (
    <div className="flex h-full w-full items-center gap-3 p-3">
      {/* Chat Bubble - Left side */}
      <div className="relative flex max-h-95 min-w-0 flex-1 flex-col rounded-3xl bg-white/95 shadow-2xl backdrop-blur-xl">
        {/* Pointing triangle to Clippy */}
        <div className="absolute top-1/2 -right-2 h-0 w-0 -translate-y-1/2 border-t-12 border-b-12 border-l-12 border-t-transparent border-b-transparent border-l-white/95" />

        {/* Header with Connection Status and Action Buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                status === ConnectionStatus.CONNECTED
                  ? 'bg-green-500'
                  : status === ConnectionStatus.CONNECTING
                    ? 'bg-yellow-500'
                    : status === ConnectionStatus.ERROR
                      ? 'bg-red-500'
                      : 'bg-gray-400'
              }`}
            />
            <span className="max-w-30 truncate text-xs text-gray-600">
              {activeSession?.name || 'Loading...'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger>
                <button
                  onClick={() => openChatWindow(activeSession.sessionKey)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <Maximize size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>詳細はこちら</p>
              </TooltipContent>
            </Tooltip>

            <button
              onClick={() => openSettingsWindow(activeSession.sessionKey)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Chat content */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Messages area - Draggable */}
          <div
            ref={chatContainerRef}
            className="no-scrollbar scrollbar-track-transparent min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3"
          >
            {!hasMessages && !isStreaming && (
              <div className="text-xs leading-relaxed text-gray-700">
                <p className="font-medium">
                  Hi! I'm Clippy, your AI assistant.
                </p>
                <p className="mt-1">Would you like to get some assistance?</p>
              </div>
            )}

            {chatMessages.map((message) => (
              <div key={message.id} className="animate-slide-in">
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-card border-border max-w-[85%] rounded-lg border px-3 py-2 text-sm leading-relaxed">
                      <Markdown
                        content={message.content}
                        className="markdown-compact"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed text-gray-800">
                    <Markdown
                      content={message.content}
                      className="markdown-compact"
                    />
                  </div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-1 py-1">
                <span className="animate-typing h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                <span className="animate-typing h-1.5 w-1.5 rounded-full bg-gray-400 [animation-delay:0.2s]"></span>
                <span className="animate-typing h-1.5 w-1.5 rounded-full bg-gray-400 [animation-delay:0.4s]"></span>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex items-end gap-2 border-t border-gray-200 px-4 py-3">
            <textarea
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? 'Ask me anything' : 'Disconnected...'}
              disabled={!isConnected}
              rows={1}
              className="no-scrollbar max-h-20 min-h-8 flex-1 resize-none rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs transition-colors outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={!isConnected || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              title="Send"
            >
              <ArrowRight size={14} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Clippy Avatar - Right side - Draggable */}
      <div className="shrink-0" data-tauri-drag-region>
        <ClippyAvatar state={clippyState} size={160} />
      </div>
    </div>
  )
}

export default App
