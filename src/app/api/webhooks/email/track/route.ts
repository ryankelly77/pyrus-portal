// ============================================================
// Email Tracking Webhook Handler
// ============================================================
//
// Handles email open events from email providers (SendGrid, Resend, etc.)
// Updates recommendation_invites.email_opened_at for pipeline scoring.
//
// URL Structure: /api/webhooks/email/track?token={invite_token}
// Can be embedded as a tracking pixel in recommendation emails.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

// GET /api/webhooks/email/track - Tracking pixel endpoint
// Returns a 1x1 transparent GIF
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (token) {
    // Fire-and-forget tracking update
    trackEmailOpen(token).catch(console.error)
  }

  // Return 1x1 transparent GIF
  const TRANSPARENT_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}

// POST /api/webhooks/email/track - Webhook from email provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle different email provider formats
    // SendGrid format
    if (body.event === 'open' && body.sg_message_id) {
      const email = body.email
      if (email) {
        await trackEmailOpenByEmail(email)
      }
      return NextResponse.json({ status: 'processed' })
    }

    // Resend format
    if (body.type === 'email.opened' && body.data?.email) {
      await trackEmailOpenByEmail(body.data.email)
      return NextResponse.json({ status: 'processed' })
    }

    // Generic format with token
    if (body.token) {
      await trackEmailOpen(body.token)
      return NextResponse.json({ status: 'processed' })
    }

    // If we can't identify the format, acknowledge but don't process
    return NextResponse.json({ status: 'ignored', reason: 'Unknown format' })
  } catch (error) {
    console.error('Email tracking webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 200 }) // Return 200 to prevent retries
  }
}

async function trackEmailOpen(inviteToken: string) {
  try {
    // Find invite by token
    const result = await dbPool.query(
      `SELECT id, recommendation_id, email_opened_at
       FROM recommendation_invites
       WHERE invite_token = $1`,
      [inviteToken]
    )

    if (result.rows.length === 0) {
      console.log(`No invite found for token: ${inviteToken}`)
      return
    }

    const invite = result.rows[0]

    // Only update if not already tracked
    if (invite.email_opened_at) {
      console.log(`Email already marked as opened for invite: ${invite.id}`)
      return
    }

    // Update email_opened_at
    await dbPool.query(
      `UPDATE recommendation_invites
       SET email_opened_at = NOW()
       WHERE id = $1`,
      [invite.id]
    )

    console.log(`Tracked email open for invite: ${invite.id}`)

    // Trigger score recalculation
    triggerRecalculation(invite.recommendation_id, 'email_opened').catch(console.error)
  } catch (error) {
    console.error('Failed to track email open:', error)
  }
}

async function trackEmailOpenByEmail(email: string) {
  try {
    // Find the most recent invite for this email that hasn't been opened
    const result = await dbPool.query(
      `SELECT id, recommendation_id
       FROM recommendation_invites
       WHERE email = $1 AND email_opened_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      console.log(`No unopened invite found for email: ${email}`)
      return
    }

    const invite = result.rows[0]

    // Update email_opened_at
    await dbPool.query(
      `UPDATE recommendation_invites
       SET email_opened_at = NOW()
       WHERE id = $1`,
      [invite.id]
    )

    console.log(`Tracked email open for invite: ${invite.id} (${email})`)

    // Trigger score recalculation
    triggerRecalculation(invite.recommendation_id, 'email_opened').catch(console.error)
  } catch (error) {
    console.error('Failed to track email open by email:', error)
  }
}
