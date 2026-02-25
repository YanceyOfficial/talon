/**
 * Session types for OpenClaw multi-session management
 */

export enum SessionType {
  MAIN = 'main', // Default chat session
  TASK = 'task', // Periodic/scheduled tasks
  AGENT = 'agent' // Specialized agent sessions
}

export interface SessionConfig {
  id: string // Unique session identifier
  name: string // Display name
  type: SessionType
  sessionKey: string // OpenClaw session key (e.g., "agent:main:main") — assigned by Gateway on create
  description?: string
  active: boolean
  createdAt: number
  lastActiveAt: number

  // Task-specific config
  schedule?: {
    type: 'daily' | 'interval' | 'cron'
    time?: string // For daily: "08:00"
    intervalMinutes?: number // For interval
    cronExpression?: string // For cron
  }

  // Memory config
  memoryEnabled?: boolean
  autoCompact?: boolean
  compactThreshold?: number // Token count to trigger compaction

  // Reset policy
  resetPolicy?: {
    mode: 'daily' | 'idle' | 'never'
    atHour?: number // For daily
    idleMinutes?: number // For idle
  }
}

export interface SessionStats {
  sessionId: string
  tokenCount: number
  messageCount: number
  compactionCount: number
  lastCompactedAt?: number
}

export interface SessionListItem {
  config: SessionConfig
  stats?: SessionStats
}
