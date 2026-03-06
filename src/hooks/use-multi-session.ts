/**
 * useMultiSessionOpenClaw
 *
 * Unified hook combining:
 * - Session state & CRUD (Jotai atoms, in-memory per window)
 * - OpenClaw WebSocket connection (useOpenClaw)
 * - Per-session message cache + history loading
 * - Gateway session sync
 * - Background polling + notifications
 *
 * Cross-window sync strategy:
 * - activeSessionId persisted to Tauri Store so newly-opened windows
 *   (e.g. chat window) immediately start on the correct session.
 * - Tauri events used for live session-switch sync while windows are open.
 */

// import {
//   getMessagePreview,
//   requestNotificationPermission,
//   sendSystemNotification
// } from '@/lib/notification'
import { convertHistoryMessages } from '@/lib/message-utils'
import { toAgentId } from '@/lib/session-manager'
import { getActiveSessionId, saveActiveSessionId } from '@/lib/store'
import {
  DEFAULT_MAIN_SESSION,
  activeSessionIdAtom,
  sessionMessagesAtom,
  sessionsAtom,
  sessionsLoadingAtom
} from '@/store/atoms'
import type {
  ChatHistoryResponse,
  GatewayAgentsListResponse
} from '@/types/gateway'
import { ConnectionStatus } from '@/types/openclaw'
import { SessionConfig, SessionType } from '@/types/session'
import { emit, listen } from '@tauri-apps/api/event'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOpenClaw } from './use-open-claw'

