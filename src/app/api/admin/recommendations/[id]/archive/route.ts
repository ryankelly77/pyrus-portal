// ============================================================
// Archive/Revive Deal API
// ============================================================
//
// POST - Archive a deal (move to archived section)
// DELETE - Revive a deal (bring back to active pipeline with fresh scoring)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { recalculateScore, triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

// POST /api/admin/recommendations/[id]/archive
// Archive a deal
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
    const body = await request.json().catch(() => ({}))
    const { reason, notes } = body

    // Valid archive reasons
    const VALID_REASONS = [
      'went_dark',
      'budget',
      'timing',
      'chose_competitor',
      'handling_in_house',
      'not_a_fit',
      'key_contact_left',
      'business_closed',
      'duplicate',
      'other',
    ]

    // Validate reason is required and valid
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid archive reason. Must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Notes required when reason is 'other'
    if (reason === 'other' && (!notes || !notes.trim())) {
      return NextResponse.json(
        { error: 'Notes are required when archive reason is "other"' },
        { status: 400 }
      )
    }

    // Fetch recommendation to validate
    const recResult = await dbPool.query(
      `SELECT id, status, archived_at, confidence_score FROM recommendations WHERE id = $1`,
      [id]
    )

    if (recResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    const recommendation = recResult.rows[0]

    // Cannot archive already archived deals
    if (recommendation.archived_at) {
      return NextResponse.json(
        { error: 'Deal is already archived' },
        { status: 400 }
      )
    }

    // Cannot archive terminal status deals
    if (['accepted', 'closed_lost'].includes(recommendation.status)) {
      return NextResponse.json(
        { error: `Cannot archive a deal with status '${recommendation.status}'. It's already in a terminal state.` },
        { status: 400 }
      )
    }

    // Archive the recommendation
    await dbPool.query(
      `UPDATE recommendations
       SET archived_at = NOW(),
           archived_by = $1,
           archive_reason = $2,
           archive_notes = $3
       WHERE id = $4`,
      [user.id, reason, notes?.trim() || null, id]
    )

    // Insert into archive history
    await dbPool.query(
      `INSERT INTO pipeline_archive_history
       (recommendation_id, action, reason, notes, confidence_score_at_action, performed_by)
       VALUES ($1, 'archived', $2, $3, $4, $5)`,
      [id, reason, notes?.trim() || null, recommendation.confidence_score, user.id]
    )

    // Trigger score recalculation (for audit trail)
    await triggerRecalculation(id, 'deal_archived')

    // Fetch and return updated recommendation
    const updatedResult = await dbPool.query(
      `SELECT id, archived_at, archived_by, archive_reason, confidence_score
       FROM recommendations WHERE id = $1`,
      [id]
    )

    return NextResponse.json({
      success: true,
      recommendation: updatedResult.rows[0],
    })
  } catch (error) {
    console.error('Failed to archive deal:', error)
    return NextResponse.json(
      { error: 'Failed to archive deal' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/recommendations/[id]/archive
// Revive/unarchive a deal
export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const resetMetrics = searchParams.get('reset_metrics') !== 'false' // Default true

    // Fetch recommendation to validate
    const recResult = await dbPool.query(
      `SELECT id, status, archived_at, confidence_score FROM recommendations WHERE id = $1`,
      [id]
    )

    if (recResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    const recommendation = recResult.rows[0]

    // Cannot revive non-archived deals
    if (!recommendation.archived_at) {
      return NextResponse.json(
        { error: 'Deal is not archived' },
        { status: 400 }
      )
    }

    // Revive the recommendation
    if (resetMetrics) {
      // Full reset: clear snooze, set revived_at, clear scoring fields
      await dbPool.query(
        `UPDATE recommendations
         SET archived_at = NULL,
             archived_by = NULL,
             archive_reason = NULL,
             archive_notes = NULL,
             revived_at = NOW(),
             revived_by = $1,
             snoozed_until = NULL,
             snoozed_at = NULL,
             snooze_reason = NULL,
             confidence_score = NULL,
             confidence_percent = NULL,
             weighted_monthly = NULL,
             weighted_onetime = NULL,
             base_score = NULL,
             total_penalties = NULL,
             total_bonus = NULL,
             penalty_email_not_opened = NULL,
             penalty_proposal_not_viewed = NULL,
             penalty_silence = NULL,
             last_scored_at = NULL
         WHERE id = $2`,
        [user.id, id]
      )
    } else {
      // Simple unarchive without resetting metrics
      await dbPool.query(
        `UPDATE recommendations
         SET archived_at = NULL,
             archived_by = NULL,
             archive_reason = NULL,
             archive_notes = NULL,
             revived_at = NOW(),
             revived_by = $1
         WHERE id = $2`,
        [user.id, id]
      )
    }

    // Insert into archive history (reason is NULL for revive, notes capture context)
    await dbPool.query(
      `INSERT INTO pipeline_archive_history
       (recommendation_id, action, reason, notes, confidence_score_at_action, performed_by)
       VALUES ($1, 'revived', NULL, $2, $3, $4)`,
      [id, resetMetrics ? 'Metrics reset for fresh scoring' : 'Revived without metric reset', recommendation.confidence_score, user.id]
    )

    // Trigger score recalculation with retry logic
    // This happens AFTER all database writes are committed
    console.log(`[Deal Revival] Triggering recalculation for revived deal ${id}`)
    let recalcResult = null
    let recalcError = null

    try {
      recalcResult = await recalculateScore(id, 'deal_revived')
      if (recalcResult) {
        console.log(`[Deal Revival] Recalculation complete for revived deal ${id}: score=${recalcResult.confidence_score}`)
      } else {
        console.log(`[Deal Revival] Recalculation returned null for deal ${id} (may have been skipped)`)
      }
    } catch (err) {
      recalcError = err
      console.error(`[Deal Revival] First recalculation attempt failed for deal ${id}:`, err)

      // Retry once after a short delay
      console.log(`[Deal Revival] Retrying recalculation for deal ${id}...`)
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        recalcResult = await recalculateScore(id, 'deal_revived')
        if (recalcResult) {
          console.log(`[Deal Revival] Retry successful for deal ${id}: score=${recalcResult.confidence_score}`)
          recalcError = null
        }
      } catch (retryErr) {
        console.error(`[Deal Revival] Retry also failed for deal ${id}:`, retryErr)
      }
    }

    // Fetch and return updated recommendation
    // Revival is successful even if recalculation failed - it can be recalculated later
    const updatedResult = await dbPool.query(
      `SELECT id, archived_at, revived_at, confidence_score
       FROM recommendations WHERE id = $1`,
      [id]
    )

    return NextResponse.json({
      success: true,
      recommendation: updatedResult.rows[0],
      recalculation_error: recalcError ? 'Recalculation failed, will be retried on next cron' : null,
    })
  } catch (error) {
    console.error('Failed to revive deal:', error)
    return NextResponse.json(
      { error: 'Failed to revive deal' },
      { status: 500 }
    )
  }
}
