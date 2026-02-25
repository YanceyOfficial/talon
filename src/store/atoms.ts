/**
 * Jotai atoms for in-window state management.
 *
 * Note: Tauri windows are isolated processes — atoms are NOT shared
 * across windows. Cross-window sync still uses Tauri events.
 * The activeSessionId is additionally persisted to Tauri Store so
 * newly-opened windows (e.g. chat window) start on the correct session.
 */

import type { OpenClawMessage } from '@/types/openclaw'
import { SessionConfig, SessionType } from '@/types/session'
import { atom } from 'jotai'

export const DEFAULT_MAIN_SESSION: SessionConfig = {
  id: 'main',
  name: 'Default Chat',
  type: SessionType.MAIN,
  sessionKey: 'agent:main:main',
  description: 'Default chat session',
  active: true,
  createdAt: Date.now(),
  lastActiveAt: Date.now(),
  memoryEnabled: true,
  autoCompact: true,
  compactThreshold: 180000,
  resetPolicy: { mode: 'idle', idleMinutes: 240 }
}

/** Configured agent sessions (populated from Gateway on connect). */
export const sessionsAtom = atom<SessionConfig[]>([DEFAULT_MAIN_SESSION])

/** ID of the currently active session. */
export const activeSessionIdAtom = atom<string>('main')

/** Per-session message cache keyed by session ID. */
export const sessionMessagesAtom = atom<Record<string, OpenClawMessage[]>>({})

/** Whether the session list is being loaded from Gateway. */
export const sessionsLoadingAtom = atom<boolean>(false)
