import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toAgentId } from '@/lib/session-manager'
import { type GatewaySession } from '@/types/gateway'
import { type SessionConfig, SessionType } from '@/types/session'
import { Check, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

interface AgentsTabProps {
  sessions: SessionConfig[]
  sessionsLoading: boolean
  activeSessionKey: string | null
  setActiveSessionKey: (key: string) => void
  sessionsByAgent: Record<string, GatewaySession[]>
  sessionsListLoading: boolean
  saved: boolean
  setSaved: (v: boolean) => void
  switchSession: (id: string) => Promise<void>
  switchToSessionKey: (key: string, label?: string) => Promise<void>
  createSession: (
    config: Omit<
      SessionConfig,
      'id' | 'createdAt' | 'lastActiveAt' | 'active' | 'sessionKey'
    >
  ) => Promise<SessionConfig>
}

export function AgentsTab({
  sessions,
  sessionsLoading,
  activeSessionKey,
  setActiveSessionKey,
  sessionsByAgent,
  sessionsListLoading,
  saved,
  setSaved,
  switchSession,
  switchToSessionKey,
  createSession
}: AgentsTabProps) {
  const [newTask, setNewTask] = useState({ name: '', description: '' })

  const sessionKeyPreview = newTask.name
    ? `agent:${toAgentId(newTask.name)}:main`
    : ''

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
        resetPolicy: { mode: 'idle', idleMinutes: 360 }
      })
      await switchSession(newSession.id)
      setActiveSessionKey(newSession.sessionKey)
      setNewTask({ name: '', description: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('[Settings] Failed to create session:', error)
    }
  }

  const handleSwitchToSessionKey = async (key: string, label?: string) => {
    try {
      await switchToSessionKey(key, label)
      setActiveSessionKey(key)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('[Settings] Failed to switch to session key:', error)
    }
  }

  const filteredSessions = useMemo(
    () => sessions.filter((s) => !s.id.startsWith('key-')),
    [sessions]
  )

  return (
    <div className="max-w-3xl space-y-6">
      {/* Current Active Session */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Current Session</Label>
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
            const cur = sessions.find((s) => s.sessionKey === activeSessionKey)
            if (!cur) return null
            return (
              <div className="bg-primary/5 border-primary/20 flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{cur.label ?? cur.name}</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                    {cur.sessionKey}
                  </p>
                </div>
              </div>
            )
          })()
        )}
      </div>

      {/* All Agents */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">All Agents</Label>
        <div className="space-y-3">
          {sessionsLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="overflow-hidden rounded-lg border">
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
            filteredSessions.map((session) => {
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
                  <div
                    className={`flex items-center justify-between p-3 ${
                      isAgentActive ? 'bg-primary/5' : 'bg-muted/30'
                    }`}
                  >
                    <p className="text-sm font-semibold">{session.name}</p>
                  </div>

                  <div className="divide-y">
                    {sessionsListLoading ? (
                      <div className="px-4 py-2">
                        <Skeleton className="h-3 w-32" />
                      </div>
                    ) : (
                      agentSessions.map((gs) => {
                        const sessionType = gs.key.split(':').slice(2).join(':')
                        const displayLabel =
                          gs.label ?? gs.displayName ?? sessionType
                        const isKeyActive = gs.key === activeSessionKey

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
        <Label className="text-sm font-medium">Create New Agent</Label>
        <div className="space-y-3">
          <div>
            <Label htmlFor="task-name" className="text-xs">
              Agent Name
            </Label>
            <Input
              id="task-name"
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
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
                setNewTask({ ...newTask, description: e.target.value })
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
  )
}
