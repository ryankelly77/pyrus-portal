// ============================================================
// Call Scores API - Rep's post-call assessment inputs
// ============================================================
//
// Stores the rep's subjective scoring from the sales call.
// These four factors form the base score for pipeline confidence.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

// Valid values for each factor
const BUDGET_CLARITY = ['clear', 'vague', 'none', 'no_budget'] as const
const COMPETITION = ['none', 'some', 'many'] as const
const ENGAGEMENT = ['high', 'medium', 'low'] as const
const PLAN_FIT = ['strong', 'medium', 'weak', 'poor'] as const

// GET /api/admin/recommendations/[id]/call-scores
// Returns the call scores for a recommendation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Get call scores
    const result = await dbPool.query(
      `SELECT
        id,
        recommendation_id,
        budget_clarity,
        competition,
        engagement,
        plan_fit,
        created_by,
        created_at,
        updated_at
       FROM recommendation_call_scores
       WHERE recommendation_id = $1`,
      [id]
    )

    // Get snooze data from recommendations
    const snoozeResult = await dbPool.query(
      `SELECT snoozed_until, snooze_reason
       FROM recommendations
       WHERE id = $1`,
      [id]
    )

    const snoozeData = snoozeResult.rows[0] || {}

    const scores = result.rows[0]
    return NextResponse.json({
      callScores: scores ? {
        id: scores.id,
        recommendationId: scores.recommendation_id,
        budgetClarity: scores.budget_clarity,
        competition: scores.competition,
        engagement: scores.engagement,
        planFit: scores.plan_fit,
        createdBy: scores.created_by,
        createdAt: scores.created_at,
        updatedAt: scores.updated_at,
      } : null,
      snoozed_until: snoozeData.snoozed_until?.toISOString?.() || snoozeData.snoozed_until || null,
      snooze_reason: snoozeData.snooze_reason || null,
    })
  } catch (error) {
    console.error('Failed to fetch call scores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call scores' },
      { status: 500 }
    )
  }
}

// POST /api/admin/recommendations/[id]/call-scores
// Creates or updates call scores and predicted tier for a recommendation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { id } = await params
    const body = await request.json()
    const {
      budget_clarity,
      competition,
      engagement,
      plan_fit,
      predicted_tier,
    } = body

    // Validate predicted_tier (required)
    const PREDICTED_TIERS = ['good', 'better', 'best'] as const
    if (!predicted_tier || !PREDICTED_TIERS.includes(predicted_tier)) {
      return NextResponse.json(
        { error: `predicted_tier is required. Must be one of: ${PREDICTED_TIERS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate optional inputs
    if (budget_clarity && !BUDGET_CLARITY.includes(budget_clarity)) {
      return NextResponse.json(
        { error: `Invalid budget_clarity. Must be one of: ${BUDGET_CLARITY.join(', ')}` },
        { status: 400 }
      )
    }
    if (competition && !COMPETITION.includes(competition)) {
      return NextResponse.json(
        { error: `Invalid competition. Must be one of: ${COMPETITION.join(', ')}` },
        { status: 400 }
      )
    }
    if (engagement && !ENGAGEMENT.includes(engagement)) {
      return NextResponse.json(
        { error: `Invalid engagement. Must be one of: ${ENGAGEMENT.join(', ')}` },
        { status: 400 }
      )
    }
    if (plan_fit && !PLAN_FIT.includes(plan_fit)) {
      return NextResponse.json(
        { error: `Invalid plan_fit. Must be one of: ${PLAN_FIT.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify recommendation exists and get tier pricing
    const rec = await prisma.recommendations.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!rec) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    // Calculate predicted_monthly based on predicted tier
    const tierPricingResult = await dbPool.query(
      `SELECT COALESCE(SUM(COALESCE(monthly_price, 0)), 0) as monthly_total
       FROM recommendation_items
       WHERE recommendation_id = $1 AND tier = $2`,
      [id, predicted_tier]
    )
    const predictedMonthly = parseFloat(tierPricingResult.rows[0]?.monthly_total) || 0

    // Update recommendation with predicted_tier and predicted_monthly
    await dbPool.query(
      `UPDATE recommendations
       SET predicted_tier = $1, predicted_monthly = $2, updated_at = NOW()
       WHERE id = $3`,
      [predicted_tier, predictedMonthly, id]
    )

    // Only insert/update call scores if any are provided
    const hasCallScores = budget_clarity || competition || engagement || plan_fit
    let scores = null

    if (hasCallScores) {
      const result = await dbPool.query(
        `INSERT INTO recommendation_call_scores
          (recommendation_id, budget_clarity, competition, engagement, plan_fit, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (recommendation_id) DO UPDATE SET
          budget_clarity = COALESCE(EXCLUDED.budget_clarity, recommendation_call_scores.budget_clarity),
          competition = COALESCE(EXCLUDED.competition, recommendation_call_scores.competition),
          engagement = COALESCE(EXCLUDED.engagement, recommendation_call_scores.engagement),
          plan_fit = COALESCE(EXCLUDED.plan_fit, recommendation_call_scores.plan_fit),
          updated_at = NOW()
         RETURNING id, recommendation_id, budget_clarity, competition, engagement, plan_fit, created_at, updated_at`,
        [id, budget_clarity || null, competition || null, engagement || null, plan_fit || null, user.id]
      )
      scores = result.rows[0]
    }

    // Trigger score recalculation
    triggerRecalculation(id, 'call_score_updated').catch(console.error)

    return NextResponse.json({
      success: true,
      predictedTier: predicted_tier,
      predictedMonthly,
      callScores: scores ? {
        id: scores.id,
        recommendationId: scores.recommendation_id,
        budgetClarity: scores.budget_clarity,
        competition: scores.competition,
        engagement: scores.engagement,
        planFit: scores.plan_fit,
        createdAt: scores.created_at,
        updatedAt: scores.updated_at,
      } : null,
    })
  } catch (error) {
    console.error('Failed to save call scores:', error)
    return NextResponse.json(
      { error: 'Failed to save call scores' },
      { status: 500 }
    )
  }
}
