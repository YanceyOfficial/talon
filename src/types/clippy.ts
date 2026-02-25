/**
 * Clippy Animation and State Types
 */

export enum ClippyState {
  IDLE = 'idle',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface WindowPosition {
  x: number
  y: number
}
