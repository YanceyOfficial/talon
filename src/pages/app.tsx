import '@/assets/base.css'
import { Markdown } from '@/components/markdown'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useMultiSessionOpenClaw } from '@/hooks/use-multi-session'
import { useTheme } from '@/hooks/use-theme'
import { useUpdater } from '@/hooks/use-updater'
import { getSettings, migrateFromLocalStorage } from '@/lib/store'
import { cn } from '@/lib/utils'
import { openChatWindow, openSettingsWindow } from '@/lib/windows'
import { ConnectionStatus, MessageRole, ToolCallBlock } from '@/types/openclaw'
import { ChatMessage } from '@/types/talon'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ArrowUp, Maximize2, Settings } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const TEXTAREA_MAX_HEIGHT = 80

function timeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function App() {
  // Theme: loads stored preference, listens for system changes
  useTheme()

  const {
    activeSession,
    status,
    messages: openClawMessages,
    isStreaming,
    sendMessage
  } = useMultiSessionOpenClaw()

  const [input, setInput] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isTyping, setIsTyping] = useState(false)

  const isConnected = status === ConnectionStatus.CONNECTED

  // Convert OpenClaw messages to simple chat format
  const chatMessages: ChatMessage[] = useMemo(() => {
    return openClawMessages
      .filter(
        (msg) =>
          msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT
      )
      .map((msg, index): ChatMessage => {
        let textContent = ''
        if (typeof msg.content === 'string') {
          textContent = msg.content
        } else if (Array.isArray(msg.content)) {
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
      .filter((msg) => msg.content.trim().length > 0)
  }, [openClawMessages])

  // Extract tool calls from messages (shown during streaming)
  const toolCallStats = useMemo(() => {
    if (!isStreaming) return []
    const counts: Record<string, { count: number; lastSeen: number }> = {}
    for (const msg of openClawMessages) {
      if (!Array.isArray(msg.content)) continue
      const ts = msg.timestamp ?? 0
      for (const block of msg.content) {
        if (block.type === 'toolCall') {
          const name = (block as ToolCallBlock).name
          if (!counts[name]) counts[name] = { count: 0, lastSeen: ts }
          counts[name].count++
          if (ts > counts[name].lastSeen) {
            counts[name].lastSeen = ts
          }
        }
      }
    }
    return Object.entries(counts)
      .map(([name, { count, lastSeen }]) => ({ name, count, lastSeen }))
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 4)
  }, [openClawMessages, isStreaming])

  // Latest usage stats: find last message with usage data
  const lastMsgWithUsage = [...openClawMessages].reverse().find((m) => m.usage)
  const latestStats = lastMsgWithUsage
    ? {
        tokens: lastMsgWithUsage.usage!.totalTokens,
        model: lastMsgWithUsage.model ?? null
      }
    : null

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: isStreaming ? 'smooth' : 'auto'
      })
    }
  }, [chatMessages, isStreaming])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
  }, [input])

  // One-time migration
  useEffect(() => {
    migrateFromLocalStorage()
  }, [])

  // Silent auto-update check on startup
  const { checkForUpdate, downloadAndInstall } = useUpdater()
  useEffect(() => {
    getSettings().then(async (s) => {
      if (s.autoUpdate ?? true) {
        const hasUpdate = await checkForUpdate().catch(() => false)
        if (hasUpdate) {
          await downloadAndInstall().catch(() => {})
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Register saved global shortcut on startup
  useEffect(() => {
    getSettings().then((s) => {
      if (s.hotkey) {
        invoke('set_global_shortcut', { shortcut: s.hotkey }).catch(() => {})
      }
    })
  }, [])

  // Update tray tooltip when connection status changes
  useEffect(() => {
    invoke('update_tray_tooltip', { status: status.toString() }).catch(() => {})
  }, [status])

  // Listen for tray "Settings" click
  useEffect(() => {
    const unlisten = listen('tray-open-settings', () => {
      openSettingsWindow(activeSession?.sessionKey)
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [activeSession])

  // Auto-focus textarea when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      textareaRef.current?.focus()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Esc to hide the panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        getCurrentWindow().hide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fade in/out when chat window opens/closes
  useEffect(() => {
    const mainWindow = getCurrentWindow()
    const appElement = document.getElementById('root')

    window.addEventListener('blur', () => {
      mainWindow.hide()
    })

    const unlistenReady = listen('chat-window-ready', async () => {
      if (appElement) {
        appElement.style.transition = 'opacity 0.2s ease-out'
        appElement.style.opacity = '0'
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      await mainWindow.hide()
    })

    const unlistenClose = listen('chat-window-closed', async () => {
      await mainWindow.show()
      if (appElement) {
        appElement.style.opacity = '0'
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
    if (isStreaming) return
    const trimmed = input.trim()
    if (!trimmed || !isConnected) return
    sendMessage(trimmed)
    setInput('')
    resetTextareaHeight()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isTyping) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Status accent color
  const accentClass =
    status === ConnectionStatus.CONNECTED
      ? 'bg-emerald-400'
      : status === ConnectionStatus.ERROR
        ? 'bg-red-400'
        : 'bg-gray-400'

  const accentTextClass =
    status === ConnectionStatus.CONNECTED
      ? 'text-emerald-400'
      : status === ConnectionStatus.ERROR
        ? 'text-red-400'
        : 'text-gray-400'

  const hasMessages = chatMessages.length > 0

  return (
    <div className="flex h-full w-full flex-col bg-transparent px-3 pb-3">
      {/* Caret — overlaps card top by 1px so they read as one shape */}
      <div className="relative z-10 -mb-[0.5px] flex h-3 shrink-0 items-end justify-center">
        <svg width="20" height="9" viewBox="0 0 20 9" fill="none">
          {/* border edges of the two visible sides */}
          <path
            d="M0 9 L10 0.5 L20 9"
            stroke="var(--border)"
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* fill — match card's bg-card/95 opacity */}
          <path
            d="M0 9 L10 0.5 L20 9 Z"
            fill="var(--card)"
            fillOpacity="0.95"
          />
          {/* cover the base seam so card border doesn't show through */}
          <line
            x1="-1"
            y1="9.5"
            x2="21"
            y2="9.5"
            stroke="var(--card)"
            strokeWidth="2"
            strokeOpacity="0.95"
          />
        </svg>
      </div>
      {/* Widget Card */}
      <div className="widget-card border-border/40 bg-card/95 relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border">
        {/* Header */}
        <div className="border-border/40 flex shrink-0 items-center gap-2.5 border-b px-4 py-3">
          {/* Status dot */}
          <div
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              accentClass,
              isStreaming && 'animate-pulse'
            )}
          />

          {/* Session name */}
          <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
            {activeSession?.label ?? activeSession?.name ?? 'Loading…'}
          </span>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => openChatWindow(activeSession?.sessionKey)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                >
                  <Maximize2 size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>詳細はこちら</p>
              </TooltipContent>
            </Tooltip>

            <button
              onClick={() => openSettingsWindow(activeSession?.sessionKey)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-6 w-6 items-center justify-center rounded-md transition-colors"
              title="Settings"
            >
              <Settings size={12} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3"
        >
          {!hasMessages && !isStreaming && (
            <div className="text-muted-foreground text-xs leading-relaxed">
              <p className="text-foreground font-semibold">Hi, I'm Talon.</p>
              <p className="mt-0.5">How can I help you today?</p>
            </div>
          )}

          {chatMessages.map((message) => (
            <div key={message.id} className="animate-slide-in">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-xs leading-relaxed">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="text-foreground text-xs leading-relaxed">
                  <Markdown
                    content={message.content}
                    className="markdown-compact"
                  />
                </div>
              )}
            </div>
          ))}

          {isStreaming &&
            chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-1 py-1">
                <span className="animate-typing h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="animate-typing h-1.5 w-1.5 rounded-full bg-amber-400 [animation-delay:0.2s]" />
                <span className="animate-typing h-1.5 w-1.5 rounded-full bg-amber-400 [animation-delay:0.4s]" />
              </div>
            )}
        </div>

        {/* Tool calls — only shown while streaming */}
        {isStreaming && toolCallStats.length > 0 && (
          <div className="border-border/40 shrink-0 border-t px-4 py-2">
            <p className="text-muted-foreground mb-1.5 text-[9px] font-semibold tracking-widest uppercase">
              Tool Calls
            </p>
            <div className="space-y-0.5">
              {toolCallStats.map((tc) => (
                <div
                  key={tc.name}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-foreground/70 truncate font-mono text-[11px]">
                    {tc.name}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[10px]',
                      accentTextClass
                    )}
                  >
                    ×{tc.count} {timeAgo(tc.lastSeen)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats footer */}
        {latestStats && !isStreaming && (
          <div className="border-border/40 flex shrink-0 items-center gap-2 border-t px-4 py-1.5">
            <span className="text-muted-foreground font-mono text-[10px]">
              {latestStats.tokens.toLocaleString()} tokens
            </span>
            {latestStats.model && (
              <>
                <span className="text-border text-[10px]">·</span>
                <span className="text-muted-foreground max-w-[140px] truncate font-mono text-[10px]">
                  {latestStats.model}
                </span>
              </>
            )}
          </div>
        )}

        {/* Input */}
        <div className="border-border/40 flex shrink-0 items-end gap-2 border-t px-4 py-3">
          <textarea
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Ask me anything…' : 'Disconnected…'}
            disabled={!isConnected}
            rows={1}
            className="no-scrollbar bg-background/60 text-foreground placeholder:text-muted-foreground/50 ring-border/60 border-border/50 max-h-20 min-h-8 flex-1 resize-none rounded-2xl border px-3 py-2 text-xs transition-shadow outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-40"
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !input.trim()}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
              'bg-primary text-primary-foreground hover:opacity-90 active:scale-95',
              'disabled:cursor-not-allowed disabled:opacity-30'
            )}
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
