import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/hooks/use-theme'
import { saveSettings, type AppSettings } from '@/lib/store'
import { cn } from '@/lib/utils'
import { invoke } from '@tauri-apps/api/core'
import { Check, Monitor, Moon, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'

// ── Shortcut recorder ────────────────────────────────────────────────────────

function eventToShortcut(e: KeyboardEvent): string | null {
  const modifiers: string[] = []
  if (e.metaKey || e.ctrlKey) modifiers.push('CommandOrControl')
  if (e.altKey) modifiers.push('Alt')
  if (e.shiftKey) modifiers.push('Shift')
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return null
  if (modifiers.length === 0) return null
  const key =
    e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
  return [...modifiers, key].join('+')
}

function ShortcutRecorder({
  value,
  onChange
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (!recording) return
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const sc = eventToShortcut(e)
      if (!sc) return
      onChange(sc)
      setRecording(false)
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [recording, onChange])

  return (
    <div className="flex gap-2">
      <div
        className={cn(
          'flex-1 rounded-md border px-3 py-2 font-mono text-sm',
          recording && 'border-primary animate-pulse'
        )}
      >
        {recording ? 'Press shortcut…' : value || 'None'}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRecording((r) => !r)}
      >
        {recording ? 'Cancel' : 'Record'}
      </Button>
      {value && !recording && (
        <Button variant="ghost" size="sm" onClick={() => onChange('')}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// ── GeneralTab ───────────────────────────────────────────────────────────────

interface GeneralTabProps {
  settings: AppSettings
  setSettings: (s: AppSettings) => void
}

export function GeneralTab({ settings, setSettings }: GeneralTabProps) {
  const { theme, setTheme } = useTheme()
  const [saved, setSaved] = useState(false)
  const [autostart, setAutostart] = useState(false)

  useEffect(() => {
    invoke<boolean>('get_autostart')
      .then(setAutostart)
      .catch(console.error)
  }, [])

  async function handleAutostartChange(enabled: boolean) {
    await invoke('set_autostart', { enabled }).catch(console.error)
    setAutostart(enabled)
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Theme */}
      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <Label className="text-sm font-medium">Theme</Label>
          <p className="text-muted-foreground mt-1 text-xs">
            Choose how Talon looks. "System" follows your OS setting.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'system', label: 'System', icon: Monitor },
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon }
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm transition-colors',
                theme === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Launch at Login */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Launch at Login</Label>
            <p className="text-muted-foreground mt-1 text-xs">
              Automatically start Talon when you log in.
            </p>
          </div>
          <Switch checked={autostart} onCheckedChange={handleAutostartChange} />
        </div>
      </div>

      {/* Shortcut */}
      <div className="space-y-4 rounded-lg border p-4">
        <div>
          <Label className="text-sm font-medium">Toggle Panel Shortcut</Label>
          <p className="text-muted-foreground mt-1 text-xs">
            Press this shortcut anywhere to show or hide the Talon panel.
            Requires at least one modifier key (⌘ / Ctrl / Alt / Shift).
          </p>
        </div>
        <ShortcutRecorder
          value={settings.hotkey ?? ''}
          onChange={async (sc) => {
            const next = { ...settings, hotkey: sc }
            setSettings(next)
            await saveSettings(next)
            await invoke('set_global_shortcut', { shortcut: sc }).catch(
              console.error
            )
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          }}
        />
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>Saved</span>
          </div>
        )}
      </div>
    </div>
  )
}
