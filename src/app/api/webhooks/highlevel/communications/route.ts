// ============================================================
// HighLevel Communications Webhook Handler
// ============================================================
//
// Receives webhook events from HighLevel for new messages and
// syncs them into recommendation_communications for scoring.
//
// HighLevel Webhook Events:
//   - InboundMessage: Customer sent a message
//   - OutboundMessage: Agent/automation sent a message
//
// Flow:
//   1. Verify webhook (optional signature verification)
//   2. Extract contact_id and message details
//   3. Look up client by highlevel_id
//   4. Find active recommendation for client
//   5. Deduplicate by highlevel_message_id
//   6. Insert communication record
//   7. Trigger score recalculation
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// HighLevel webhook payload types
interface HighLevelMessage {
  id: string
  type: string // 'SMS', 'Email', 'FB', 'IG', 'GMB', 'Call', 'Live_Chat', etc.
  direction: 'inbound' | 'outbound'
  contactId: string
  locationId: string
  dateAdded?: string
  messageType?: string
  body?: string
}

interface HighLevelWebhookPayload {
  type: string // 'InboundMessage', 'OutboundMessage', etc.
  locationId: string
  message?: HighLevelMessage
  // Sometimes the payload structure varies
  contactId?: string
  messageId?: string
  dateAdded?: string
  messageType?: string
  direction?: string
}

// Map HighLevel message types to our channels
function mapChannel(hlType: string | undefined): 'email' | 'sms' | 'chat' | 'call' | 'other' {
  if (!hlType) return 'other'

  const typeUpper = hlType.toUpperCase()

  if (typeUpper === 'EMAIL') return 'email'
  if (typeUpper === 'SMS' || typeUpper === 'WHATSAPP') return 'sms'
  if (typeUpper === 'CALL' || typeUpper === 'VOICEMAIL') return 'call'
  if (['FB', 'IG', 'GMB', 'LIVE_CHAT', 'WEBCHAT'].includes(typeUpper)) return 'chat'

  return 'other'
}

// Map HighLevel direction to our direction
function mapDirection(hlDirection: string | undefined, eventType: string): 'inbound' | 'outbound' {
  if (hlDirection) {
    return hlDirection.toLowerCase() === 'inbound' ? 'inbound' : 'outbound'
  }
  // Infer from event type
  return eventType.toLowerCase().includes('inbound') ? 'inbound' : 'outbound'
}

// Verify webhook signature (if HighLevel provides one)
function verifyWebhook(request: NextRequest, body: string): boolean {
  const webhookSecret = process.env.HIGHLEVEL_WEBHOOK_SECRET

  // If no secret configured, accept all webhooks (development mode)
  if (!webhookSecret) {
    console.warn('HIGHLEVEL_WEBHOOK_SECRET not configured - accepting webhook without verification')
    return true
  }

  const signature = request.headers.get('x-ghl-signature')
  if (!signature) {
    console.warn('No x-ghl-signature header found')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  let bodyText: string
  let payload: HighLevelWebhookPayload

  try {
    bodyText = await request.text()
    payload = JSON.parse(bodyText)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Log the webhook for debugging
  console.log('HighLevel webhook received:', {
    type: payload.type,
    locationId: payload.locationId,
    contactId: payload.contactId || payload.message?.contactId,
  })

  // Verify webhook signature
  if (!verifyWebhook(request, bodyText)) {
    console.error('Webhook verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Only process message events
  const messageEvents = ['InboundMessage', 'OutboundMessage', 'SMS', 'Email', 'Call']
  if (!messageEvents.some(e => payload.type?.includes(e))) {
    // Acknowledge but don't process
    return NextResponse.json({ status: 'ignored', reason: 'Not a message event' })
  }

  try {
    // Extract message details (handle different payload structures)
    const message = payload.message || {
      id: payload.messageId || `hl_${Date.now()}`,
      type: payload.messageType || payload.type,
      direction: payload.direction,
      contactId: payload.contactId,
      dateAdded: payload.dateAdded,
    }

    const contactId = message.contactId || payload.contactId
    const messageId = message.id || payload.messageId
    const direction = mapDirection(message.direction as string, payload.type)
    const channel = mapChannel(message.type || payload.messageType)
    const contactAt = message.dateAdded ? new Date(message.dateAdded) : new Date()

    if (!contactId) {
      console.warn('No contactId in webhook payload')
      return NextResponse.json({ status: 'ignored', reason: 'No contactId' })
    }

    // Look up client by highlevel_id
    const clientResult = await dbPool.query(
      `SELECT id, name FROM clients WHERE highlevel_id = $1`,
      [contactId]
    )

    if (clientResult.rows.length === 0) {
      // Client not found - not all HighLevel contacts are in our system
      console.log(`No client found for HighLevel contact: ${contactId}`)
      return NextResponse.json({ status: 'ignored', reason: 'Client not found' })
    }

    const client = clientResult.rows[0]

    // Find the most recent active recommendation for this client
    const recResult = await dbPool.query(
      `SELECT id FROM recommendations
       WHERE client_id = $1 AND status = 'sent'
       ORDER BY created_at DESC
       LIMIT 1`,
      [client.id]
    )

    if (recResult.rows.length === 0) {
      console.log(`No active recommendation for client: ${client.name}`)
      return NextResponse.json({ status: 'ignored', reason: 'No active recommendation' })
    }

    const recommendationId = recResult.rows[0].id

    // Check for duplicate message
    if (messageId) {
      const dupResult = await dbPool.query(
        `SELECT id FROM recommendation_communications WHERE highlevel_message_id = $1`,
        [messageId]
      )

      if (dupResult.rows.length > 0) {
        console.log(`Duplicate message ignored: ${messageId}`)
        return NextResponse.json({ status: 'ignored', reason: 'Duplicate message' })
      }
    }

    // Insert communication record
    const insertResult = await dbPool.query(
      `INSERT INTO recommendation_communications
        (recommendation_id, direction, channel, contact_at, source, highlevel_message_id)
       VALUES ($1, $2, $3, $4, 'highlevel_webhook', $5)
       RETURNING id`,
      [recommendationId, direction, channel, contactAt, messageId || null]
    )

    const commId = insertResult.rows[0].id
    console.log(`Logged HighLevel communication: ${commId} (${direction} ${channel})`)

    // Trigger score recalculation (fire-and-forget)
    triggerRecalculation(recommendationId, 'highlevel_sync').catch((err) => {
      console.error('Failed to trigger recalculation:', err)
    })

    return NextResponse.json({
      status: 'success',
      communicationId: commId,
      direction,
      channel,
    })
  } catch (error) {
    console.error('Failed to process HighLevel webhook:', error)
    // Return 200 to prevent retries for non-transient errors
    return NextResponse.json(
      { status: 'error', message: 'Internal processing error' },
      { status: 200 }
    )
  }
}

// HighLevel sends a GET request to verify the webhook endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'highlevel-communications-webhook' })
}
