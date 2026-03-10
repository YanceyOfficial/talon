import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { saveSettings, type AppSettings } from '@/lib/store'
import { cn } from '@/lib/utils'
import { invoke } from '@tauri-apps/api/core'
import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'

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

interface ShortcutsTabProps {
  settings: AppSettings
  setSettings: (s: AppSettings) => void
}

export function ShortcutsTab({ settings, setSettings }: ShortcutsTabProps) {
  const [saved, setSaved] = useState(false)

  return (
    <div className="max-w-3xl space-y-4">
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
