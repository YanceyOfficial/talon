/**
 * In-memory logger that patches console methods and keeps a circular buffer.
 * Initialize early in each entry point so all logs are captured.
 */

export type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error'

export interface LogEntry {
  id: number
  level: LogLevel
  timestamp: number
  message: string
}

const MAX_ENTRIES = 500

let nextId = 0
let entries: LogEntry[] = []
let listeners: Array<(entry: LogEntry) => void> = []

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

function addEntry(level: LogLevel, args: unknown[]) {
  const entry: LogEntry = {
    id: nextId++,
    level,
    timestamp: Date.now(),
    message: formatArgs(args)
  }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES)
  }
  for (const l of listeners) l(entry)
}

let patched = false

export function initLogger() {
  if (patched) return
  patched = true

  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console)
  }

  console.log = (...args: unknown[]) => {
    orig.log(...args)
    addEntry('log', args)
  }
  console.info = (...args: unknown[]) => {
    orig.info(...args)
    addEntry('info', args)
  }
  console.warn = (...args: unknown[]) => {
    orig.warn(...args)
    addEntry('warn', args)
  }
  console.error = (...args: unknown[]) => {
    orig.error(...args)
    addEntry('error', args)
  }
  console.debug = (...args: unknown[]) => {
    orig.debug(...args)
    addEntry('debug', args)
  }
}

export function getLogs(): LogEntry[] {
  return [...entries]
}

export function clearLogs() {
  entries = []
  nextId = 0
}

export function subscribeToLogs(cb: (entry: LogEntry) => void): () => void {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((l) => l !== cb)
  }
}
