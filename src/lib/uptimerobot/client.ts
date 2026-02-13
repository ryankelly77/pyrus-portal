// UptimeRobot API client
// API documentation: https://uptimerobot.com/api/

import { logUptimeError } from '@/lib/alerts'

const UPTIMEROBOT_API_URL = 'https://api.uptimerobot.com/v2'

interface UptimeRobotLog {
  type: number // 1=down, 2=up, 98=started, 99=paused
  datetime: number
  duration: number // in seconds
}

interface UptimeRobotSSL {
  brand: string // e.g., "Let's Encrypt"
  product: string | null
  expires: number // Unix timestamp
}

interface UptimeRobotMonitor {
  id: number
  friendly_name: string
  url: string
  status: number // 0=paused, 1=not checked yet, 2=up, 8=seems down, 9=down
  all_time_uptime_ratio: string // e.g., "99.98"
  custom_uptime_ratio: string // For requested time range (e.g., "99.9-100" for 30d-1d)
  logs?: UptimeRobotLog[]
  ssl?: UptimeRobotSSL
}

interface UptimeRobotResponse {
  stat: 'ok' | 'fail'
  monitors?: UptimeRobotMonitor[]
  error?: {
    message: string
  }
}

export interface Last24HoursStats {
  uptime: string // e.g., "100%"
  incidents: number
  downtimeMinutes: number
}

export interface SSLInfo {
  brand: string // e.g., "Let's Encrypt"
  expiresAt: string // Formatted date e.g., "Mar 26, 2026"
  expiresTimestamp: number // Unix timestamp
  daysRemaining: number
}

export interface UptimeData {
  uptime: string // e.g., "99.9%" (30 days)
  status: 'up' | 'down' | 'paused' | 'unknown'
  monitorName: string
  last24Hours?: Last24HoursStats
  ssl?: SSLInfo
}

export function isUptimeRobotConfigured(): boolean {
  return !!process.env.UPTIMEROBOT_API_KEY
}

export async function getMonitorUptime(monitorId: string): Promise<UptimeData | null> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY

  if (!apiKey) {
    console.warn('UPTIMEROBOT_API_KEY not configured')
    return null
  }

  try {
    const response = await fetch(`${UPTIMEROBOT_API_URL}/getMonitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: new URLSearchParams({
        api_key: apiKey,
        monitors: monitorId,
        custom_uptime_ratios: '30-1', // Last 30 days and 1 day
        logs: '1', // Include logs
        logs_limit: '50', // Last 50 log entries
        ssl: '1', // Include SSL certificate info
      }),
    })

    if (!response.ok) {
      console.error('UptimeRobot API error:', response.status, response.statusText)
      return null
    }

    const data: UptimeRobotResponse = await response.json()

    if (data.stat !== 'ok' || !data.monitors || data.monitors.length === 0) {
      console.error('UptimeRobot API returned error or no monitors:', data.error?.message)
      return null
    }

    const monitor = data.monitors[0]

    // Convert status code to status string
    let status: 'up' | 'down' | 'paused' | 'unknown'
    switch (monitor.status) {
      case 0:
        status = 'paused'
        break
      case 2:
        status = 'up'
        break
      case 8:
      case 9:
        status = 'down'
        break
      default:
        status = 'unknown'
    }

    // Parse custom_uptime_ratio: "99.9-100" means 30d=99.9%, 1d=100%
    const uptimeRatios = monitor.custom_uptime_ratio?.split('-') || []
    const uptime30d = parseFloat(uptimeRatios[0] || monitor.all_time_uptime_ratio)
    const uptime1d = parseFloat(uptimeRatios[1] || uptimeRatios[0] || '100')

    // Calculate 24-hour stats from logs
    const now = Math.floor(Date.now() / 1000)
    const oneDayAgo = now - (24 * 60 * 60)
    let incidents24h = 0
    let downtime24hSeconds = 0

    if (monitor.logs) {
      for (const log of monitor.logs) {
        // Only count logs from last 24 hours, type 1 = down event
        if (log.type === 1 && log.datetime >= oneDayAgo) {
          incidents24h++
          downtime24hSeconds += log.duration
        }
      }
    }

    const formattedUptime = `${uptime30d.toFixed(1)}%`
    const formattedUptime24h = `${uptime1d.toFixed(0)}%`
    const downtimeMinutes = Math.round(downtime24hSeconds / 60)

    // Process SSL certificate info if available
    let sslInfo: SSLInfo | undefined
    if (monitor.ssl && monitor.ssl.expires) {
      const expiresDate = new Date(monitor.ssl.expires * 1000)
      const daysRemaining = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      sslInfo = {
        brand: monitor.ssl.brand || 'Unknown',
        expiresAt: expiresDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        expiresTimestamp: monitor.ssl.expires,
        daysRemaining,
      }
    }

    return {
      uptime: formattedUptime,
      status,
      monitorName: monitor.friendly_name,
      last24Hours: {
        uptime: formattedUptime24h,
        incidents: incidents24h,
        downtimeMinutes,
      },
      ssl: sslInfo,
    }
  } catch (error: any) {
    console.error('Error fetching UptimeRobot data:', error)
    logUptimeError(
      `UptimeRobot API request failed: ${error.message || 'Unknown error'}`,
      'warning',
      { monitorId, error: error.message },
      'lib/uptimerobot/client.ts'
    )
    return null
  }
}
