import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { useMultiSessionOpenClaw } from '@/hooks/use-multi-session'
import { toAgentId } from '@/lib/session-manager'
import { getSettings, saveSettings, type AppSettings } from '@/lib/store'
import { type GatewaySession } from '@/types/gateway'
import { ConnectionStatus } from '@/types/openclaw'
import { SessionType } from '@/types/session'
import { emit } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import {
  Check,
  Eye,
  EyeOff,
  Info,
  Layers,
  Link as LinkIcon,
  Loader2,
  Plus,
  Settings as SettingsIcon,
  // Trash2,
  X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { version } from '../../package.json'

const initialSessionKey = new URLSearchParams(window.location.search).get(
  'sessionKey'
)

const navItems = [
  { name: 'Agents', icon: Layers },
  { name: 'Connection', icon: LinkIcon },
  { name: 'About', icon: SettingsIcon }
]

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    gatewayUrl: '',
    token: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [activeNav, setActiveNav] = useState('Agents')
  const [activeSessionKey, setActiveSessionKey] = useState<string | null>(
    initialSessionKey
  )
  const hasScrolled = useRef(false)

  // Unified session + Gateway hook
  const {
    sessions,
    sessionsLoading,
    switchSession,
    switchToSessionKey,
    createSession,
    // deleteSession,
    listGatewaySessions,
    status,
    serverVersion
  } = useMultiSessionOpenClaw()

  // Scroll to the active session card once sessions are loaded
  useEffect(() => {
    if (
      !initialSessionKey ||
      hasScrolled.current ||
      sessionsLoading ||
      sessions.length === 0
    )
      return
    const target =
      sessions.find((s) => s.sessionKey === initialSessionKey) ??
      sessions.find(
        (s) => s.sessionKey.split(':')[1] === initialSessionKey.split(':')[1]
      )
    if (!target) return
    document
      .getElementById(`agent-card-${target.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    hasScrolled.current = true
  }, [sessions, sessionsLoading])

  // New agent form state
  const [newTask, setNewTask] = useState({
    name: '',
    description: ''
  })

  // All gateway sessions (from sessions.list), for hierarchical display
  const [allGatewaySessions, setAllGatewaySessions] = useState<
    GatewaySession[]
  >([])
  const [sessionsListLoading, setSessionsListLoading] = useState(false)

  // Preview of the session key that will be created (based on name)
  const sessionKeyPreview = newTask.name
    ? `agent:${toAgentId(newTask.name)}:main`
    : ''

  // Group gateway sessions by agentId (second segment of key)
  const sessionsByAgent = useMemo(() => {
    const map: Record<string, GatewaySession[]> = {}
    for (const session of allGatewaySessions) {
      const agentId = session.key.split(':')[1] ?? 'unknown'
      if (!map[agentId]) map[agentId] = []
      map[agentId].push(session)
    }
    return map
  }, [allGatewaySessions])

  useEffect(() => {
    loadSettings()
  }, [])

  // Fetch all gateway sessions when connected
  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) return

    const fetchSessions = async () => {
      setSessionsListLoading(true)
      try {
        const response = (await listGatewaySessions()) as {
          payload?: { sessions?: GatewaySession[] }
        }
        const sessions = response?.payload?.sessions ?? []
        setAllGatewaySessions(sessions)
      } catch (error) {
        console.error('[Settings] Failed to fetch sessions list:', error)
      } finally {
        setSessionsListLoading(false)
      }
    }

    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const loadSettings = async () => {
    try {
      const current = await getSettings()
      setSettings(current)
    } catch (error) {
      console.error('[Settings] Failed to load:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      await saveSettings(settings)
      // Reconnect all windows with the new settings
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
      gatewayUrl: 'ws://localhost:18789',
      token: ''
    }
    setSettings(defaults)
    await saveSettings(defaults)
    await emit('gateway-settings-changed', {})
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleClose = async () => {
    const window = getCurrentWebviewWindow()
    await window.close()
  }

  const handleCreateSession = async () => {
    if (!newTask.name.trim()) return

    try {
      const newSession = await createSession({
        name: newTask.name,
        type: SessionType.TASK,
        description: newTask.description,
        memoryEnabled: true,
        autoCompact: true,
        compactThreshold: 180000,
        resetPolicy: {
          mode: 'idle',
          idleMinutes: 360
        }
      })

      // Automatically switch to the newly created session
      await switchSession(newSession.id)
      setActiveSessionKey(newSession.sessionKey)
      console.log(
        '[Settings] Switched to newly created session:',
        newSession.name,
        newSession.sessionKey
      )

      // Reset form
      setNewTask({ name: '', description: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('[Settings] Failed to create session:', error)
    }
  }

  // const handleDeleteSession = async (sessionId: string) => {
  //   // Temporarily bypass confirm to test if it's blocking
  //   // if (!confirm('Are you sure you want to delete this task?')) return
  //   console.log('[Settings] handleDeleteSession called, bypassing confirm')

  //   try {
  //     console.log('[Settings] Deleting session:', sessionId)
  //     await deleteSession(sessionId)
  //     console.log('[Settings] Session deleted successfully')
  //     setSaved(true)
  //     setTimeout(() => setSaved(false), 2000)
  //   } catch (error) {
  //     console.error('[Settings] Failed to delete session:', error)
  //     alert('Cannot delete main session')
  //   }
  // }

  const handleSwitchToSessionKey = async (key: string, label?: string) => {
    try {
      console.log('[Settings] Switching to session key:', key)
      await switchToSessionKey(key, label)
      setActiveSessionKey(key)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('[Settings] Failed to switch to session key:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center overflow-hidden rounded-2xl">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background h-screen overflow-hidden rounded-2xl">
      <SidebarProvider className="items-start">
        <Sidebar collapsible="none" className="hidden h-dvh sm:flex">
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        onClick={() => setActiveNav(item.name)}
                        isActive={item.name === activeNav}
                      >
                        <item.icon />
                        <span>{item.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main className="flex h-125 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between px-4">
            <h2 className="text-lg font-semibold">{activeNav}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
            {activeNav === 'Agents' && (
              <div className="max-w-3xl space-y-6">
                {/* Current Active Session */}
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">
                        Current Session
                      </Label>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Active session in the main window
                      </p>
                    </div>
                    {saved && (
                      <div className="flex items-center gap-1.5 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        <span>Updated</span>
                      </div>
                    )}
                  </div>
                  {sessionsLoading ? (
                    <div className="space-y-2 rounded-lg border p-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  ) : (
                    (() => {
                      const cur = sessions.find(
                        (s) => s.sessionKey === activeSessionKey
                      )
                      if (!cur) return null
                      return (
                        <div className="bg-primary/5 border-primary/20 flex items-center gap-3 rounded-lg border p-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {cur.label ?? cur.name}
                            </p>
                            <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                              {cur.sessionKey}
                            </p>
                          </div>
                        </div>
                      )
                    })()
                  )}
                </div>

                {/* All Agents + their Sessions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">All Agents</Label>
                  <div className="space-y-3">
                    {sessionsLoading ? (
                      <>
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="overflow-hidden rounded-lg border"
                          >
                            <div className="bg-muted/30 flex items-center justify-between p-3">
                              <div className="space-y-1.5">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                            <div className="px-4 py-2">
                              <Skeleton className="h-3 w-36" />
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      // Filter out transient cron/DM sessions (id starts with 'key-')
                      sessions
                        .filter((s) => !s.id.startsWith('key-'))
                        .map((session) => {
                          const agentId = session.sessionKey.split(':')[1] ?? ''
                          const agentSessions = sessionsByAgent[agentId] ?? [
                            { key: session.sessionKey }
                          ]
                          const isAgentActive = agentSessions.some(
                            (s) => s.key === activeSessionKey
                          )

                          return (
                            <div
                              key={session.id}
                              id={`agent-card-${session.id}`}
                              className="overflow-hidden rounded-lg border"
                            >
                              {/* Agent header */}
                              <div
                                className={`flex items-center justify-between p-3 ${
                                  isAgentActive ? 'bg-primary/5' : 'bg-muted/30'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold">
                                      {session.name}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Sessions under this agent */}
                              <div className="divide-y">
                                {sessionsListLoading ? (
                                  <div className="px-4 py-2">
                                    <Skeleton className="h-3 w-32" />
                                  </div>
                                ) : (
                                  agentSessions.map((gs) => {
                                    const sessionType = gs.key
                                      .split(':')
                                      .slice(2)
                                      .join(':')
                                    const displayLabel =
                                      gs.label ?? gs.displayName ?? sessionType
                                    const isKeyActive =
                                      gs.key === activeSessionKey

                                    return (
                                      <div
                                        key={gs.key}
                                        className={`flex items-center justify-between px-4 py-2 ${
                                          isKeyActive ? 'bg-primary/5' : ''
                                        }`}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="text-muted-foreground truncate text-xs">
                                              {displayLabel}
                                            </p>
                                            {isKeyActive && (
                                              <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                                                Active
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {!isKeyActive && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 shrink-0 text-xs"
                                            onClick={() =>
                                              handleSwitchToSessionKey(
                                                gs.key,
                                                gs.label ?? gs.displayName
                                              )
                                            }
                                          >
                                            Switch
                                          </Button>
                                        )}
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          )
                        })
                    )}
                  </div>
                </div>

                {/* Create New Agent */}
                <div className="space-y-3 rounded-lg border p-4">
                  <Label className="text-sm font-medium">
                    Create New Agent
                  </Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="task-name" className="text-xs">
                        Agent Name
                      </Label>
                      <Input
                        id="task-name"
                        value={newTask.name}
                        onChange={(e) =>
                          setNewTask({ ...newTask, name: e.target.value })
                        }
                        placeholder="e.g., Stock Research"
                      />
                    </div>
                    {sessionKeyPreview && (
                      <p className="text-muted-foreground font-mono text-xs">
                        {sessionKeyPreview}
                      </p>
                    )}
                    <div>
                      <Label htmlFor="task-desc" className="text-xs">
                        Description (Optional)
                      </Label>
                      <Input
                        id="task-desc"
                        value={newTask.description}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            description: e.target.value
                          })
                        }
                        placeholder="Brief description of this agent"
                      />
                    </div>
                    <Button
                      onClick={handleCreateSession}
                      disabled={!newTask.name.trim()}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Agent
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'Connection' && (
              <div className="max-w-3xl space-y-4">
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
                      Optional: Your OpenClaw authentication token
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-500" />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                        Local OpenClaw
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Set Gateway URL to{' '}
                        <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">
                          ws://localhost:18789
                        </code>{' '}
                        and fill in your Gateway Token.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                        Remote via Tailscale
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Set Gateway URL to your Tailscale address. After first
                        connect, run on the server:
                      </p>
                      <code className="mt-1 block rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        openclaw devices approve
                      </code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
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
            )}

            {activeNav === 'About' && (
              <div className="max-w-3xl space-y-2 rounded-lg border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clippy Version</span>
                  <span className="font-mono">v{version}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">
                    OpenClaw Version
                  </span>
                  <span className="font-mono">
                    {serverVersion ??
                      (status === ConnectionStatus.CONNECTED
                        ? '—'
                        : 'Not connected')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
}
