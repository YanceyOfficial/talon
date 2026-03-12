import { Label } from '@/components/ui/label'
import { useUpdater } from '@/hooks/use-updater'
import { saveSettings, type AppSettings } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ConnectionStatus } from '@/types/openclaw'
import { Check, Download, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { version } from '../../../package.json'

function ReleaseNotes({ body }: { body: string }) {
  // Parse lines: treat "- …" / "* …" bullet lines as list items,
  // "## …" / "### …" as section headings, skip empty lines.
  const lines = body.split('\n')
  return (
    <div className="bg-muted/50 max-h-48 space-y-1 overflow-y-auto rounded-md px-3 py-2 text-xs">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return null
        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/)
        if (headingMatch) {
          return (
            <p key={i} className="text-muted-foreground pt-1 font-semibold">
              {headingMatch[1]}
            </p>
          )
        }
        const bulletMatch = trimmed.match(/^[-*]\s+(.+)/)
        if (bulletMatch) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-muted-foreground mt-px select-none">•</span>
              <span>{bulletMatch[1]}</span>
            </div>
          )
        }
        return (
          <p key={i} className="text-muted-foreground">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

interface AboutTabProps {
  serverVersion: string | null
  status: ConnectionStatus
  settings: AppSettings
  setSettings: (s: AppSettings) => void
}

export function AboutTab({
  serverVersion,
  status,
  settings,
  setSettings
}: AboutTabProps) {
  const {
    state: updateState,
    availableVersion,
    releaseNotes,
    downloadProgress,
    errorMsg,
    checkForUpdate,
    downloadAndInstall,
    restart
  } = useUpdater()

  const autoUpdate = settings.autoUpdate ?? true

  const toggleAutoUpdate = async () => {
    const next = { ...settings, autoUpdate: !autoUpdate }
    setSettings(next)
    await saveSettings(next)
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Version info */}
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Talon Version</span>
          <span className="font-mono">v{version}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-sm">
          <span className="text-muted-foreground">OpenClaw Version</span>
          <span className="font-mono">
            {serverVersion ??
              (status === ConnectionStatus.CONNECTED ? '—' : 'Not connected')}
          </span>
        </div>
      </div>

      {/* Updates */}
      <div className="space-y-4 rounded-lg border p-4">
        {/* Auto-update toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Auto Update</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Automatically download and install updates on startup
            </p>
          </div>
          <button
            role="switch"
            aria-checked={autoUpdate}
            onClick={toggleAutoUpdate}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
              autoUpdate ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
                autoUpdate ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Update status */}
        <div className="border-t pt-3">
          {updateState === 'idle' && (
            <button
              onClick={checkForUpdate}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Check for Updates
            </button>
          )}

          {updateState === 'checking' && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking…
            </div>
          )}

          {updateState === 'up-to-date' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                You're up to date
              </div>
              <button
                onClick={checkForUpdate}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Recheck
              </button>
            </div>
          )}

          {updateState === 'available' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  v{availableVersion} available
                </span>
                <button
                  onClick={downloadAndInstall}
                  className="bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download & Install
                </button>
              </div>
              {releaseNotes && (
                <ReleaseNotes body={releaseNotes} />
              )}
            </div>
          )}

          {updateState === 'downloading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading…
                </div>
                <span className="text-muted-foreground font-mono text-xs">
                  {downloadProgress}%
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {updateState === 'ready' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Ready to install v{availableVersion}
                </span>
                <button
                  onClick={restart}
                  className="bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restart to Update
                </button>
              </div>
              {releaseNotes && (
                <ReleaseNotes body={releaseNotes} />
              )}
            </div>
          )}

          {updateState === 'error' && (
            <div className="space-y-2">
              <p className="text-destructive text-xs">{errorMsg}</p>
              <button
                onClick={checkForUpdate}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
