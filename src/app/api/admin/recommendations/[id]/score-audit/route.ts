// ============================================================
// Score Audit API
// ============================================================
//
// Returns the full scoring audit trail for a recommendation,
// including breakdowns and computed deltas between events.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface ScoreBreakdown {
  confidence_score: number
  confidence_percent: number
  weighted_monthly: number
  weighted_onetime: number
  base_score: number
  total_penalties: number
  total_bonus: number
  penalty_breakdown: {
    email_not_opened: number
    proposal_not_viewed: number
    silence: number
    multi_invite_bonus: number
  }
}

interface DeltaChange {
  field: string
  from: number
  to: number
  delta: number
}

interface EventDelta {
  score_delta: number
  weighted_mrr_delta: number
  changes: DeltaChange[]
}

interface AuditEvent {
  id: string
  scored_at: string
  trigger_source: string
  confidence_score: number
  confidence_percent: number
  weighted_monthly: number
  breakdown: ScoreBreakdown | null
  deltas?: EventDelta
}

// Compute deltas between two breakdowns
function computeDeltas(
  prev: ScoreBreakdown | null,
  curr: ScoreBreakdown | null,
  prevWeightedMrr: number,
  currWeightedMrr: number,
  prevScore: number,
  currScore: number
): EventDelta | undefined {
  if (!prev || !curr) {
    // Can't compute deltas without breakdowns
    return {
      score_delta: currScore - prevScore,
      weighted_mrr_delta: Math.round((currWeightedMrr - prevWeightedMrr) * 100) / 100,
      changes: [],
    }
  }

  const changes: DeltaChange[] = []

  // Compare base score
  if (prev.base_score !== curr.base_score) {
    changes.push({
      field: 'base_score',
      from: prev.base_score,
      to: curr.base_score,
      delta: curr.base_score - prev.base_score,
    })
  }

  // Compare penalties
  if (prev.penalty_breakdown.email_not_opened !== curr.penalty_breakdown.email_not_opened) {
    changes.push({
      field: 'penalty_email_not_opened',
      from: prev.penalty_breakdown.email_not_opened,
      to: curr.penalty_breakdown.email_not_opened,
      delta: curr.penalty_breakdown.email_not_opened - prev.penalty_breakdown.email_not_opened,
    })
  }

  if (prev.penalty_breakdown.proposal_not_viewed !== curr.penalty_breakdown.proposal_not_viewed) {
    changes.push({
      field: 'penalty_proposal_not_viewed',
      from: prev.penalty_breakdown.proposal_not_viewed,
      to: curr.penalty_breakdown.proposal_not_viewed,
      delta: curr.penalty_breakdown.proposal_not_viewed - prev.penalty_breakdown.proposal_not_viewed,
    })
  }

  if (prev.penalty_breakdown.silence !== curr.penalty_breakdown.silence) {
    changes.push({
      field: 'penalty_silence',
      from: prev.penalty_breakdown.silence,
      to: curr.penalty_breakdown.silence,
      delta: curr.penalty_breakdown.silence - prev.penalty_breakdown.silence,
    })
  }

  // Compare bonuses
  if (prev.penalty_breakdown.multi_invite_bonus !== curr.penalty_breakdown.multi_invite_bonus) {
    changes.push({
      field: 'multi_invite_bonus',
      from: prev.penalty_breakdown.multi_invite_bonus,
      to: curr.penalty_breakdown.multi_invite_bonus,
      delta: curr.penalty_breakdown.multi_invite_bonus - prev.penalty_breakdown.multi_invite_bonus,
    })
  }

  if (prev.total_bonus !== curr.total_bonus) {
    changes.push({
      field: 'total_bonus',
      from: prev.total_bonus,
      to: curr.total_bonus,
      delta: curr.total_bonus - prev.total_bonus,
    })
  }

  return {
    score_delta: currScore - prevScore,
    weighted_mrr_delta: Math.round((currWeightedMrr - prevWeightedMrr) * 100) / 100,
    changes,
  }
}

// GET /api/admin/recommendations/[id]/score-audit
// Returns full audit trail with breakdowns and deltas
export async function GET(
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

    const result = await dbPool.query(
      `SELECT
        id,
        confidence_score,
        confidence_percent,
        weighted_monthly,
        weighted_onetime,
        trigger_source,
        breakdown,
        scored_at
       FROM pipeline_score_history
       WHERE recommendation_id = $1
       ORDER BY scored_at ASC`,
      [id]
    )

    // Build events with deltas
    const events: AuditEvent[] = []
    let prevEvent: AuditEvent | null = null

    for (const row of result.rows) {
      const breakdown = row.breakdown as ScoreBreakdown | null

      const event: AuditEvent = {
        id: row.id,
        scored_at: row.scored_at,
        trigger_source: row.trigger_source,
        confidence_score: row.confidence_score,
        confidence_percent: parseFloat(row.confidence_percent),
        weighted_monthly: parseFloat(row.weighted_monthly),
        breakdown,
      }

      // Compute deltas from previous event
      if (prevEvent) {
        event.deltas = computeDeltas(
          prevEvent.breakdown,
          breakdown,
          prevEvent.weighted_monthly,
          event.weighted_monthly,
          prevEvent.confidence_score,
          event.confidence_score
        )
      }

      events.push(event)
      prevEvent = event
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Failed to fetch score audit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch score audit' },
      { status: 500 }
    )
  }
}
