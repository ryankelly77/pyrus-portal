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
  interval: number // Check interval in seconds
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
  timeline: Array<{
    hour: number // 0-23, where 0 is the most recent hour
    status: 'up' | 'down' | 'partial' // partial means some downtime in that hour
    downtimeMinutes: number
  }>
}

export interface SSLInfo {
  brand: string // e.g., "Let's Encrypt"
  expiresAt: string // Formatted date e.g., "Mar 26, 2026"
  expiresTimestamp: number // Unix timestamp
  daysRemaining: number
}

export interface CurrentStatusInfo {
  uptimeDuration: string // e.g., "1d 9h 37m"
  checkInterval: string // e.g., "1 minute"
}

export interface UptimeData {
  uptime: string // e.g., "99.9%" (30 days)
  status: 'up' | 'down' | 'paused' | 'unknown'
  monitorName: string
  last24Hours?: Last24HoursStats
  ssl?: SSLInfo
  currentStatus?: CurrentStatusInfo
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

    // Debug logging to diagnose missing data
    console.log(`[UptimeRobot] Monitor ${monitorId} (${monitor.friendly_name}):`, {
      status: monitor.status,
      hasSSL: !!monitor.ssl,
      sslExpires: monitor.ssl?.expires,
      logsCount: monitor.logs?.length || 0,
      logTypes: monitor.logs?.map(l => l.type) || [],
    })

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

    // Initialize 24 hourly buckets for timeline (index 0 = most recent hour)
    const hourlyDowntime: number[] = new Array(24).fill(0)

    if (monitor.logs) {
      for (const log of monitor.logs) {
        // Only count logs from last 24 hours, type 1 = down event
        if (log.type === 1 && log.datetime >= oneDayAgo) {
          incidents24h++
          downtime24hSeconds += log.duration

          // Calculate which hourly bucket(s) this downtime falls into
          const downtimeStart = log.datetime
          const downtimeEnd = log.datetime + log.duration

          for (let t = downtimeStart; t < downtimeEnd; t += 60) {
            if (t >= oneDayAgo && t <= now) {
              const hoursAgo = Math.floor((now - t) / 3600)
              if (hoursAgo >= 0 && hoursAgo < 24) {
                hourlyDowntime[hoursAgo] += 1 // Add 1 minute of downtime
              }
            }
          }
        }
      }
    }

    // Build timeline array
    const timeline: Last24HoursStats['timeline'] = hourlyDowntime.map((minutes, hour) => ({
      hour,
      status: minutes === 0 ? 'up' : minutes >= 60 ? 'down' : 'partial',
      downtimeMinutes: minutes,
    }))

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

    // Calculate current uptime duration (time since last "up" event or monitoring started)
    let currentStatusInfo: CurrentStatusInfo | undefined
    if (status === 'up' && monitor.logs) {
      // Find the most recent "up" event (type 2) or "started" event (type 98) to calculate duration
      // Type 2 = recovered from down, Type 98 = monitoring started
      const upOrStartEvents = monitor.logs
        .filter(log => log.type === 2 || log.type === 98)
        .sort((a, b) => b.datetime - a.datetime)

      if (upOrStartEvents.length > 0) {
        const lastUpTime = upOrStartEvents[0].datetime
        const uptimeSeconds = now - lastUpTime
        const days = Math.floor(uptimeSeconds / 86400)
        const hours = Math.floor((uptimeSeconds % 86400) / 3600)
        const minutes = Math.floor((uptimeSeconds % 3600) / 60)

        let durationStr = ''
        if (days > 0) durationStr += `${days}d `
        if (hours > 0 || days > 0) durationStr += `${hours}h `
        durationStr += `${minutes}m`

        currentStatusInfo = {
          uptimeDuration: durationStr.trim(),
          checkInterval: monitor.interval >= 60 ? `${Math.round(monitor.interval / 60)} minute${monitor.interval >= 120 ? 's' : ''}` : `${monitor.interval} seconds`,
        }
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
        timeline,
      },
      ssl: sslInfo,
      currentStatus: currentStatusInfo,
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
