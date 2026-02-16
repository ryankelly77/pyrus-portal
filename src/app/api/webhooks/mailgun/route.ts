import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { enrollInAutomations, checkAndStopEnrollments } from '@/lib/email/automation-service'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Mailgun webhook signing key
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
    console.warn('MAILGUN_WEBHOOK_SIGNING_KEY not configured, skipping signature verification')
    return true // Allow in development
  }

  const encodedToken = crypto
    .createHmac('sha256', MAILGUN_WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest('hex')

  return encodedToken === signature
}

/**
 * POST /api/webhooks/mailgun - Handle Mailgun webhook events
 *
 * Events we care about:
 * - opened: Email was opened
 * - clicked: Link in email was clicked
 * - delivered: Email was delivered (for tracking)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract signature data
    const timestamp = formData.get('timestamp') as string
    const token = formData.get('token') as string
    const signature = formData.get('signature') as string

    // Verify signature
    if (!verifyWebhookSignature(timestamp, token, signature)) {
      console.error('Invalid Mailgun webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Extract event data
    const eventType = formData.get('event') as string
    const recipient = formData.get('recipient') as string
    const messageId = formData.get('Message-Id') as string
    const tags = formData.getAll('tag') as string[]

    console.log(`Mailgun webhook: ${eventType} for ${recipient}`, { tags, messageId })

    // Only process recommendation-invite emails
    if (!tags.includes('recommendation-invite')) {
      return NextResponse.json({ received: true, skipped: 'not recommendation-invite' })
    }

    // Find the invite by recipient email
    // Get the most recent pending/sent invite for this email
    const invite = await prisma.recommendation_invites.findFirst({
      where: {
        email: recipient.toLowerCase(),
        status: { in: ['pending', 'sent', 'viewed'] },
      },
      orderBy: { sent_at: 'desc' },
      include: {
        recommendation: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!invite) {
      console.log(`No invite found for ${recipient}`)
      return NextResponse.json({ received: true, skipped: 'no invite found' })
    }

    const now = new Date()
    const contextData = {
      inviteId: invite.id,
      recommendationId: invite.recommendation_id,
      clientId: invite.recommendation.client.id,
      clientName: invite.recommendation.client.name,
      firstName: invite.first_name,
      lastName: invite.last_name,
      email: invite.email,
    }

    if (eventType === 'opened') {
      // Update email_logs if we have the message ID
      if (messageId) {
        await prisma.email_logs.updateMany({
          where: { mailgun_message_id: messageId },
          data: { status: 'opened', status_updated_at: now },
        })
      }

      // Update email_opened_at on invite (only if not already set)
      await dbPool.query(
        `UPDATE recommendation_invites SET email_opened_at = $1 WHERE id = $2 AND email_opened_at IS NULL`,
        [now, invite.id]
      )

      // Enroll in automations triggered by email opened
      await enrollInAutomations('recommendation_email_opened', {
        recipientEmail: invite.email,
        recipientName: `${invite.first_name} ${invite.last_name}`,
        triggerRecordType: 'recommendation_invite',
        triggerRecordId: invite.id,
        contextData: {
          ...contextData,
          openedAt: now.toISOString(),
        },
      })

      // Check if any automations should stop based on email being opened
      await checkAndStopEnrollments(
        'recommendation_invite',
        invite.id,
        { email_opened: true }
      )

      // Trigger score recalculation
      triggerRecalculation(invite.recommendation_id, 'email_opened').catch(console.error)

      console.log(`Processed email opened for invite ${invite.id}`)
    }

    if (eventType === 'clicked') {
      // Update email_logs if we have the message ID
      if (messageId) {
        await prisma.email_logs.updateMany({
          where: { mailgun_message_id: messageId },
          data: { status: 'clicked', status_updated_at: now },
        })
      }

      // Enroll in automations triggered by email clicked
      await enrollInAutomations('recommendation_email_clicked', {
        recipientEmail: invite.email,
        recipientName: `${invite.first_name} ${invite.last_name}`,
        triggerRecordType: 'recommendation_invite',
        triggerRecordId: invite.id,
        contextData: {
          ...contextData,
          clickedAt: now.toISOString(),
          clickedUrl: formData.get('url') as string,
        },
      })

      // Check if any automations should stop
      await checkAndStopEnrollments(
        'recommendation_invite',
        invite.id,
        { email_clicked: true }
      )

      // Trigger score recalculation
      triggerRecalculation(invite.recommendation_id, 'email_clicked').catch(console.error)

      console.log(`Processed email clicked for invite ${invite.id}`)
    }

    if (eventType === 'delivered') {
      // Update email_logs status
      if (messageId) {
        await prisma.email_logs.updateMany({
          where: { mailgun_message_id: messageId },
          data: { status: 'delivered', status_updated_at: now },
        })
      }
    }

    return NextResponse.json({ received: true, processed: eventType })
  } catch (error) {
    console.error('Mailgun webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
