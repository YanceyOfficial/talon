import { applyTheme, loadTheme, saveTheme, type Theme } from '@/lib/theme'
import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    loadTheme().then((t) => {
      setThemeState(t)
      applyTheme(t)
    })

    // React to OS-level dark/light changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      setThemeState((current) => {
        if (current === 'system') applyTheme('system')
        return current
      })
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    saveTheme(t)
  }

  return { theme, setTheme }
}
