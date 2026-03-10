import { Button } from '@/components/ui/button'
import {
  clearLogs,
  getLogs,
  subscribeToLogs,
  type LogEntry,
  type LogLevel
} from '@/lib/logger'
import { cn } from '@/lib/utils'
import { ArrowDown, Copy, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const LEVELS: LogLevel[] = ['error', 'warn', 'log', 'info', 'debug']

const levelStyle: Record<LogLevel, string> = {
  error: 'text-red-500 dark:text-red-400',
  warn: 'text-yellow-600 dark:text-yellow-400',
  log: 'text-foreground',
  info: 'text-blue-600 dark:text-blue-400',
  debug: 'text-muted-foreground'
}

const levelBadge: Record<LogLevel, string> = {
  error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  warn: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  log: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  debug: 'bg-muted text-muted-foreground'
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

export function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>(() => getLogs())
  const [filter, setFilter] = useState<Set<LogLevel>>(new Set(LEVELS))
  const [autoScroll, setAutoScroll] = useState(true)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(autoScroll)

  useEffect(() => {
    autoScrollRef.current = autoScroll
  }, [autoScroll])

  useEffect(() => {
    const unsub = subscribeToLogs((entry) => {
      setLogs((prev) => {
        const next = [...prev, entry]
        return next.length > 500 ? next.slice(next.length - 500) : next
      })
    })
    return unsub
  }, [])

  useEffect(() => {
    if (autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [logs])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setAutoScroll(nearBottom)
  }

  const handleClear = () => {
    clearLogs()
    setLogs([])
  }

  const handleCopy = () => {
    const text = logs
      .filter((e) => filter.has(e.level))
      .map(
        (e) =>
          `[${formatTime(e.timestamp)}] [${e.level.toUpperCase()}] ${e.message}`
      )
      .join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const toggleLevel = (level: LogLevel) => {
    setFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        if (next.size > 1) next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }

  const visible = logs.filter((e) => filter.has(e.level))

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Level filters */}
        <div className="flex flex-1 flex-wrap gap-1">
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-xs transition-opacity',
                levelBadge[level],
                !filter.has(level) && 'opacity-30'
              )}
            >
              {level}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Copy logs"
          onClick={handleCopy}
        >
          <Copy className="h-3.5 w-3.5" />
          {copied && (
            <span className="text-muted-foreground absolute right-0 -bottom-4 text-[10px]">
              Copied
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Clear logs"
          onClick={handleClear}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Log area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-muted/40 flex-1 overflow-y-auto rounded-lg border p-2 font-mono text-xs"
        style={{ minHeight: 0, maxHeight: 'calc(100vh - 120px)' }}
      >
        {visible.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center">No logs yet</p>
        ) : (
          visible.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'flex gap-2 border-b border-transparent py-0.5 last:border-0',
                'hover:bg-muted/60'
              )}
            >
              <span className="text-muted-foreground shrink-0 select-none">
                {formatTime(entry.timestamp)}
              </span>
              <span
                className={cn(
                  'w-10 shrink-0 text-right uppercase',
                  levelStyle[entry.level]
                )}
              >
                {entry.level}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 break-all whitespace-pre-wrap',
                  levelStyle[entry.level]
                )}
              >
                {entry.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!autoScroll && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              setAutoScroll(true)
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-md transition-opacity hover:opacity-90"
          >
            <ArrowDown className="h-3 w-3" />
            Scroll to bottom
          </button>
        </div>
      )}
    </div>
  )
}
