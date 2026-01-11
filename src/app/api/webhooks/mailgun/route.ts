import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Mailgun webhook signing key (from Mailgun dashboard -> Webhooks)
const MAILGUN_WEBHOOK_SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY

/**
 * Verify Mailgun webhook signature
 */
function verifyWebhookSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  if (!MAILGUN_WEBHOOK_SIGNING_KEY) {
    console.warn('[Mailgun Webhook] No signing key configured, skipping verification')
    return true // Allow in development without key
  }

  const encodedToken = crypto
    .createHmac('sha256', MAILGUN_WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest('hex')

  return encodedToken === signature
}

/**
 * POST /api/webhooks/mailgun - Handle Mailgun webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Mailgun sends events in different formats depending on webhook version
    // Legacy webhooks send flat data, newer ones nest under "event-data"
    const eventData = body['event-data'] || body
    const signature = body.signature || {}

    // Verify signature if signing key is configured
    if (MAILGUN_WEBHOOK_SIGNING_KEY) {
      const isValid = verifyWebhookSignature(
        signature.timestamp,
        signature.token,
        signature.signature
      )
      if (!isValid) {
        console.error('[Mailgun Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = eventData.event || body.event
    const messageId = eventData.message?.headers?.['message-id'] || body['message-id'] || body['Message-Id']
    const recipient = eventData.recipient || body.recipient

    console.log(`[Mailgun Webhook] Event: ${event}, MessageId: ${messageId}, Recipient: ${recipient}`)

    if (!messageId) {
      console.warn('[Mailgun Webhook] No message ID in webhook payload')
      return NextResponse.json({ received: true })
    }

    // Clean up message ID (remove angle brackets if present)
    const cleanMessageId = messageId.replace(/^<|>$/g, '')

    // Find the communication record by Mailgun message ID
    // The message ID is stored in metadata.mailgunMessageId
    const communications = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM client_communications
      WHERE metadata->>'mailgunMessageId' LIKE ${'%' + cleanMessageId + '%'}
      LIMIT 1
    `

    if (!communications || communications.length === 0) {
      console.warn(`[Mailgun Webhook] No communication found for message ID: ${cleanMessageId}`)
      return NextResponse.json({ received: true })
    }

    const commId = communications[0].id
    const now = new Date()

    // Update based on event type
    switch (event) {
      case 'delivered':
        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            status: 'delivered',
            metadata: {
              deliveredAt: now.toISOString(),
            },
          },
        })
        console.log(`[Mailgun Webhook] Marked ${commId} as delivered`)
        break

      case 'opened':
        // Don't downgrade status if already clicked
        const commForOpen = await prisma.client_communications.findUnique({
          where: { id: commId },
          select: { status: true, opened_at: true },
        })

        // Only update if not already opened (first open)
        if (!commForOpen?.opened_at) {
          await prisma.client_communications.update({
            where: { id: commId },
            data: {
              status: commForOpen?.status === 'clicked' ? 'clicked' : 'opened',
              opened_at: now,
            },
          })
          console.log(`[Mailgun Webhook] Marked ${commId} as opened`)
        }
        break

      case 'clicked':
        // Get the clicked URL from the event data
        const clickedUrl = eventData.url || body.url

        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            status: 'clicked',
            clicked_at: now,
            metadata: {
              clickedUrl: clickedUrl,
              clickedAt: now.toISOString(),
            },
          },
        })
        console.log(`[Mailgun Webhook] Marked ${commId} as clicked (URL: ${clickedUrl})`)
        break

      case 'failed':
      case 'rejected':
        const errorMessage = eventData['delivery-status']?.message ||
                           eventData.reason ||
                           body.reason ||
                           'Delivery failed'

        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            status: 'failed',
            metadata: {
              errorMessage: errorMessage,
              failedAt: now.toISOString(),
            },
          },
        })
        console.log(`[Mailgun Webhook] Marked ${commId} as failed: ${errorMessage}`)
        break

      case 'complained':
        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            status: 'bounced',
            metadata: {
              complaint: true,
              complainedAt: now.toISOString(),
            },
          },
        })
        console.log(`[Mailgun Webhook] Marked ${commId} as complained/bounced`)
        break

      case 'unsubscribed':
        // Log but don't change status
        console.log(`[Mailgun Webhook] Recipient ${recipient} unsubscribed`)
        break

      default:
        console.log(`[Mailgun Webhook] Unhandled event type: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Mailgun Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// Mailgun may send GET requests to verify the webhook URL
export async function GET() {
  return NextResponse.json({ status: 'Mailgun webhook endpoint active' })
}
