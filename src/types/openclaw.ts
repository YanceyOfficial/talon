/**
 * OpenClaw WebSocket Message Types
 * Based on OpenClaw Gateway API
 */

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL_RESULT = 'toolResult',
  SYSTEM = 'system'
}

// Content block types
export interface TextBlock {
  type: 'text'
  text: string
  textSignature?: string
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  thinkingSignature?: string
}

export interface ToolCallBlock {
  type: 'toolCall'
  id: string
  name: string
  arguments: Record<string, unknown>
  partialJson?: string
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolCallBlock

export interface OpenClawMessage {
  role: MessageRole | string
  content: string | ContentBlock[] // Can be string or structured blocks
  session_id?: string
  timestamp?: number
  metadata?: Record<string, unknown>
  isFinal?: boolean // For streaming messages

  // For toolResult messages
  toolCallId?: string
  toolName?: string
  details?: Record<string, unknown>
  isError?: boolean

  // Meta information
  api?: string
  provider?: string
  model?: string
  usage?: {
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
  stopReason?: string
}

export interface OpenClawSession {
  session_id: string
  created_at: number
  model?: string
  temperature?: number
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export interface OpenClawConfig {
  gatewayUrl: string
  reconnectInterval: number
  maxReconnectAttempts: number
}
