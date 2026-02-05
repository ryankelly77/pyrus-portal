// ============================================================
// Predicted Tier API - Set the rep's expected closing tier
// ============================================================
//
// When a rep expects a deal to close at a specific tier,
// this endpoint captures that prediction and snapshots the
// pricing for consistent pipeline calculations.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

type TierName = 'good' | 'better' | 'best'
const VALID_TIERS: TierName[] = ['good', 'better', 'best']

interface TierPricing {
  monthly: number
  onetime: number
}

// GET /api/admin/recommendations/[id]/predicted-tier
// Returns the predicted tier and tier pricing options
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Get the recommendation with current prediction
    const recResult = await dbPool.query(
      `SELECT
        id,
        predicted_tier,
        predicted_monthly,
        predicted_onetime
       FROM recommendations
       WHERE id = $1`,
      [id]
    )

    if (recResult.rows.length === 0) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    const rec = recResult.rows[0]

    // Get tier pricing from recommendation_items
    // This calculates the total for each tier column
    const itemsResult = await dbPool.query(
      `SELECT
        tier,
        SUM(
          CASE
            WHEN pricing_type = 'monthly' THEN COALESCE(monthly_price, 0) * COALESCE(quantity, 1)
            ELSE 0
          END
        ) as total_monthly,
        SUM(
          CASE
            WHEN pricing_type = 'onetime' THEN COALESCE(onetime_price, 0) * COALESCE(quantity, 1)
            ELSE 0
          END
        ) as total_onetime
       FROM recommendation_items
       WHERE recommendation_id = $1
       GROUP BY tier`,
      [id]
    )

    const tierPricing: Record<TierName, TierPricing> = {
      good: { monthly: 0, onetime: 0 },
      better: { monthly: 0, onetime: 0 },
      best: { monthly: 0, onetime: 0 },
    }

    for (const row of itemsResult.rows) {
      if (VALID_TIERS.includes(row.tier)) {
        tierPricing[row.tier as TierName] = {
          monthly: parseFloat(row.total_monthly) || 0,
          onetime: parseFloat(row.total_onetime) || 0,
        }
      }
    }

    return NextResponse.json({
      predictedTier: rec.predicted_tier,
      predictedMonthly: parseFloat(rec.predicted_monthly) || 0,
      predictedOnetime: parseFloat(rec.predicted_onetime) || 0,
      tierPricing,
    })
  } catch (error) {
    console.error('Failed to fetch predicted tier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch predicted tier' },
      { status: 500 }
    )
  }
}

// POST /api/admin/recommendations/[id]/predicted-tier
// Sets the predicted tier and snapshots pricing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const { tier } = body as { tier: TierName }

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify recommendation exists
    const rec = await prisma.recommendations.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!rec) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    // Calculate tier pricing
    const itemsResult = await dbPool.query(
      `SELECT
        SUM(
          CASE
            WHEN pricing_type = 'monthly' THEN COALESCE(monthly_price, 0) * COALESCE(quantity, 1)
            ELSE 0
          END
        ) as total_monthly,
        SUM(
          CASE
            WHEN pricing_type = 'onetime' THEN COALESCE(onetime_price, 0) * COALESCE(quantity, 1)
            ELSE 0
          END
        ) as total_onetime
       FROM recommendation_items
       WHERE recommendation_id = $1 AND tier = $2`,
      [id, tier]
    )

    const pricing = itemsResult.rows[0] || { total_monthly: 0, total_onetime: 0 }
    const predictedMonthly = parseFloat(pricing.total_monthly) || 0
    const predictedOnetime = parseFloat(pricing.total_onetime) || 0

    // Update the recommendation
    await dbPool.query(
      `UPDATE recommendations
       SET predicted_tier = $1,
           predicted_monthly = $2,
           predicted_onetime = $3
       WHERE id = $4`,
      [tier, predictedMonthly, predictedOnetime, id]
    )

    // Trigger score recalculation
    triggerRecalculation(id, 'predicted_tier_updated').catch(console.error)

    return NextResponse.json({
      predictedTier: tier,
      predictedMonthly,
      predictedOnetime,
    })
  } catch (error) {
    console.error('Failed to set predicted tier:', error)
    return NextResponse.json(
      { error: 'Failed to set predicted tier' },
      { status: 500 }
    )
  }
}
