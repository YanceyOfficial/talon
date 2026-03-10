import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveSettings, type AppSettings } from '@/lib/store'
import { emit } from '@tauri-apps/api/event'
import { Check, Eye, EyeOff, Info, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ConnectionTabProps {
  settings: AppSettings
  setSettings: (s: AppSettings) => void
}

export function ConnectionTab({ settings, setSettings }: ConnectionTabProps) {
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await saveSettings(settings)
      await emit('gateway-settings-changed', {})
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('[Settings] Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    const defaults = {
      ...settings,
      gatewayUrl: 'ws://localhost:18789',
      token: ''
    }
    setSettings(defaults)
    await saveSettings(defaults)
    await emit('gateway-settings-changed', {})
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium text-green-900 dark:text-green-100">
            First-time setup
          </p>
          <ol className="list-inside list-decimal space-y-0.5 text-xs text-green-700 dark:text-green-300">
            <li>
              Enter your Gateway URL and Token below and click Save Changes
            </li>
            <li>
              On the machine where OpenClaw is deployed, run:{' '}
              <code className="rounded bg-green-100 px-1 dark:bg-green-900">
                openclaw devices approve
              </code>
            </li>
            <li>Restart Talon</li>
          </ol>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label htmlFor="gateway-url">Gateway URL</Label>
          <Input
            id="gateway-url"
            type="text"
            value={settings.gatewayUrl}
            onChange={(e) =>
              setSettings({ ...settings, gatewayUrl: e.target.value })
            }
            placeholder="ws://localhost:18789"
          />
          <p className="text-muted-foreground text-xs">
            OpenClaw Gateway WebSocket URL
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">Gateway Token</Label>
          <div className="flex gap-2">
            <Input
              id="token"
              type={showToken ? 'text' : 'password'}
              value={settings.token}
              onChange={(e) =>
                setSettings({ ...settings, token: e.target.value })
              }
              placeholder="Enter your token"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Your OpenClaw authentication token
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <Check className="h-4 w-4" />
              <span>Saved</span>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
