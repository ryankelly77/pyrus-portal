import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Verify Mailgun webhook signature
function verifyWebhookSignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const encodedToken = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp.concat(token))
    .digest('hex')
  return encodedToken === signature
}

// POST /api/mailgun/webhook - Handle Mailgun webhook events
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract webhook data
    const eventData = formData.get('event-data')
    let event: Record<string, unknown>

    if (eventData && typeof eventData === 'string') {
      // New webhook format (JSON in event-data field)
      event = JSON.parse(eventData)
    } else {
      // Legacy webhook format (form fields)
      event = Object.fromEntries(formData.entries()) as Record<string, unknown>
    }

    // Verify signature if webhook signing key is configured
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
    if (signingKey) {
      const signature = event.signature as { timestamp?: string; token?: string; signature?: string } | undefined
      if (signature?.timestamp && signature?.token && signature?.signature) {
        const isValid = verifyWebhookSignature(
          signingKey,
          signature.timestamp,
          signature.token,
          signature.signature
        )
        if (!isValid) {
          console.error('Invalid Mailgun webhook signature')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
      }
    }

    // Extract event details
    const eventType = (event.event as string) || (event['event-data'] as Record<string, unknown>)?.event as string
    const recipient = (event.recipient as string) ||
      ((event['event-data'] as Record<string, unknown>)?.recipient as string)
    const timestamp = event.timestamp ||
      ((event['event-data'] as Record<string, unknown>)?.timestamp)

    console.log(`Mailgun webhook: ${eventType} for ${recipient}`)

    if (!recipient) {
      return NextResponse.json({ received: true })
    }

    // Map Mailgun events to our status values
    const statusMap: Record<string, string> = {
      delivered: 'delivered',
      opened: 'opened',
      clicked: 'clicked',
      failed: 'failed',
      bounced: 'bounced',
      complained: 'complained',
      unsubscribed: 'unsubscribed',
    }

    const newStatus = statusMap[eventType]
    if (!newStatus) {
      // Event type we don't track
      return NextResponse.json({ received: true })
    }

    // Update the most recent communication for this recipient
    const updateQuery = `
      UPDATE client_communications
      SET
        status = $1,
        ${eventType === 'opened' ? 'opened_at = $2,' : ''}
        ${eventType === 'clicked' ? 'clicked_at = $2,' : ''}
        metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
      WHERE id = (
        SELECT id FROM client_communications
        WHERE recipient_email = $4
        AND comm_type LIKE 'email%'
        ORDER BY sent_at DESC
        LIMIT 1
      )
    `

    const eventTimestamp = timestamp ? new Date(Number(timestamp) * 1000) : new Date()
    const metadataUpdate = JSON.stringify({
      [`${eventType}_at`]: eventTimestamp.toISOString(),
      [`${eventType}_event`]: true,
    })

    await dbPool.query(updateQuery, [
      newStatus,
      eventTimestamp,
      metadataUpdate,
      recipient.toLowerCase(),
    ])

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Mailgun webhook error:', error)
    // Return 200 to prevent Mailgun from retrying
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}

// Mailgun may also send GET requests to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: 'Mailgun webhook endpoint active' })
}
