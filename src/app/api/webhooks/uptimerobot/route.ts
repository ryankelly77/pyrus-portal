import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// UptimeRobot webhook payload
// Docs: https://uptimerobot.com/api/#alert-contacts
// alertType: 1 = down, 2 = up
interface UptimeRobotWebhook {
  monitorID: string
  monitorURL: string
  monitorFriendlyName: string
  alertType: string // "1" = down, "2" = up
  alertTypeFriendlyName: string // "Down" or "Up"
  alertDetails: string
  alertDuration?: string // seconds (only for "up" alerts)
  alertDateTime?: string
}

export async function POST(request: NextRequest) {
  try {
    // UptimeRobot sends data as form-urlencoded
    const formData = await request.formData()

    const payload: UptimeRobotWebhook = {
      monitorID: formData.get('monitorID')?.toString() || '',
      monitorURL: formData.get('monitorURL')?.toString() || '',
      monitorFriendlyName: formData.get('monitorFriendlyName')?.toString() || '',
      alertType: formData.get('alertType')?.toString() || '',
      alertTypeFriendlyName: formData.get('alertTypeFriendlyName')?.toString() || '',
      alertDetails: formData.get('alertDetails')?.toString() || '',
      alertDuration: formData.get('alertDuration')?.toString() || '',
      alertDateTime: formData.get('alertDateTime')?.toString() || '',
    }

    console.log('UptimeRobot webhook received:', payload)

    if (!payload.monitorID) {
      return NextResponse.json({ error: 'Missing monitorID' }, { status: 400 })
    }

    // Find client by uptimerobot_monitor_id
    const clientResult = await dbPool.query(
      'SELECT id, name FROM clients WHERE uptimerobot_monitor_id = $1',
      [payload.monitorID]
    )

    if (clientResult.rows.length === 0) {
      console.log(`No client found for monitor ID: ${payload.monitorID}`)
      return NextResponse.json({ status: 'ok', message: 'No client matched' })
    }

    const client = clientResult.rows[0]
    const isDown = payload.alertType === '1'
    const isUp = payload.alertType === '2'

    // Format duration for "up" alerts
    let durationText = ''
    if (isUp && payload.alertDuration) {
      const seconds = parseInt(payload.alertDuration, 10)
      if (seconds < 60) {
        durationText = `${seconds} seconds`
      } else if (seconds < 3600) {
        durationText = `${Math.round(seconds / 60)} minutes`
      } else {
        const hours = Math.floor(seconds / 3600)
        const mins = Math.round((seconds % 3600) / 60)
        durationText = mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`
      }
    }

    // Create notification in client_communications
    const title = isDown
      ? `Website Down: ${payload.monitorFriendlyName}`
      : `Website Back Up: ${payload.monitorFriendlyName}`

    const body = isDown
      ? `${payload.monitorFriendlyName} (${payload.monitorURL}) is currently down. ${payload.alertDetails || ''}`
      : `${payload.monitorFriendlyName} (${payload.monitorURL}) is back online${durationText ? ` after ${durationText} of downtime` : ''}.`

    await dbPool.query(`
      INSERT INTO client_communications (
        client_id, comm_type, title, body, status, highlight_type, metadata, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      client.id,
      'website_status',
      title,
      body,
      'sent',
      isDown ? 'failed' : 'success',
      JSON.stringify({
        monitorID: payload.monitorID,
        monitorURL: payload.monitorURL,
        alertType: payload.alertType,
        alertTypeFriendlyName: payload.alertTypeFriendlyName,
        alertDuration: payload.alertDuration,
      }),
    ])

    console.log(`Created website status notification for client: ${client.name}`)

    return NextResponse.json({ status: 'ok', client: client.name })
  } catch (error) {
    console.error('UptimeRobot webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Also support GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'UptimeRobot webhook endpoint' })
}
