import {
  buildDevicePayload,
  loadDeviceAuthToken,
  loadOrCreateDeviceIdentity,
  signDevicePayload,
  storeDeviceAuthToken
} from '@/lib/device-identity'
import {
  extractText,
  markLastMessageFinal,
  updateAssistantMessage
} from '@/lib/message-utils'
import { getSettings } from '@/lib/store'
import type {
  EventFrame,
  Frame,
  ResponseFrame,
  SessionUsageResponse
} from '@/types/gateway'
import {
  ConnectionStatus,
  MessageRole,
  OpenClawConfig,
  OpenClawMessage
} from '@/types/openclaw'
import { format, subDays } from 'date-fns'
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidV4 } from 'uuid'

const DEFAULT_CONFIG: OpenClawConfig = {
  gatewayUrl: 'ws://localhost:18789',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5
}

export function useOpenClaw(
  config: Partial<OpenClawConfig> = {},
  sessionKey: string = 'agent:main:main'
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const [status, setStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  )
  const [serverVersion, setServerVersion] = useState<string | null>(null)
  const [messages, setMessages] = useState<OpenClawMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [gatewayUrl, setGatewayUrl] = useState<string>(fullConfig.gatewayUrl)
  const [currentSessionKey, setCurrentSessionKey] = useState<string>(sessionKey)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const pendingRequestsRef = useRef<
    Map<
      string,
      { resolve: (value: unknown) => void; reject: (error: unknown) => void }
    >
  >(new Map())

  // Load gateway URL from settings
  useEffect(() => {
    getSettings().then((settings) => {
      if (settings.gatewayUrl) {
        setGatewayUrl(settings.gatewayUrl)
      }
    })
  }, [])

  const connectRef = useRef<(() => void) | undefined>(undefined)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setStatus(ConnectionStatus.CONNECTING)

    try {
      const ws = new WebSocket(gatewayUrl)

      ws.onopen = () => {
        console.log(
          '[OpenClaw] WebSocket opened, waiting for connect.challenge'
        )
        // Don't send connect immediately, wait for connect.challenge event
      }

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as Frame
          console.log('[OpenClaw] Received:', frame)

          switch (frame.type) {
            case 'res':
              handleResponse(frame)
              break
            case 'event':
              handleEvent(frame)
              break
            default:
              console.warn(
                '[OpenClaw] Unknown frame type:',
                (frame as { type?: string }).type
              )
          }
        } catch (error) {
          console.error('[OpenClaw] Failed to parse message:', error)
        }
      }

      // Handle response frames
      function handleResponse(frame: ResponseFrame) {
        // Check for successful connection
        if (frame.ok && frame.payload?.type === 'hello-ok') {
          console.log('[OpenClaw] Connected to gateway')
          setStatus(ConnectionStatus.CONNECTED)
          reconnectAttemptsRef.current = 0

          // Capture server version
          if (frame.payload?.server?.version) {
            setServerVersion(frame.payload.server.version)
          }

          // Save device token if provided
          if (frame.payload?.auth?.deviceToken) {
            saveDeviceToken(frame.payload.auth.deviceToken)
          }
        } else if (frame.error) {
          console.error('[OpenClaw] Connection error:', frame.error)
          setStatus(ConnectionStatus.ERROR)
        }

        // Resolve or reject pending request
        const pending = pendingRequestsRef.current.get(frame.id)
        if (pending) {
          if (frame.ok) {
            pending.resolve(frame)
          } else {
            pending.reject(frame.error || new Error('Unknown error'))
          }
          pendingRequestsRef.current.delete(frame.id)
        }
      }

      // Handle event frames
      function handleEvent(frame: EventFrame) {
        switch (frame.event) {
          case 'connect.challenge':
            handleConnectChallenge(frame.payload?.nonce || '')
            break
          case 'agent':
            handleAgentEvent(frame.payload)
            break
          case 'chat':
            handleChatEvent(frame.payload)
            break
          default:
            console.log('[OpenClaw] Unhandled event:', frame.event)
        }
      }

      // Handle connect.challenge event
      function handleConnectChallenge(nonce: string) {
        console.log('[OpenClaw] Received challenge, sending connect request')
        ;(async () => {
          try {
            const identity = await loadOrCreateDeviceIdentity()
            console.log('identity', identity)

            // Client configuration (based on ClawControl)
            const config = {
              clientId: 'gateway-client',
              clientMode: 'backend',
              role: 'operator',
              scopes: ['operator.read', 'operator.write', 'operator.admin']
            }

            // Get authentication token from settings
            const settings = await getSettings()
            const sharedToken = settings.token

            const savedToken = await loadDeviceAuthToken({
              deviceId: identity.deviceId,
              role: config.role,
              scope: config.scopes.join(',')
            })

            const token = savedToken?.token || sharedToken
            const signedAt = Date.now()

            // Build and sign payload
            const payload = buildDevicePayload({
              deviceId: identity.deviceId,
              clientId: config.clientId,
              clientMode: config.clientMode,
              role: config.role,
              scopes: config.scopes,
              signedAt,
              token,
              nonce
            })

            const signature = await signDevicePayload(
              identity.privateKey,
              payload
            )

            // Send connect request
            const connectReq = {
              type: 'req',
              id: uuidV4(),
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                role: config.role,
                scopes: config.scopes,
                client: {
                  id: config.clientId,
                  displayName: 'Clippy',
                  version: '1.0.0',
                  platform: 'desktop',
                  mode: config.clientMode
                },
                auth: { token },
                device: {
                  id: identity.deviceId,
                  publicKey: identity.publicKey,
                  signature,
                  signedAt,
                  nonce
                }
              }
            }

            console.log('[OpenClaw] Sending connect request', {
              deviceId: identity.deviceId,
              ...config,
              signedAt
            })

            ws.send(JSON.stringify(connectReq))
          } catch (error) {
            console.error('[OpenClaw] Failed to build device identity:', error)
            setStatus(ConnectionStatus.ERROR)
          }
        })()
      }

      // Handle agent streaming events
      function handleAgentEvent(payload: EventFrame['payload']) {
        const text = payload?.data?.text // Cumulative text
        const stream = payload?.stream

        // Only process assistant stream
        if (stream === 'assistant' && text) {
          setIsStreaming(true)
          setMessages((prev) => updateAssistantMessage(prev, text, false))
        }
      }

      // Handle chat state events
      function handleChatEvent(payload: EventFrame['payload']) {
        const state = payload?.state

        switch (state) {
          case 'delta': {
            // Streaming chunk (fallback, mainly handled by agent events)
            setIsStreaming(true)
            const text = extractText(payload?.message?.content)
            if (text) {
              setMessages((prev) => updateAssistantMessage(prev, text, false))
            }
            break
          }

          case 'final':
            // Mark message as complete
            setIsStreaming(false)
            setMessages((prev) => markLastMessageFinal(prev))
            break

          case 'error': {
            // Handle error
            setIsStreaming(false)
            const errorMsg = payload?.errorMessage || 'Unknown error'
            setMessages((prev) => [
              ...prev,
              {
                role: MessageRole.ASSISTANT,
                content: `Error: ${errorMsg}`,
                timestamp: Date.now(),
                isFinal: true
              }
            ])
            break
          }

          default:
            console.log('[OpenClaw] Unhandled chat state:', state)
        }
      }

      // Save device token to localStorage
      async function saveDeviceToken(deviceToken: string) {
        try {
          const identity = await loadOrCreateDeviceIdentity()
          const scopes = ['operator.read', 'operator.write']

          storeDeviceAuthToken({
            deviceId: identity.deviceId,
            role: 'operator',
            scope: scopes.join(','),
            token: deviceToken,
            scopes
          })

          console.log('[OpenClaw] Saved device token')
        } catch (error) {
          console.error('[OpenClaw] Failed to save device token:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[OpenClaw] WebSocket error:', error)
        setStatus(ConnectionStatus.ERROR)
      }

      ws.onclose = () => {
        console.log('[OpenClaw] Connection closed')
        setStatus(ConnectionStatus.DISCONNECTED)
        wsRef.current = null

        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < fullConfig.maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(
            `[OpenClaw] Reconnecting... (${reconnectAttemptsRef.current}/${fullConfig.maxReconnectAttempts})`
          )
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current?.()
          }, fullConfig.reconnectInterval)
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('[OpenClaw] Failed to connect:', error)
      setStatus(ConnectionStatus.ERROR)
    }
  }, [
    gatewayUrl,
    fullConfig.reconnectInterval,
    fullConfig.maxReconnectAttempts
  ])

  // Store connect ref for reconnection
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus(ConnectionStatus.DISCONNECTED)
  }, [])

  // Re-read settings, update URL, then reconnect cleanly
  const reconnect = useCallback(async () => {
    console.log('[OpenClaw] Reconnecting with fresh settings...')

    // Cancel pending reconnect timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }

    // Close existing connection without triggering auto-reconnect
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus(ConnectionStatus.DISCONNECTED)
    reconnectAttemptsRef.current = 0

    // Read fresh settings and update URL state
    const newSettings = await getSettings()
    if (newSettings.gatewayUrl) {
      setGatewayUrl(newSettings.gatewayUrl)
    }

    // Delay so React can re-render with the new URL and update connectRef
    setTimeout(() => {
      connectRef.current?.()
    }, 100)
  }, [])

  const sendMessage = useCallback(
    (content: string, targetSessionKey?: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        console.error('[OpenClaw] Cannot send message: not connected')
        return
      }

      const sessionKeyToUse = targetSessionKey || currentSessionKey

      // Add user message to UI immediately
      setMessages((prev) => [
        ...prev,
        {
          role: MessageRole.USER,
          content,
          timestamp: Date.now()
        }
      ])
      setIsStreaming(true)

      // Build and send chat request
      const req = {
        type: 'req',
        id: uuidV4(),
        method: 'chat.send',
        params: {
          sessionKey: sessionKeyToUse,
          message: content,
          deliver: false,
          idempotencyKey: uuidV4()
        }
      }

      try {
        console.log('[OpenClaw] Sending to session:', sessionKeyToUse, req)
        wsRef.current.send(JSON.stringify(req))
      } catch (error) {
        console.error('[OpenClaw] Failed to send message:', error)
        setIsStreaming(false)
      }
    },
    [currentSessionKey]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Generic method to call Gateway API
  const callGateway = useCallback(
    (method: string, params: unknown = {}): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          reject(new Error('Not connected to gateway'))
          return
        }

        const requestId = uuidV4()
        const req = {
          type: 'req',
          id: requestId,
          method,
          params
        }

        // Store pending request
        pendingRequestsRef.current.set(requestId, { resolve, reject })

        // Set timeout
        const timeout = setTimeout(() => {
          pendingRequestsRef.current.delete(requestId)
          reject(new Error('Request timeout'))
        }, 30000) // 30 seconds timeout

        // Send request
        try {
          console.log('[OpenClaw] Calling Gateway API:', method, params)
          wsRef.current.send(JSON.stringify(req))

          // Clear timeout on resolution
          const originalResolve = resolve
          const originalReject = reject
          pendingRequestsRef.current.set(requestId, {
            resolve: (value) => {
              clearTimeout(timeout)
              originalResolve(value)
            },
            reject: (error) => {
              clearTimeout(timeout)
              originalReject(error)
            }
          })
        } catch (error) {
          clearTimeout(timeout)
          pendingRequestsRef.current.delete(requestId)
          reject(error)
        }
      })
    },
    []
  )

  // List all configured agents (agents.list)
  const listGatewayAgents = useCallback(async () => {
    try {
      const response = await callGateway('agents.list', {})
      console.log('[OpenClaw] Agents list:', response)
      return response
    } catch (error) {
      console.error('[OpenClaw] Failed to list agents:', error)
      throw error
    }
  }, [callGateway])

  // Create a new agent (agents.create)
  const createGatewayAgent = useCallback(
    async (name: string, workspace: string, emoji?: string) => {
      try {
        const params: Record<string, string> = { name, workspace }
        if (emoji) params.emoji = emoji
        const response = await callGateway('agents.create', params)
        console.log('[OpenClaw] Agent created:', response)
        return response
      } catch (error) {
        console.error('[OpenClaw] Failed to create agent:', error)
        throw error
      }
    },
    [callGateway]
  )

  // Delete an agent (agents.delete)
  const deleteGatewayAgent = useCallback(
    async (agentId: string, deleteFiles: boolean = true) => {
      try {
        const response = await callGateway('agents.delete', {
          agentId,
          deleteFiles
        })
        console.log('[OpenClaw] Agent deleted:', response)
        return response
      } catch (error) {
        console.error('[OpenClaw] Failed to delete agent:', error)
        throw error
      }
    },
    [callGateway]
  )

  // Get chat history
  const getChatHistory = useCallback(
    async (sessionKey: string, limit: number = 200) => {
      try {
        const response = await callGateway('chat.history', {
          sessionKey,
          limit
        })
        console.log('[OpenClaw] Chat history:', response)
        return response
      } catch (error) {
        console.error('[OpenClaw] Failed to get chat history:', error)
        throw error
      }
    },
    [callGateway]
  )

  // Get usage stats for a specific session key (sessions.usage)
  const getSessionUsage = useCallback(
    async (targetSessionKey: string, startDate?: Date, endDate?: Date) => {
      const now = new Date()
      const end = format(endDate ?? now, 'yyyy-MM-dd')
      const start = format(startDate ?? subDays(now, 1), 'yyyy-MM-dd')
      const offsetMinutes = -now.getTimezoneOffset()
      const offsetHours = offsetMinutes / 60
      const utcOffset = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`

      const response = (await callGateway('sessions.usage', {
        startDate: start,
        endDate: end,
        mode: 'specific',
        utcOffset,
        limit: 1000,
        includeContextWeight: true
      })) as SessionUsageResponse

      const session = response?.payload?.sessions?.find((s) =>
        s.key.startsWith(targetSessionKey)
      )

      console.log('sessions.usage', session)
      return session?.usage ?? null
    },
    [callGateway]
  )

  // List all sessions from Gateway (sessions.list)
  const listGatewaySessions = useCallback(async () => {
    try {
      const response = await callGateway('sessions.list', {})
      console.log('[OpenClaw] Sessions list:', response)
      return response
    } catch (error) {
      console.error('[OpenClaw] Failed to list sessions:', error)
      throw error
    }
  }, [callGateway])

  // Delete a session from Gateway
  const deleteGatewaySession = useCallback(
    async (sessionKey: string, deleteTranscript: boolean = true) => {
      try {
        const response = await callGateway('sessions.delete', {
          key: sessionKey,
          deleteTranscript
        })
        console.log('[OpenClaw] Session deleted from Gateway:', response)
        return response
      } catch (error) {
        console.error(
          '[OpenClaw] Failed to delete session from Gateway:',
          error
        )
        throw error
      }
    },
    [callGateway]
  )

  // Switch to a different session
  const switchToSession = useCallback((sessionKey: string) => {
    console.log('[OpenClaw] Switching to session:', sessionKey)
    setCurrentSessionKey(sessionKey)
    setMessages([]) // Clear current messages when switching
    setIsStreaming(false) // Reset streaming state
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    connect()
    return () => {
      disconnect()
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [connect, disconnect])

  return {
    status,
    serverVersion,
    messages,
    isStreaming,
    currentSessionKey,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    clearMessages,
    callGateway,
    listGatewayAgents,
    createGatewayAgent,
    deleteGatewayAgent,
    listGatewaySessions,
    getChatHistory,
    getSessionUsage,
    deleteGatewaySession,
    switchToSession
  }
}
