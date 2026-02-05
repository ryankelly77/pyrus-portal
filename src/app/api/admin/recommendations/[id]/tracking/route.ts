// ============================================================
// Recommendation Invite Tracking API
// ============================================================
//
// Updates tracking fields on recommendation_invites:
//   - email_opened_at: When the invite email was opened
//   - account_created_at: When the invitee created an account
//
// These events affect pipeline scoring penalties.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

type TrackingEvent = 'email_opened' | 'account_created'

// POST /api/admin/recommendations/[id]/tracking
// Updates tracking fields for an invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const { inviteId, event, timestamp } = body as {
      inviteId: string
      event: TrackingEvent
      timestamp?: string
    }

    // Validate inputs
    if (!inviteId) {
      return NextResponse.json(
        { error: 'inviteId is required' },
        { status: 400 }
      )
    }
    if (!['email_opened', 'account_created'].includes(event)) {
      return NextResponse.json(
        { error: 'Invalid event. Must be email_opened or account_created' },
        { status: 400 }
      )
    }

    // Verify invite exists and belongs to this recommendation
    const inviteResult = await dbPool.query(
      `SELECT id, email_opened_at, account_created_at
       FROM recommendation_invites
       WHERE id = $1 AND recommendation_id = $2`,
      [inviteId, id]
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invite not found or does not belong to this recommendation' },
        { status: 404 }
      )
    }

    const invite = inviteResult.rows[0]
    const eventTime = timestamp ? new Date(timestamp) : new Date()
    let columnToUpdate: string | null = null

    if (event === 'email_opened') {
      // Only update if not already set (first open)
      if (invite.email_opened_at) {
        return NextResponse.json({
          message: 'Email already marked as opened',
          emailOpenedAt: invite.email_opened_at,
        })
      }
      columnToUpdate = 'email_opened_at'
    } else if (event === 'account_created') {
      // Only update if not already set
      if (invite.account_created_at) {
        return NextResponse.json({
          message: 'Account already marked as created',
          accountCreatedAt: invite.account_created_at,
        })
      }
      columnToUpdate = 'account_created_at'
    }

    if (!columnToUpdate) {
      return NextResponse.json({ message: 'No update needed' })
    }

    // Update the invite
    const updateResult = await dbPool.query(
      `UPDATE recommendation_invites
       SET ${columnToUpdate} = $1
       WHERE id = $2
       RETURNING id, email_opened_at, account_created_at, viewed_at`,
      [eventTime, inviteId]
    )

    const updated = updateResult.rows[0]

    // Trigger score recalculation
    triggerRecalculation(id, event).catch(console.error)

    return NextResponse.json({
      invite: {
        id: updated.id,
        emailOpenedAt: updated.email_opened_at,
        accountCreatedAt: updated.account_created_at,
        viewedAt: updated.viewed_at,
      },
    })
  } catch (error) {
    console.error('Failed to update tracking:', error)
    return NextResponse.json(
      { error: 'Failed to update tracking' },
      { status: 500 }
    )
  }
}

// GET /api/admin/recommendations/[id]/tracking
// Returns tracking status for all invites
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Use raw SQL to handle new columns not yet in Prisma schema
    const result = await dbPool.query(
      `SELECT
        id,
        email,
        first_name,
        last_name,
        sent_at,
        email_opened_at,
        account_created_at,
        viewed_at,
        status
       FROM recommendation_invites
       WHERE recommendation_id = $1
       ORDER BY created_at DESC`,
      [id]
    )

    return NextResponse.json({
      invites: result.rows.map(inv => ({
        id: inv.id,
        email: inv.email,
        firstName: inv.first_name,
        lastName: inv.last_name,
        sentAt: inv.sent_at,
        emailOpenedAt: inv.email_opened_at,
        accountCreatedAt: inv.account_created_at,
        viewedAt: inv.viewed_at,
        status: inv.status,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch tracking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracking' },
      { status: 500 }
    )
  }
}