export function useMultiSessionOpenClaw() {
  // ─── Session state (Jotai atoms, in-memory per window) ───────────────────
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom)
  const [sessionsLoading, setSessionsLoading] = useAtom(sessionsLoadingAtom)
  const [sessionMessages, setSessionMessages] = useAtom(sessionMessagesAtom)

  const activeSession = useMemo(
    () =>
      sessions.find((s) => s.id === activeSessionId) ?? DEFAULT_MAIN_SESSION,
    [sessions, activeSessionId]
  )

  // ─── WebSocket connection ─────────────────────────────────────────────────
  const {
    status,
    serverVersion,
    messages: currentMessages,
    isStreaming,
    currentSessionKey,
    connect,
    disconnect,
    reconnect,
    sendMessage: sendMessageRaw,
    clearMessages: clearCurrentMessages,
    listGatewayAgents,
    createGatewayAgent,
    deleteGatewayAgent,
    listGatewaySessions,
    getChatHistory,
    switchToSession,
    onBackgroundSessionFinalRef
  } = useOpenClaw({}, activeSession.sessionKey)

  // ─── History loading state ────────────────────────────────────────────────
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // ─── Notification state ───────────────────────────────────────────────────
  // const lastMessageCountRef = useRef<Record<string, number>>({})
  // const [notificationEnabled, setNotificationEnabled] = useState(false)

  // Guard: only persist after the store has been read on mount.
  // Without this, the initial render writes 'main' to the store before the
  // async restore has a chance to read back the previously-selected session.
  const hasRestoredRef = useRef(false)

  // ─── Restore activeSessionId from store on mount (cross-window handoff) ───
  useEffect(() => {
    getActiveSessionId().then((id) => {
      if (id && id !== 'main') setActiveSessionId(id)
      hasRestoredRef.current = true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist activeSessionId to store so newly-opened windows start correctly
  useEffect(() => {
    if (!hasRestoredRef.current) return
    saveActiveSessionId(activeSessionId)
  }, [activeSessionId])

  // ─── Expose messages for the active session ───────────────────────────────
  const messages = useMemo(() => {
    const cached = sessionMessages[activeSession.id]
    return cached && cached.length > 0 ? cached : currentMessages
  }, [activeSession, sessionMessages, currentMessages])

  // ─── Notifications ────────────────────────────────────────────────────────
  // useEffect(() => {
  //   requestNotificationPermission().then((granted) => {
  //     setNotificationEnabled(granted)
  //   })
  // }, [])

  // useEffect(() => {
  //   if (!notificationEnabled || currentMessages.length === 0) return

  //   const sessionId = activeSession.id
  //   const lastCount = lastMessageCountRef.current[sessionId] || 0
  //   const currentCount = currentMessages.length

  //   if (currentCount > lastCount) {
  //     const newMessages = currentMessages.slice(lastCount)
  //     const lastAssistantMsg = [...newMessages]
  //       .reverse()
  //       .find((msg) => msg.role === MessageRole.ASSISTANT && msg.isFinal)

  //     if (lastAssistantMsg) {
  //       const preview = getMessagePreview(lastAssistantMsg.content, 80)
  //       if (preview) {
  //         sendSystemNotification(activeSession.name || 'New Message', preview)
  //       }
  //     }
  //   }

  //   lastMessageCountRef.current[sessionId] = currentCount
  // }, [currentMessages, activeSession, notificationEnabled])

  // Keep in-memory cache in sync with streaming messages
  useEffect(() => {
    if (currentMessages.length === 0) return
    setSessionMessages((prev) => ({
      ...prev,
      [activeSession.id]: currentMessages
    }))
  }, [currentMessages, activeSession, setSessionMessages])

  // ─── Gateway agent sync ───────────────────────────────────────────────────
  const syncSessionsFromGateway = useCallback(async () => {
    try {
      setSessionsLoading(true)
      console.log('[Session] Syncing agents from Gateway...')
      const response = (await listGatewayAgents()) as GatewayAgentsListResponse
      const agents = response?.payload?.agents
      const mainKey = response?.payload?.mainKey ?? 'main'
      const defaultId = response?.payload?.defaultId ?? 'main'

      if (agents && agents.length > 0) {
        console.log(`[Session] Got ${agents.length} agents from Gateway`)

        setSessions((prev) => {
          const gatewayIds = new Set(agents.map((a) => a.id))
          // Keep locally created sessions whose agent isn't registered yet
          const localOnly = prev.filter((s) => {
            const agentId = s.sessionKey.split(':')[1]
            return agentId && !gatewayIds.has(agentId)
          })
          const fromGateway = agents.map((a) => {
            const sessionKey = `agent:${a.id}:${mainKey}`
            const isDefault = a.id === defaultId
            const existing = prev.find((s) => s.sessionKey === sessionKey)
            if (existing) return existing
            const displayName =
              a.identity?.name || a.name || (isDefault ? 'Default Chat' : a.id)
            return {
              id: isDefault ? 'main' : `agent-${a.id}`,
              name: displayName,
              type: isDefault ? SessionType.MAIN : SessionType.TASK,
              sessionKey,
              active: true,
              createdAt: Date.now(),
              lastActiveAt: Date.now(),
              memoryEnabled: true,
              autoCompact: true,
              compactThreshold: 180000,
              resetPolicy: { mode: 'idle', idleMinutes: 360 }
            } as SessionConfig
          })
          return [...fromGateway, ...localOnly]
        })
      } else {
        console.log('[Session] No agents from Gateway')
      }
    } catch (error) {
      console.error('[Session] Failed to sync agents from Gateway:', error)
    } finally {
      setSessionsLoading(false)
    }
  }, [listGatewayAgents, setSessions, setSessionsLoading])

  // Auto-sync on connect
  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) return
    syncSessionsFromGateway()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // ─── Cross-window sync via Tauri events ───────────────────────────────────
  useEffect(() => {
    // session-changed: agent list changed (create/delete) or live session switch
    const unlistenSession = listen('session-changed', (event) => {
      console.log('[Session] session-changed received')
      const payload = event.payload as { activeSessionId?: string } | null
      if (payload?.activeSessionId) {
        setActiveSessionId(payload.activeSessionId)
      }
      if (status === ConnectionStatus.CONNECTED) {
        syncSessionsFromGateway()
      }
    })

    // session-key-switched: switch to a cron/DM session key (no gateway sync)
    const unlistenSessionKey = listen('session-key-switched', (event) => {
      console.log('[Session] session-key-switched received')
      const payload = event.payload as {
        sessionKey?: string
        label?: string
      } | null
      if (!payload?.sessionKey) return

      const key = payload.sessionKey
      const parts = key.split(':')
      const agentId = parts[1] ?? 'unknown'
      const sessionSuffix = parts.slice(2).join(':')
      const transientId = `key-${key.replace(/[^a-z0-9]/gi, '-')}`

      setSessions((prev) => {
        if (prev.some((s) => s.sessionKey === key)) return prev
        const transientSession: SessionConfig = {
          id: transientId,
          name: `${agentId} / ${sessionSuffix}`,
          label: payload.label,
          type: SessionType.TASK,
          sessionKey: key,
          active: true,
          createdAt: Date.now(),
          lastActiveAt: Date.now()
        }
        return [...prev, transientSession]
      })
      setActiveSessionId(transientId)
    })

    const unlistenSettings = listen('gateway-settings-changed', () => {
      console.log('[Session] gateway-settings-changed, reconnecting...')
      reconnect()
    })

    return () => {
      unlistenSession.then((fn) => fn())
      unlistenSessionKey.then((fn) => fn())
      unlistenSettings.then((fn) => fn())
    }
  }, [
    status,
    syncSessionsFromGateway,
    reconnect,
    setSessions,
    setActiveSessionId
  ])

  // ─── Session change: switch WebSocket + load history ─────────────────────
  useEffect(() => {
    console.log(
      '[Session] Active session:',
      activeSession.name,
      activeSession.sessionKey
    )
    switchToSession(activeSession.sessionKey)

    if (status !== ConnectionStatus.CONNECTED) return

    const loadHistory = async () => {
      setIsHistoryLoading(true)
      try {
        const response = (await getChatHistory(
          activeSession.sessionKey,
          200
        )) as ChatHistoryResponse

        if (
          response?.payload?.messages &&
          response.payload.messages.length > 0
        ) {
          console.log(
            `[Session] Loaded ${response.payload.messages.length} messages from Gateway`
          )
          setSessionMessages((prev) => ({
            ...prev,
            [activeSession.id]: convertHistoryMessages(
              response.payload!.messages!
            )
          }))
        } else {
          console.log('[Session] No history — new session')
          if (activeSession.type !== 'main') {
            setTimeout(() => {
              const initMessage = activeSession.description
                ? `Hello! This is the "${activeSession.name}" task session. ${activeSession.description}`
                : `Hello! This is the "${activeSession.name}" task session.`
              sendMessageRaw(initMessage, activeSession.sessionKey)
            }, 500)
          } else {
            clearCurrentMessages()
          }
        }
      } catch (error) {
        console.log('[Session] Failed to load history:', error)
        clearCurrentMessages()
      } finally {
        setIsHistoryLoading(false)
      }
    }

    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession.id, status])

  // ─── Refresh history on visibilitychange ─────────────────────────────────
  const refreshOnVisibleRef = useRef<() => void>(() => {})
  useEffect(() => {
    refreshOnVisibleRef.current = async () => {
      if (status !== ConnectionStatus.CONNECTED) return
      try {
        const response = (await getChatHistory(
          activeSession.sessionKey,
          200
        )) as ChatHistoryResponse
        if (
          response?.payload?.messages &&
          response.payload.messages.length > 0
        ) {
          setSessionMessages((prev) => ({
            ...prev,
            [activeSession.id]: convertHistoryMessages(
              response.payload!.messages!
            )
          }))
        }
      } catch (error) {
        console.log('[Session] Failed to refresh history on visibility:', error)
      }
    }
  })

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Session] Window visible, refreshing history...')
        refreshOnVisibleRef.current()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // ─── Session CRUD ─────────────────────────────────────────────────────────
  const switchSession = useCallback(
    async (sessionId: string) => {
      if (currentMessages.length > 0) {
        setSessionMessages((prev) => ({
          ...prev,
          [activeSession.id]: currentMessages
        }))
      }
      setActiveSessionId(sessionId)
      await emit('session-changed', { sessionId, activeSessionId: sessionId })
    },
    [activeSession.id, currentMessages, setSessionMessages, setActiveSessionId]
  )

  const createSession = useCallback(
    async (
      config: Omit<
        SessionConfig,
        'id' | 'createdAt' | 'lastActiveAt' | 'active' | 'sessionKey'
      >
    ) => {
      const workspace = `~/.openclaw/workspace-${toAgentId(config.name)}`
      const response = (await createGatewayAgent(config.name, workspace)) as {
        payload?: { agentId: string; name: string; workspace: string }
      }
      const agentId = response?.payload?.agentId
      if (!agentId) throw new Error('agents.create did not return an agentId')

      const sessionKey = `agent:${agentId}:main`
      const newSession: SessionConfig = {
        ...config,
        id: `agent-${agentId}`,
        active: true,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        sessionKey
      }
      setSessions((prev) => [...prev, newSession])
      await emit('session-changed', { sessionId: newSession.id })
      return newSession
    },
    [createGatewayAgent, setSessions]
  )

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId)
      if (!session) throw new Error(`Session ${sessionId} not found`)
      if (session.type === SessionType.MAIN)
        throw new Error('Cannot delete main session')

      const agentId = session.sessionKey.split(':')[1]
      console.log(
        `[Session] Deleting agent: ${session.name} (agentId: ${agentId})`
      )

      try {
        await deleteGatewayAgent(agentId, true)
        console.log('[Session] Agent deleted from Gateway')
      } catch (error) {
        console.error('[Session] Failed to delete agent from Gateway:', error)
        alert(
          `Failed to delete agent from Gateway.\nSession key: ${session.sessionKey}`
        )
      }

      if (activeSession.id === sessionId) {
        const mainSession = sessions.find(
          (s) => s.type === SessionType.MAIN && s.id !== sessionId
        )
        if (mainSession) setActiveSessionId(mainSession.id)
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      setSessionMessages((prev) => {
        const updated = { ...prev }
        delete updated[sessionId]
        return updated
      })

      await emit('session-changed', { sessionId: null })
    },
    [
      sessions,
      activeSession,
      deleteGatewayAgent,
      setSessions,
      setSessionMessages,
      setActiveSessionId
    ]
  )

  // Switch directly to a session key (for cron/DM sessions)
  const switchToSessionKey = useCallback(
    async (key: string, label?: string) => {
      const existing = sessions.find((s) => s.sessionKey === key)
      if (existing) {
        // Update label if provided and not already set
        if (label && !existing.label) {
          setSessions((prev) =>
            prev.map((s) => (s.sessionKey === key ? { ...s, label } : s))
          )
        }
        await switchSession(existing.id)
        return
      }

      const parts = key.split(':')
      const agentId = parts[1] ?? 'unknown'
      const sessionSuffix = parts.slice(2).join(':')
      const transientId = `key-${key.replace(/[^a-z0-9]/gi, '-')}`

      const transientSession: SessionConfig = {
        id: transientId,
        name: `${agentId} / ${sessionSuffix}`,
        label,
        type: SessionType.TASK,
        sessionKey: key,
        active: true,
        createdAt: Date.now(),
        lastActiveAt: Date.now()
      }

      if (currentMessages.length > 0) {
        setSessionMessages((prev) => ({
          ...prev,
          [activeSession.id]: currentMessages
        }))
      }

      setSessions((prev) => {
        const filtered = prev.filter((s) => s.sessionKey !== key)
        return [...filtered, transientSession]
      })
      setActiveSessionId(transientId)
      await emit('session-key-switched', { sessionKey: key, label })
    },
    [
      sessions,
      activeSession,
      currentMessages,
      switchSession,
      setSessions,
      setSessionMessages,
      setActiveSessionId
    ]
  )

  // ─── Auto-switch on background session completion ─────────────────────────
  // Keep callback ref current every render so it always closes over the latest
  // switchToSessionKey (handles both known sessions and cron/transient keys).
  useEffect(() => {
    onBackgroundSessionFinalRef.current = async (key: string) => {
      console.log('[Session] Background session completed, switching to:', key)
      await switchToSessionKey(key)
    }
  })

  // ─── Message operations ───────────────────────────────────────────────────
  const sendMessage = useCallback(
    (content: string, sessionKey?: string) => {
      const key = sessionKey || activeSession.sessionKey
      console.log(`[Session] Sending to: ${key}`)
      sendMessageRaw(content, key)
    },
    [activeSession, sendMessageRaw]
  )

  const clearMessages = useCallback(() => {
    clearCurrentMessages()
    setSessionMessages((prev) => ({ ...prev, [activeSession.id]: [] }))
  }, [activeSession, clearCurrentMessages, setSessionMessages])

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    sessions,
    activeSession,
    sessionsLoading,
    switchSession,
    switchToSessionKey,
    createSession,
    deleteSession,
    syncSessionsFromGateway,
    listGatewaySessions,

    status,
    serverVersion,
    messages,
    isStreaming,
    isHistoryLoading,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    clearMessages,
    currentSessionKey
  }
}
