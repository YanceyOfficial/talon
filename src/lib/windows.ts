/**
 * Window management utilities
 */

import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

let settingsWindowInstance: WebviewWindow | null = null
let settingsWindowSessionKey: string | null = null
let chatWindowInstance: WebviewWindow | null = null
let chatWindowSessionKey: string | null = null
let chatWindowClosingIntentionally = false

export async function openSettingsWindow(sessionKey?: string) {
  // Check if settings window already exists and is valid
  if (settingsWindowInstance) {
    if (settingsWindowSessionKey === (sessionKey ?? null)) {
      try {
        await settingsWindowInstance.setFocus()
        return
      } catch {
        // Window was closed, reset the reference
      }
    } else {
      // Different session — close and reopen
      try {
        await settingsWindowInstance.close()
      } catch {
        /* ignore */
      }
    }
    settingsWindowInstance = null
    settingsWindowSessionKey = null
  }

  const url = sessionKey
    ? `settings.html?sessionKey=${encodeURIComponent(sessionKey)}`
    : 'settings.html'

  // Create new settings window
  try {
    settingsWindowInstance = new WebviewWindow('settings', {
      url,
      title: 'Settings',
      width: 798,
      height: 500,
      minWidth: 798,
      minHeight: 500,
      resizable: false,
      center: true,
      titleBarStyle: 'transparent',
      decorations: false,
      hiddenTitle: true,
      shadow: false,
      transparent: true
    })

    settingsWindowSessionKey = sessionKey ?? null
    console.log('[Windows] Settings window created')
    settingsWindowInstance.once('tauri://created', () => {
      invoke('apply_window_vibrancy', { label: 'settings' }).catch((e) =>
        console.warn('[Windows] Vibrancy not applied to settings:', e)
      )
    })

    // Clean up reference when window is destroyed
    settingsWindowInstance.once('tauri://destroyed', () => {
      console.log('[Windows] Settings window destroyed')
      settingsWindowInstance = null
      settingsWindowSessionKey = null
    })

    // Listen for errors
    settingsWindowInstance.once('tauri://error', (e) => {
      console.error('[Windows] Settings window error:', e)
      settingsWindowInstance = null
      settingsWindowSessionKey = null
    })
  } catch (error) {
    console.error('[Windows] Failed to create settings window:', error)
    settingsWindowInstance = null
  }
}

export async function openChatWindow(sessionKey: string) {
  // Check if chat window already exists and is valid for the same session
  if (chatWindowInstance) {
    if (chatWindowSessionKey === sessionKey) {
      try {
        await chatWindowInstance.setFocus()
        return
      } catch {
        // Window was closed
      }
    } else {
      // Different session — close existing window and open a fresh one
      try {
        chatWindowClosingIntentionally = true
        await chatWindowInstance.close()
      } catch {
        /* ignore */
      }
    }
    chatWindowInstance = null
    chatWindowSessionKey = null
  }

  // Create new chat window
  try {
    chatWindowInstance = new WebviewWindow('chat', {
      url: `chat.html?sessionKey=${encodeURIComponent(sessionKey)}`,
      title: 'Chat',
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 400,
      resizable: true,
      center: true,
      titleBarStyle: 'transparent',
      decorations: false,
      hiddenTitle: true,
      shadow: false,
      transparent: true
    })

    chatWindowSessionKey = sessionKey
    console.log('[Windows] Chat window created')
    chatWindowInstance.once('tauri://created', () => {
      invoke('apply_window_vibrancy', { label: 'chat' }).catch((e) =>
        console.warn('[Windows] Vibrancy not applied to chat:', e)
      )
    })

    // Clean up reference when window is destroyed
    chatWindowInstance.once('tauri://destroyed', async () => {
      console.log('[Windows] Chat window destroyed')
      chatWindowInstance = null
      chatWindowSessionKey = null

      if (!chatWindowClosingIntentionally) {
        const { emit } = await import('@tauri-apps/api/event')
        await emit('chat-window-closed', {})
      }
      chatWindowClosingIntentionally = false
    })

    // Listen for errors
    chatWindowInstance.once('tauri://error', async (e) => {
      console.error('[Windows] Chat window error:', e)
      chatWindowInstance = null
      chatWindowSessionKey = null

      const { emit } = await import('@tauri-apps/api/event')
      await emit('chat-window-closed', {})
    })
  } catch (error) {
    console.error('[Windows] Failed to create chat window:', error)
    chatWindowInstance = null
  }
}
