/**
 * Tauri Store wrapper for secure persistent storage
 * Replaces localStorage with encrypted storage
 */

import { Store } from '@tauri-apps/plugin-store'

// Store keys
export const STORE_KEYS = {
  DEVICE_IDENTITY: 'openclaw-device-identity-v2',
  DEVICE_AUTH_TOKENS: 'openclaw-device-auth-tokens-v2',
  OPENCLAW_TOKEN: 'openclaw-token',
  GATEWAY_URL: 'gateway-url',
  SETTINGS: 'settings',
  ACTIVE_SESSION_ID: 'activeSessionId'
} as const

// Settings interface
export interface AppSettings {
  gatewayUrl: string
  token: string
  hotkey?: string
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  gatewayUrl: 'ws://localhost:18789',
  token: '',
  hotkey: ''
}

let storeInstance: Store | null = null

// Initialize store
async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load('store.json')
  }
  return storeInstance
}

// ============================================================================
// Generic Store Operations
// ============================================================================

export async function storeGet<T>(key: string): Promise<T | null> {
  try {
    const store = await getStore()
    const value = await store.get<T>(key)
    return value ?? null
  } catch (error) {
    console.error(`[Store] Failed to get ${key}:`, error)
    return null
  }
}

export async function storeSet<T>(key: string, value: T): Promise<void> {
  try {
    const store = await getStore()
    await store.set(key, value)
    await store.save()
  } catch (error) {
    console.error(`[Store] Failed to set ${key}:`, error)
  }
}

export async function storeDelete(key: string): Promise<void> {
  try {
    const store = await getStore()
    await store.delete(key)
    await store.save()
  } catch (error) {
    console.error(`[Store] Failed to delete ${key}:`, error)
  }
}

export async function storeClear(): Promise<void> {
  try {
    const store = await getStore()
    await store.clear()
    await store.save()
  } catch (error) {
    console.error('[Store] Failed to clear:', error)
  }
}

// ============================================================================
// Settings Operations
// ============================================================================

export async function getSettings(): Promise<AppSettings> {
  const settings = await storeGet<AppSettings>(STORE_KEYS.SETTINGS)
  return settings || DEFAULT_SETTINGS
}

export async function saveSettings(
  settings: Partial<AppSettings>
): Promise<void> {
  const current = await getSettings()
  const updated = { ...current, ...settings }
  await storeSet(STORE_KEYS.SETTINGS, updated)
}

// ============================================================================
// Active Session ID (for cross-window handoff on window open)
// ============================================================================

export async function getActiveSessionId(): Promise<string | null> {
  return storeGet<string>(STORE_KEYS.ACTIVE_SESSION_ID)
}

export async function saveActiveSessionId(id: string): Promise<void> {
  await storeSet(STORE_KEYS.ACTIVE_SESSION_ID, id)
}

// ============================================================================
// Migration from localStorage
// ============================================================================

export async function migrateFromLocalStorage(): Promise<void> {
  console.log('[Store] Migrating from localStorage...')

  try {
    // Migrate device identity
    const deviceIdentity = localStorage.getItem(STORE_KEYS.DEVICE_IDENTITY)
    if (deviceIdentity) {
      await storeSet(STORE_KEYS.DEVICE_IDENTITY, JSON.parse(deviceIdentity))
      localStorage.removeItem(STORE_KEYS.DEVICE_IDENTITY)
    }

    // Migrate device auth tokens
    const authTokens = localStorage.getItem(STORE_KEYS.DEVICE_AUTH_TOKENS)
    if (authTokens) {
      await storeSet(STORE_KEYS.DEVICE_AUTH_TOKENS, JSON.parse(authTokens))
      localStorage.removeItem(STORE_KEYS.DEVICE_AUTH_TOKENS)
    }

    // Migrate OpenClaw token
    const openclawToken = localStorage.getItem(STORE_KEYS.OPENCLAW_TOKEN)
    if (openclawToken) {
      await saveSettings({ token: openclawToken })
      localStorage.removeItem(STORE_KEYS.OPENCLAW_TOKEN)
    }

    // Clean up old v1 keys
    localStorage.removeItem('openclaw-device-identity-v1')
    localStorage.removeItem('openclaw-device-auth-tokens-v1')

    console.log('[Store] Migration completed')
  } catch (error) {
    console.error('[Store] Migration failed:', error)
  }
}
