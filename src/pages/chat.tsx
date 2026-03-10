/**
 * Chat Window Page
 * Full-screen chat history with markdown rendering.
 * Reads sessionKey from URL param and fetches history directly.
 */

import '@/assets/base.css'
import { MessageBubble } from '@/components/message-bubble'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOpenClaw } from '@/hooks/use-open-claw'
import { useTheme } from '@/hooks/use-theme'
import { convertHistoryMessages } from '@/lib/message-utils'
import type { ChatHistoryResponse, SessionUsage } from '@/types/gateway'
import { ConnectionStatus, OpenClawMessage } from '@/types/openclaw'
import { emit } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

// Read sessionKey from URL search params
const sessionKey =
  new URLSearchParams(window.location.search).get('sessionKey') ??
  'agent:main:main'

export function ChatPage() {
  useTheme()
  const {
    status,
    messages: streamMessages,
    isStreaming,
    getChatHistory,
    getSessionUsage
  } = useOpenClaw({}, sessionKey)

  const [historyMessages, setHistoryMessages] = useState<OpenClawMessage[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [sessionUsage, setSessionUsage] = useState<SessionUsage | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const lastMessageCountRef = useRef(0)

  // Notify main window when chat window is fully loaded
  useEffect(() => {
    const notifyReady = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await emit('chat-window-ready', {})
    }
    notifyReady()
  }, [])

  // Load history once connected
  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) return

    const load = async () => {
      setIsHistoryLoading(true)
      setHistoryMessages([])
      try {
        const response = (await getChatHistory(
          sessionKey,
          200
        )) as ChatHistoryResponse
        const raw = response?.payload?.messages ?? []
        console.log('[ChatPage] Loaded history raw:', raw)
        setHistoryMessages(convertHistoryMessages(raw))
      } catch (e) {
        console.error('[Chat] Failed to load history:', e)
      } finally {
        setIsHistoryLoading(false)
      }

      // Fetch usage stats separately
      try {
        const usage = await getSessionUsage(sessionKey)
        if (usage) setSessionUsage(usage)
      } catch (e) {
        console.error('[Chat] Failed to load session usage:', e)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Merge history + any live streaming messages
  const messages = useMemo(() => {
    if (streamMessages.length === 0) return historyMessages
    // Avoid duplicates: if history is loaded and stream has new messages, append them
    const lastHistoryTs =
      historyMessages[historyMessages.length - 1]?.timestamp ?? 0
    const newStream = streamMessages.filter(
      (m) => (m.timestamp ?? 0) > lastHistoryTs
    )
    return newStream.length > 0
      ? [...historyMessages, ...newStream]
      : historyMessages
  }, [historyMessages, streamMessages])

  // Derive stats from sessions.usage API response
  const stats = {
    totalTokens: sessionUsage?.totalTokens ?? 0,
    totalCost: sessionUsage?.totalCost ?? 0,
    inputTokens: sessionUsage?.input ?? 0,
    outputTokens: sessionUsage?.output ?? 0,
    cacheRead: sessionUsage?.cacheRead ?? 0,
    models: sessionUsage?.modelUsage?.map((m) => m.model) ?? []
  }

  // Handle user manual scroll
  useEffect(() => {
    const container = chatContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 150)
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Smart auto-scroll
  useEffect(() => {
    if (!chatContainerRef.current) return
    const container = chatContainerRef.current
    const messageCountChanged = messages.length !== lastMessageCountRef.current
    const hasNewUserMessage =
      messageCountChanged &&
      messages.length > 0 &&
      messages[messages.length - 1]?.role === 'user'
    lastMessageCountRef.current = messages.length

    if (
      hasNewUserMessage ||
      (shouldAutoScroll && (isStreaming || messageCountChanged))
    ) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isStreaming ? 'smooth' : 'auto'
      })
    }
  }, [messages, isStreaming, shouldAutoScroll])

  const handleClose = async () => {
    const window = getCurrentWebviewWindow()
    await window.close()
  }

  // Derive a display name from the session key (e.g. "agent:gmail-summary:main" → "gmail-summary / main")
  const sessionDisplayName = useMemo(() => {
    const parts = sessionKey.split(':')
    if (parts.length >= 3) return `${parts[1]} / ${parts.slice(2).join(':')}`
    return sessionKey
  }, [])

  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden rounded-2xl">
      {/* Header */}
      <header
        className="flex h-16 shrink-0 items-center justify-between border-b px-6"
        data-tauri-drag-region
      >
        <h1 className="text-lg font-semibold">{sessionDisplayName}</h1>
        <Button
          data-tauri-ignore
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-4">
        {status === ConnectionStatus.ERROR ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-destructive flex flex-col items-center gap-2 text-center">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm">Failed to connect to gateway</p>
              <p className="text-muted-foreground text-xs">{sessionKey}</p>
            </div>
          </div>
        ) : isHistoryLoading || status !== ConnectionStatus.CONNECTED ? (
          <div className="mx-auto max-w-4xl space-y-8 pt-2">
            <div className="flex justify-end">
              <Skeleton className="h-10 w-52 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-40 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-64 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start a conversation in the main window</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.timestamp}-${index}`}
                message={message}
              />
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-muted max-w-[85%] rounded-lg px-4 py-3">
                  <div className="flex gap-1 py-1">
                    <span className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]"></span>
                    <span className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]"></span>
                    <span className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="text-muted-foreground flex h-10 shrink-0 items-center justify-between border-t px-6 text-xs">
        {isStreaming ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>AI is thinking...</span>
          </div>
        ) : isHistoryLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading history...</span>
          </div>
        ) : status !== ConnectionStatus.CONNECTED ? (
          <div className="flex items-center gap-2">
            {status === ConnectionStatus.ERROR ? (
              <AlertCircle className="text-destructive h-3 w-3" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            <span>
              {status === ConnectionStatus.ERROR
                ? 'Gateway error'
                : 'Connecting...'}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              {stats.totalTokens > 0 ? (
                <span>
                  {stats.totalTokens.toLocaleString()} tokens
                  {stats.inputTokens > 0 && stats.outputTokens > 0 && (
                    <span className="text-muted-foreground/70 ml-1">
                      ({stats.inputTokens.toLocaleString()} in /{' '}
                      {stats.outputTokens.toLocaleString()} out /{' '}
                      {stats.cacheRead.toLocaleString()} cache read)
                    </span>
                  )}
                </span>
              ) : (
                <span>{messages.length} messages</span>
              )}
              {stats.totalCost > 0 && (
                <>
                  <span>•</span>
                  <span>${stats.totalCost.toFixed(4)}</span>
                </>
              )}
            </div>
            <span className="text-muted-foreground/60 max-w-xs truncate font-mono">
              {stats.models.length > 0 ? stats.models.join(', ') : sessionKey}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
