import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { logEmailError } from '@/lib/alerts'

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
 * POST /api/mailgun/webhook - Handle Mailgun webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log the full payload for debugging
    console.log('[Mailgun Webhook] Received payload:', JSON.stringify(body, null, 2))

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
    // Try multiple paths for message ID
    const messageId = eventData.message?.headers?.['message-id']
      || eventData['message-id']
      || body['message-id']
      || body['Message-Id']
    const recipient = eventData.recipient || body.recipient

    console.log(`[Mailgun Webhook] Event: ${event}, MessageId: ${messageId}, Recipient: ${recipient}`)

    if (!messageId) {
      console.warn('[Mailgun Webhook] No message ID in webhook payload')
      return NextResponse.json({ received: true })
    }

    // Clean up message ID (remove angle brackets if present)
    const cleanMessageId = messageId.replace(/^<|>$/g, '')
    console.log(`[Mailgun Webhook] Clean message ID: ${cleanMessageId}`)

    // Find the communication record by Mailgun message ID
    // The message ID is stored in metadata.mailgunMessageId
    const searchPattern = `%${cleanMessageId}%`
    const communications = await prisma.$queryRawUnsafe<Array<{ id: string, metadata: any }>>(
      `SELECT id, metadata FROM client_communications WHERE metadata->>'mailgunMessageId' LIKE $1 LIMIT 1`,
      searchPattern
    )

    console.log(`[Mailgun Webhook] Found ${communications?.length || 0} communications`)

    if (!communications || communications.length === 0) {
      console.warn(`[Mailgun Webhook] No communication found for message ID: ${cleanMessageId}`)
      return NextResponse.json({ received: true })
    }

    const comm = communications[0]
    const commId = comm.id
    const existingMetadata = (comm.metadata as Record<string, any>) || {}
    const now = new Date()

    console.log(`[Mailgun Webhook] Updating communication ${commId} for event: ${event}`)

    // Update based on event type
    switch (event) {
      case 'delivered':
        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            status: 'delivered',
            metadata: {
              ...existingMetadata,
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
          select: { status: true, opened_at: true, metadata: true },
        })

        const openMetadata = (commForOpen?.metadata as Record<string, any>) || {}

        // Only update if not already opened (first open)
        if (!commForOpen?.opened_at) {
          await prisma.client_communications.update({
            where: { id: commId },
            data: {
              status: commForOpen?.status === 'clicked' ? 'clicked' : 'opened',
              opened_at: now,
              metadata: {
                ...openMetadata,
                openedAt: now.toISOString(),
              },
            },
          })
          console.log(`[Mailgun Webhook] Marked ${commId} as opened`)
        } else {
          console.log(`[Mailgun Webhook] ${commId} already opened, skipping`)
        }
        break

      case 'clicked':
        // Get the clicked URL from the event data
        const clickedUrl = eventData.url || body.url

        // Get current metadata to merge
        const commForClick = await prisma.client_communications.findUnique({
          where: { id: commId },
          select: { metadata: true },
        })
        const clickMetadata = (commForClick?.metadata as Record<string, any>) || {}

        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            status: 'clicked',
            clicked_at: now,
            metadata: {
              ...clickMetadata,
              clickedUrl: clickedUrl,
              clickedAt: now.toISOString(),
            },
          },
        })
        console.log(`[Mailgun Webhook] Marked ${commId} as clicked (URL: ${clickedUrl})`)
        break

      case 'failed':
      case 'rejected':
      case 'temporary_fail':
        const tempFailMessage = eventData['delivery-status']?.message ||
                           eventData['delivery-status']?.description ||
                           eventData.reason ||
                           body.reason ||
                           'Temporary delivery failure'

        // Don't overwrite if already delivered/opened/clicked
        const commForTempFail = await prisma.client_communications.findUnique({
          where: { id: commId },
          select: { status: true, metadata: true },
        })
        const tempFailMetadata = (commForTempFail?.metadata as Record<string, any>) || {}

        // Only update if not already successfully delivered
        if (!['delivered', 'opened', 'clicked'].includes(commForTempFail?.status || '')) {
          await prisma.client_communications.update({
            where: { id: commId },
            data: {
              status: 'failed',
              metadata: {
                ...tempFailMetadata,
                errorMessage: tempFailMessage,
                failedAt: now.toISOString(),
                failureType: 'temporary',
              },
            },
          })
          console.log(`[Mailgun Webhook] Marked ${commId} as failed (temporary): ${tempFailMessage}`)
        }
        break

      case 'permanent_fail':
        const permFailMessage = eventData['delivery-status']?.message ||
                           eventData['delivery-status']?.description ||
                           eventData.reason ||
                           body.reason ||
                           'Delivery failed permanently'

        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            status: 'bounced',
            metadata: {
              ...existingMetadata,
              errorMessage: permFailMessage,
              bouncedAt: now.toISOString(),
              failureType: 'permanent',
            },
          },
        })
        console.log(`[Mailgun Webhook] Marked ${commId} as bounced (permanent): ${permFailMessage}`)
        break

      case 'complained':
        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            status: 'bounced',
            metadata: {
              ...existingMetadata,
              complaint: true,
              complainedAt: now.toISOString(),
            },
          },
        })
        console.log(`[Mailgun Webhook] Marked ${commId} as complained/bounced`)
        break

      case 'unsubscribed':
        // Update metadata to track unsubscribe
        await prisma.client_communications.update({
          where: { id: commId },
          data: {
            metadata: {
              ...existingMetadata,
              unsubscribed: true,
              unsubscribedAt: now.toISOString(),
            },
          },
        })
        console.log(`[Mailgun Webhook] Recipient ${recipient} unsubscribed, updated ${commId}`)
        break

      default:
        console.log(`[Mailgun Webhook] Unhandled event type: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Mailgun Webhook] Error processing webhook:', error)
    logEmailError(
      `Mailgun webhook processing failed: ${error.message || 'Unknown error'}`,
      'warning',
      { error: error.message },
      'api/mailgun/webhook/route.ts'
    )
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
