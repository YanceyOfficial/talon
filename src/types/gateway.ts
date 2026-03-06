/**
 * OpenClaw Gateway WebSocket Protocol Types
 */

// ─── WebSocket Frame Types ─────────────────────────────────────────────────

export interface ResponseFrame {
  type: 'res'
  id: string
  ok?: boolean
  error?: { code: string; message: string }
  payload?: {
    type?: string
    server?: { version?: string }
    auth?: { deviceToken?: string }
  }
}

export interface EventFrame {
  type: 'event'
  event: string
  payload?: {
    nonce?: string
    sessionKey?: string
    data?: { text?: string; delta?: string }
    stream?: string
    runId?: string
    seq?: number
    ts?: number
    state?: string
    message?: { content?: unknown }
    errorMessage?: string
  }
}

export type Frame = ResponseFrame | EventFrame

// ─── API Response Types ────────────────────────────────────────────────────

export interface MessageUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  cost: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    total: number
  }
}

export interface ChatHistoryMessage {
  role: string
  content: unknown
  timestamp?: number
  toolCallId?: string
  toolName?: string
  details?: Record<string, unknown>
  isError?: boolean
  api?: string
  provider?: string
  model?: string
  usage?: MessageUsage
  stopReason?: string
}

export interface ChatHistoryResponse {
  payload?: {
    messages?: ChatHistoryMessage[]
  }
}

export interface SessionUsage {
  totalTokens: number
  totalCost: number
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  modelUsage?: Array<{ provider: string; model: string }>
}

export interface SessionUsageResponse {
  payload?: {
    sessions?: Array<{
      key: string
      usage?: SessionUsage
    }>
  }
}

export interface GatewayAgent {
  id: string
  name?: string
  identity?: { name?: string; emoji?: string }
}

export interface GatewayAgentsListResponse {
  payload?: {
    defaultId: string
    mainKey: string
    agents: GatewayAgent[]
  }
}

export interface GatewaySession {
  key: string
  label?: string
  displayName?: string
  kind?: string
  chatType?: string
  model?: string
  modelProvider?: string
  contextTokens?: number
  totalTokens?: number
  updatedAt?: number
}

export interface GatewaySessionsListResponse {
  payload?: {
    sessions?: GatewaySession[]
  }
}
