// ============================================================
// Snooze Deal API
// ============================================================
//
// POST - Snooze a deal until a specific date
// DELETE - Cancel/remove snooze early
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

// POST /api/admin/recommendations/[id]/snooze
// Snooze a deal until a specific date
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    // Check role
    if (!['admin', 'super_admin', 'sales'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { snoozed_until, reason } = body

    // Validate snoozed_until is provided
    if (!snoozed_until) {
      return NextResponse.json(
        { error: 'snoozed_until is required' },
        { status: 400 }
      )
    }

    // Validate snoozed_until is in the future
    const snoozeDate = new Date(snoozed_until)
    if (isNaN(snoozeDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for snoozed_until' },
        { status: 400 }
      )
    }

    if (snoozeDate <= new Date()) {
      return NextResponse.json(
        { error: 'snoozed_until must be in the future' },
        { status: 400 }
      )
    }

    // Fetch recommendation to check status
    const recResult = await dbPool.query(
      `SELECT id, status FROM recommendations WHERE id = $1`,
      [id]
    )

    if (recResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    const recommendation = recResult.rows[0]

    // Can only snooze 'sent' or 'declined' deals
    if (!['sent', 'declined'].includes(recommendation.status)) {
      return NextResponse.json(
        { error: `Cannot snooze a deal with status '${recommendation.status}'. Only 'sent' or 'declined' deals can be snoozed.` },
        { status: 400 }
      )
    }

    // Update recommendation with snooze
    await dbPool.query(
      `UPDATE recommendations
       SET snoozed_until = $1,
           snoozed_at = NOW(),
           snooze_reason = $2
       WHERE id = $3`,
      [snoozeDate.toISOString(), reason || null, id]
    )

    // Insert into snooze history
    await dbPool.query(
      `INSERT INTO pipeline_snooze_history
       (recommendation_id, snoozed_at, snoozed_until, reason, created_by)
       VALUES ($1, NOW(), $2, $3, $4)`,
      [id, snoozeDate.toISOString(), reason || null, user.id]
    )

    // Trigger score recalculation
    await triggerRecalculation(id, 'deal_snoozed')

    // Fetch and return updated recommendation
    const updatedResult = await dbPool.query(
      `SELECT id, snoozed_until, snoozed_at, snooze_reason, confidence_score
       FROM recommendations WHERE id = $1`,
      [id]
    )

    return NextResponse.json({
      success: true,
      recommendation: updatedResult.rows[0],
    })
  } catch (error) {
    console.error('Failed to snooze deal:', error)
    return NextResponse.json(
      { error: 'Failed to snooze deal' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/recommendations/[id]/snooze
// Cancel/remove snooze early
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { profile } = auth

    // Check role
    if (!['admin', 'super_admin', 'sales'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if recommendation exists and is snoozed
    const recResult = await dbPool.query(
      `SELECT id, snoozed_until FROM recommendations WHERE id = $1`,
      [id]
    )

    if (recResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    const recommendation = recResult.rows[0]

    if (!recommendation.snoozed_until) {
      return NextResponse.json(
        { error: 'Deal is not currently snoozed' },
        { status: 400 }
      )
    }

    // Clear snooze on recommendation
    await dbPool.query(
      `UPDATE recommendations
       SET snoozed_until = NULL,
           snoozed_at = NULL,
           snooze_reason = NULL
       WHERE id = $1`,
      [id]
    )

    // Update snooze history - mark as cancelled
    await dbPool.query(
      `UPDATE pipeline_snooze_history
       SET cancelled_at = NOW()
       WHERE recommendation_id = $1
         AND cancelled_at IS NULL
         AND snoozed_until > NOW()`,
      [id]
    )

    // Trigger score recalculation
    await triggerRecalculation(id, 'snooze_cancelled')

    // Fetch and return updated recommendation
    const updatedResult = await dbPool.query(
      `SELECT id, snoozed_until, snoozed_at, snooze_reason, confidence_score
       FROM recommendations WHERE id = $1`,
      [id]
    )

    return NextResponse.json({
      success: true,
      recommendation: updatedResult.rows[0],
    })
  } catch (error) {
    console.error('Failed to cancel snooze:', error)
    return NextResponse.json(
      { error: 'Failed to cancel snooze' },
      { status: 500 }
    )
  }
}
