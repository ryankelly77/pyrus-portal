'use client'

import { useEffect, useRef } from 'react'

const MAX_ENTRIES = 50

export interface DiagnosticEntry {
  timestamp: string
  type: 'console' | 'network' | 'error'
  level?: 'log' | 'warn' | 'error'
  method?: string
  url?: string
  status?: number
  duration?: number
  message: string
  stack?: string
}

// Store in memory to avoid sessionStorage quota issues
const diagnosticBuffer: DiagnosticEntry[] = []

// Track if we've already initialized (singleton pattern)
let isGloballyInitialized = false

// Store original functions
let originalFetch: typeof fetch | null = null
let originalConsoleLog: typeof console.log | null = null
let originalConsoleWarn: typeof console.warn | null = null
let originalConsoleError: typeof console.error | null = null

/**
 * Add entry to the rolling buffer
 */
function addEntry(entry: DiagnosticEntry) {
  diagnosticBuffer.push(entry)
  while (diagnosticBuffer.length > MAX_ENTRIES) {
    diagnosticBuffer.shift()
  }
}

/**
 * Format a message from console arguments
 */
function formatMessage(args: any[]): string {
  return args
    .map(arg => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    })
    .join(' ')
    .slice(0, 500) // Limit message length
}

/**
 * Format timestamp for display (HH:MM:SS)
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour12: false })
  } catch {
    return isoString
  }
}

/**
 * Initialize global diagnostic capture
 */
function initializeCapture() {
  if (typeof window === 'undefined' || isGloballyInitialized) return
  isGloballyInitialized = true

  // Store originals
  originalFetch = window.fetch.bind(window)
  originalConsoleLog = console.log.bind(console)
  originalConsoleWarn = console.warn.bind(console)
  originalConsoleError = console.error.bind(console)

  // Override console.log
  console.log = function (...args: any[]) {
    addEntry({
      timestamp: new Date().toISOString(),
      type: 'console',
      level: 'log',
      message: formatMessage(args),
    })
    originalConsoleLog!.apply(console, args)
  }

  // Override console.warn
  console.warn = function (...args: any[]) {
    addEntry({
      timestamp: new Date().toISOString(),
      type: 'console',
      level: 'warn',
      message: formatMessage(args),
    })
    originalConsoleWarn!.apply(console, args)
  }

  // Override console.error
  console.error = function (...args: any[]) {
    addEntry({
      timestamp: new Date().toISOString(),
      type: 'console',
      level: 'error',
      message: formatMessage(args),
    })
    originalConsoleError!.apply(console, args)
  }

  // Override fetch to capture /api/* requests
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method || 'GET'

    // Only capture /api/* requests
    if (!url.includes('/api/')) {
      return originalFetch!(input, init)
    }

    const startTime = performance.now()
    let status = 0
    let errorMessage = ''

    try {
      const response = await originalFetch!(input, init)
      status = response.status
      const duration = Math.round(performance.now() - startTime)

      addEntry({
        timestamp: new Date().toISOString(),
        type: 'network',
        method: method.toUpperCase(),
        url: url.replace(window.location.origin, ''),
        status,
        duration,
        message: `${method.toUpperCase()} ${url.replace(window.location.origin, '')} ${status} (${duration}ms)`,
      })

      return response
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      errorMessage = error instanceof Error ? error.message : String(error)

      addEntry({
        timestamp: new Date().toISOString(),
        type: 'network',
        method: method.toUpperCase(),
        url: url.replace(window.location.origin, ''),
        status: 0,
        duration,
        message: `${method.toUpperCase()} ${url.replace(window.location.origin, '')} FAILED: ${errorMessage} (${duration}ms)`,
      })

      throw error
    }
  }

  // Capture unhandled errors
  window.addEventListener('error', (event: ErrorEvent) => {
    addEntry({
      timestamp: new Date().toISOString(),
      type: 'error',
      message: event.message,
      stack: `at ${event.filename}:${event.lineno}:${event.colno}`,
    })
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    const stack = error instanceof Error ? error.stack : undefined

    addEntry({
      timestamp: new Date().toISOString(),
      type: 'error',
      message: `Unhandled Promise Rejection: ${message}`,
      stack,
    })
  })
}

/**
 * Hook to initialize diagnostic capture.
 * Should be called once in the app (e.g., in BugReportButton).
 */
export function useDiagnosticCapture() {
  const isInitialized = useRef(false)

  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true
    initializeCapture()
  }, [])
}

/**
 * Get diagnostic entries as formatted text for bug reports
 */
export function getDiagnosticLogs(): string {
  if (diagnosticBuffer.length === 0) return ''

  const lines: string[] = []
  lines.push('### Recent Activity (last 50 events)')
  lines.push('')
  lines.push('| Time | Type | Details |')
  lines.push('|------|------|---------|')

  // Show newest first
  const entries = [...diagnosticBuffer].reverse()

  for (const entry of entries) {
    const time = formatTime(entry.timestamp)
    let typeLabel = ''
    let details = ''

    if (entry.type === 'console') {
      typeLabel = `console:${entry.level || 'log'}`
      details = entry.message
    } else if (entry.type === 'network') {
      typeLabel = 'network'
      const statusIcon = entry.status && entry.status >= 200 && entry.status < 400 ? '' : ' ⚠️'
      details = `${entry.method} ${entry.url} ${entry.status || 'ERR'} (${entry.duration}ms)${statusIcon}`
    } else if (entry.type === 'error') {
      typeLabel = 'error'
      details = entry.message
      if (entry.stack) {
        details += ` ${entry.stack.split('\n')[0]}`
      }
    }

    // Escape pipe characters and limit length
    details = details.replace(/\|/g, '\\|').slice(0, 100)
    if (details.length === 100) details += '...'

    lines.push(`| ${time} | ${typeLabel} | ${details} |`)
  }

  return lines.join('\n')
}

/**
 * Get raw diagnostic entries
 */
export function getDiagnosticEntries(): DiagnosticEntry[] {
  return [...diagnosticBuffer]
}

/**
 * Clear diagnostic buffer
 */
export function clearDiagnosticLogs() {
  diagnosticBuffer.length = 0
}

/**
 * Legacy alias for backwards compatibility
 * @deprecated Use getDiagnosticLogs instead
 */
export function getConsoleLogs(): string {
  return getDiagnosticLogs()
}
