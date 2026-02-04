// UptimeRobot API client
// API documentation: https://uptimerobot.com/api/

import { logUptimeError } from '@/lib/alerts'

const UPTIMEROBOT_API_URL = 'https://api.uptimerobot.com/v2'

interface UptimeRobotMonitor {
  id: number
  friendly_name: string
  url: string
  status: number // 0=paused, 1=not checked yet, 2=up, 8=seems down, 9=down
  all_time_uptime_ratio: string // e.g., "99.98"
  custom_uptime_ratio: string // For requested time range
}

interface UptimeRobotResponse {
  stat: 'ok' | 'fail'
  monitors?: UptimeRobotMonitor[]
  error?: {
    message: string
  }
}

export interface UptimeData {
  uptime: string // e.g., "99.9%"
  status: 'up' | 'down' | 'paused' | 'unknown'
  monitorName: string
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
        custom_uptime_ratios: '30', // Last 30 days
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

    // Use 30-day uptime ratio, format to one decimal place
    const uptimeRatio = parseFloat(monitor.custom_uptime_ratio || monitor.all_time_uptime_ratio)
    const formattedUptime = `${uptimeRatio.toFixed(1)}%`

    return {
      uptime: formattedUptime,
      status,
      monitorName: monitor.friendly_name,
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
