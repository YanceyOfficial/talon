/**
 * Device Identity Management for OpenClaw Gateway
 * Based on openclaw-studio implementation
 * Uses Tauri Store for secure persistent storage
 */

import { getPublicKeyAsync, signAsync, utils } from '@noble/ed25519'
import { STORE_KEYS, storeDelete, storeGet, storeSet } from './store'

// Types
export interface DeviceIdentity {
  deviceId: string
  publicKey: string // base64url encoded
  privateKey: string // base64url encoded
  createdAtMs: number
}

interface StoredIdentity {
  version: 1
  deviceId: string
  publicKey: string
  privateKey: string
  createdAtMs: number
}

interface DeviceAuthEntry {
  deviceId: string
  role: string
  scope: string
  token: string
  scopes?: string[]
  createdAtMs: number
}

// ============================================================================
// Encoding Utilities
// ============================================================================

// Convert bytes to Base64URL (for public keys and signatures)
function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Convert Base64URL to bytes
function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  return new Uint8Array(binary.split('').map((c) => c.charCodeAt(0)))
}

// Convert ArrayBuffer to hex string (for device IDs)
function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ============================================================================
// Device Identity Generation
// ============================================================================

// Generate SHA-256 fingerprint from public key (hex format, ClawControl compatible)
async function fingerprintPublicKey(publicKey: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', publicKey as BufferSource)
  return toHex(hashBuffer)
}

// Generate new device identity
async function generateIdentity(): Promise<DeviceIdentity> {
  const privateKey = utils.randomSecretKey()
  const publicKey = await getPublicKeyAsync(privateKey)
  const deviceId = await fingerprintPublicKey(publicKey)

  return {
    deviceId,
    publicKey: base64UrlEncode(publicKey),
    privateKey: base64UrlEncode(privateKey),
    createdAtMs: Date.now()
  }
}

// ============================================================================
// Device Identity Management
// ============================================================================

// Load existing identity or generate a new one
export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  // Migrate from old v1 format (base64url device IDs)
  migrateFromV1()

  // Try to load existing identity
  const existingIdentity = await loadExistingIdentity()
  if (existingIdentity) {
    return existingIdentity
  }

  // Generate and save new identity
  return await createNewIdentity()
}

// Migrate from v1 (base64url) to v2 (hex) format
async function migrateFromV1() {
  // Migration is now handled by store.ts migrateFromLocalStorage()
  // This function is kept for backward compatibility
}

// Load and validate existing identity
async function loadExistingIdentity(): Promise<DeviceIdentity | null> {
  try {
    const identity = await storeGet<StoredIdentity>(STORE_KEYS.DEVICE_IDENTITY)
    if (!identity) return null

    // Validate fingerprint
    const publicKeyBytes = base64UrlDecode(identity.publicKey)
    const expectedDeviceId = await fingerprintPublicKey(publicKeyBytes)

    if (identity.deviceId !== expectedDeviceId) {
      console.warn(
        '[DeviceIdentity] Fingerprint mismatch, regenerating identity'
      )
      return null
    }

    console.log('[DeviceIdentity] Loaded existing identity:', identity.deviceId)
    return {
      deviceId: identity.deviceId,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey,
      createdAtMs: identity.createdAtMs
    }
  } catch (error) {
    console.error('[DeviceIdentity] Failed to load identity:', error)
    return null
  }
}

// Create and save new identity
async function createNewIdentity(): Promise<DeviceIdentity> {
  console.log('[DeviceIdentity] Generating new identity (v2 hex format)')
  const identity = await generateIdentity()

  const stored: StoredIdentity = {
    version: 1,
    deviceId: identity.deviceId,
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    createdAtMs: identity.createdAtMs
  }
  await storeSet(STORE_KEYS.DEVICE_IDENTITY, stored)

  console.log('[DeviceIdentity] Generated new identity:', identity.deviceId)
  return identity
}

// ============================================================================
// Device Payload Signing
// ============================================================================

// Build device authentication payload (v2 format, ClawControl compatible)
export function buildDevicePayload(params: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAt: number
  token: string
  nonce: string
}): string {
  const {
    deviceId,
    clientId,
    clientMode,
    role,
    scopes,
    signedAt,
    token,
    nonce
  } = params
  // Format: v2|deviceId|clientId|mode|role|scopes|signedAtMs|token|nonce
  return `v2|${deviceId}|${clientId}|${clientMode}|${role}|${scopes.join(',')}|${signedAt}|${token}|${nonce}`
}

// Sign device payload with Ed25519 private key
export async function signDevicePayload(
  privateKeyBase64Url: string,
  payload: string
): Promise<string> {
  const privateKey = base64UrlDecode(privateKeyBase64Url)
  const data = new TextEncoder().encode(payload)
  const signature = await signAsync(data, privateKey)
  return base64UrlEncode(signature)
}

// ============================================================================
// Device Token Management
// ============================================================================

// Store device authentication token
export async function storeDeviceAuthToken(params: {
  deviceId: string
  role: string
  scope: string
  token: string
  scopes?: string[]
}): Promise<DeviceAuthEntry> {
  const entry: DeviceAuthEntry = {
    deviceId: params.deviceId,
    role: params.role,
    scope: params.scope,
    token: params.token,
    scopes: params.scopes,
    createdAtMs: Date.now()
  }

  try {
    const tokens =
      (await storeGet<Record<string, DeviceAuthEntry>>(
        STORE_KEYS.DEVICE_AUTH_TOKENS
      )) || {}
    const key = buildTokenKey(params)

    tokens[key] = entry
    await storeSet(STORE_KEYS.DEVICE_AUTH_TOKENS, tokens)
    console.log('[DeviceAuth] Stored token for:', key)
  } catch (error) {
    console.error('[DeviceAuth] Failed to store token:', error)
  }

  return entry
}

// Load device authentication token
export async function loadDeviceAuthToken(params: {
  deviceId: string
  role: string
  scope: string
}): Promise<DeviceAuthEntry | null> {
  try {
    const tokens = await storeGet<Record<string, DeviceAuthEntry>>(
      STORE_KEYS.DEVICE_AUTH_TOKENS
    )
    if (!tokens) return null

    const key = buildTokenKey(params)
    return tokens[key] || null
  } catch (error) {
    console.error('[DeviceAuth] Failed to load token:', error)
    return null
  }
}

// Build token storage key
function buildTokenKey(params: {
  deviceId: string
  role: string
  scope: string
}): string {
  return `${params.deviceId}:${params.role}:${params.scope}`
}

// Clear all device identity and tokens (for re-pairing)
export async function clearDeviceIdentity(): Promise<void> {
  await storeDelete(STORE_KEYS.DEVICE_IDENTITY)
  await storeDelete(STORE_KEYS.DEVICE_AUTH_TOKENS)
  console.log('[DeviceIdentity] Cleared identity and tokens')
}
