import { storeGet, storeSet } from '@/lib/store'
import { invoke } from '@tauri-apps/api/core'

export type Theme = 'system' | 'light' | 'dark'

export const THEME_STORE_KEY = 'app_theme'

export function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme: Theme): void {
  const isDark =
    theme === 'dark' || (theme === 'system' && getSystemPrefersDark())
  document.documentElement.classList.toggle('dark', isDark)
}

export async function loadTheme(): Promise<Theme> {
  const saved = await storeGet<Theme>(THEME_STORE_KEY)
  return saved ?? 'system'
}

export async function saveTheme(theme: Theme): Promise<void> {
  await storeSet(THEME_STORE_KEY, theme)
  // Reload the main window so it picks up the new theme from store on startup.
  invoke('reload_window', { label: 'main' }).catch(() => {})
}
