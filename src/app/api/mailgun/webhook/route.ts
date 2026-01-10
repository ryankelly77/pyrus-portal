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
    const contentType = request.headers.get('content-type') || ''
    let eventData: Record<string, unknown> | null = null
    let eventType: string | undefined
    let recipient: string | undefined
    let timestamp: number | undefined

    // Handle different content types from Mailgun
    if (contentType.includes('application/json')) {
      // New webhook format - JSON body
      const body = await request.json()
      console.log('Mailgun webhook (JSON):', JSON.stringify(body, null, 2))

      // New format has event-data at the top level
      eventData = body['event-data'] || body
      eventType = eventData?.event as string
      recipient = eventData?.recipient as string
      timestamp = eventData?.timestamp as number

      // Verify signature if configured
      const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
      if (signingKey && body.signature) {
        const sig = body.signature
        if (sig.timestamp && sig.token && sig.signature) {
          const isValid = verifyWebhookSignature(
            signingKey,
            String(sig.timestamp),
            sig.token,
            sig.signature
          )
          if (!isValid) {
            console.error('Invalid Mailgun webhook signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
          }
        }
      }
    } else {
      // Legacy webhook format - form data
      const formData = await request.formData()
      const formEntries = Object.fromEntries(formData.entries())
      console.log('Mailgun webhook (form):', JSON.stringify(formEntries, null, 2))

      // Check for event-data field (might contain JSON)
      const eventDataField = formData.get('event-data')
      if (eventDataField && typeof eventDataField === 'string') {
        eventData = JSON.parse(eventDataField)
        eventType = eventData?.event as string
        recipient = eventData?.recipient as string
        timestamp = eventData?.timestamp as number
      } else {
        // Legacy format with direct form fields
        eventType = formEntries.event as string
        recipient = formEntries.recipient as string
        timestamp = formEntries.timestamp ? Number(formEntries.timestamp) : undefined
      }

      // Verify signature for legacy format
      const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
      if (signingKey) {
        const sigTimestamp = formEntries.timestamp as string
        const sigToken = formEntries.token as string
        const signature = formEntries.signature as string
        if (sigTimestamp && sigToken && signature) {
          const isValid = verifyWebhookSignature(signingKey, sigTimestamp, sigToken, signature)
          if (!isValid) {
            console.error('Invalid Mailgun webhook signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
          }
        }
      }
    }

    console.log(`Mailgun webhook: event=${eventType}, recipient=${recipient}`)

    if (!recipient || !eventType) {
      console.log('Missing recipient or eventType, skipping')
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
      console.log(`Unknown event type: ${eventType}, skipping`)
      return NextResponse.json({ received: true })
    }

    // Build dynamic update query based on event type
    const setClauses = ['status = $1']
    const params: (string | Date)[] = [newStatus]
    let paramIndex = 2

    const eventTimestamp = timestamp ? new Date(timestamp * 1000) : new Date()

    if (eventType === 'opened') {
      setClauses.push(`opened_at = $${paramIndex}`)
      params.push(eventTimestamp)
      paramIndex++
    } else if (eventType === 'clicked') {
      setClauses.push(`clicked_at = $${paramIndex}`)
      params.push(eventTimestamp)
      paramIndex++
    }

    const metadataUpdate = JSON.stringify({
      [`${eventType}_at`]: eventTimestamp.toISOString(),
      [`${eventType}_event`]: true,
    })
    setClauses.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${paramIndex}::jsonb`)
    params.push(metadataUpdate)
    paramIndex++

    // Add recipient as the last parameter
    const recipientLower = recipient.toLowerCase()
    params.push(recipientLower)

    const updateQuery = `
      UPDATE client_communications
      SET ${setClauses.join(', ')}
      WHERE id = (
        SELECT id FROM client_communications
        WHERE LOWER(recipient_email) = $${paramIndex}
        AND comm_type LIKE 'email%'
        ORDER BY COALESCE(sent_at, created_at) DESC
        LIMIT 1
      )
    `

    console.log('Executing update query for recipient:', recipientLower)
    const result = await dbPool.query(updateQuery, params)
    console.log(`Updated ${result.rowCount} rows for ${eventType} event`)

    return NextResponse.json({ received: true, updated: result.rowCount })
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
