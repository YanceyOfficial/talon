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
import { Button } from '@/components/ui/button'
import { useMultiSessionOpenClaw } from '@/hooks/use-multi-session'
import { getSettings, type AppSettings } from '@/lib/store'
import { type GatewaySession } from '@/types/gateway'
import { ConnectionStatus } from '@/types/openclaw'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import {
  Keyboard,
  Layers,
  Link as LinkIcon,
  Loader2,
  Palette,
  Settings as SettingsIcon,
  X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AboutTab } from './about-tab'
import { AgentsTab } from './agents-tab'
import { AppearanceTab } from './appearance-tab'
import { ConnectionTab } from './connection-tab'
import { ShortcutsTab } from './shortcuts-tab'

const initialSessionKey = new URLSearchParams(window.location.search).get(
  'sessionKey'
)

const navItems = [
  { name: 'Agents', icon: Layers },
  { name: 'Appearance', icon: Palette },
  { name: 'Shortcuts', icon: Keyboard },
  { name: 'Connection', icon: LinkIcon },
  { name: 'About', icon: SettingsIcon }
]

export function SettingsPage() {
  const [settings, setSettingsState] = useState<AppSettings>({
    gatewayUrl: '',
    token: '',
    hotkey: '',
    autoUpdate: true
  })
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('Agents')
  const [activeSessionKey, setActiveSessionKey] = useState<string | null>(
    initialSessionKey
  )
  const hasScrolled = useRef(false)

  const {
    sessions,
    sessionsLoading,
    switchSession,
    switchToSessionKey,
    createSession,
    listGatewaySessions,
    status,
    serverVersion
  } = useMultiSessionOpenClaw()

  const [allGatewaySessions, setAllGatewaySessions] = useState<GatewaySession[]>([])
  const [sessionsListLoading, setSessionsListLoading] = useState(false)

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
    getSettings().then((s) => {
      setSettingsState(s)
      setLoading(false)
    })
  }, [])

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

  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) return
    setSessionsListLoading(true)
    listGatewaySessions()
      .then((res) => {
        const s = (res as { payload?: { sessions?: GatewaySession[] } })
          ?.payload?.sessions ?? []
        setAllGatewaySessions(s)
      })
      .catch((e) => console.error('[Settings] Failed to fetch sessions:', e))
      .finally(() => setSessionsListLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const handleClose = async () => {
    await getCurrentWebviewWindow().close()
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
              <AgentsTab
                sessions={sessions}
                sessionsLoading={sessionsLoading}
                activeSessionKey={activeSessionKey}
                setActiveSessionKey={setActiveSessionKey}
                sessionsByAgent={sessionsByAgent}
                sessionsListLoading={sessionsListLoading}
                saved={false}
                setSaved={() => {}}
                switchSession={switchSession}
                switchToSessionKey={switchToSessionKey}
                createSession={createSession}
              />
            )}
            {activeNav === 'Appearance' && <AppearanceTab />}
            {activeNav === 'Shortcuts' && (
              <ShortcutsTab settings={settings} setSettings={setSettingsState} />
            )}
            {activeNav === 'Connection' && (
              <ConnectionTab settings={settings} setSettings={setSettingsState} />
            )}
            {activeNav === 'About' && (
              <AboutTab
                serverVersion={serverVersion}
                status={status}
                settings={settings}
                setSettings={setSettingsState}
              />
            )}
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
}
