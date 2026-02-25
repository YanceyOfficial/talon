/**
 * Session Manager Utilities
 */

/**
 * Convert a display name to a URL-safe agent ID.
 * e.g., "Stock Research" → "stock-research"
 */
export function toAgentId(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'agent'
  )
}

/**
 * Gateway session info from sessions.list response
 */
export interface GatewaySessionInfo {
  key: string
  createdAt?: number
  lastActiveAt?: number
  messageCount?: number
}
