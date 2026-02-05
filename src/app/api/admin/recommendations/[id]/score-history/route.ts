// ============================================================
// Score History API
// ============================================================
//
// Returns the pipeline score history for a recommendation.
// Used for charting score trends over time.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// GET /api/admin/recommendations/[id]/score-history
// Returns score history ordered chronologically for charting
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
        scored_at
       FROM pipeline_score_history
       WHERE recommendation_id = $1
       ORDER BY scored_at ASC`,
      [id]
    )

    const history = result.rows.map(row => ({
      id: row.id,
      confidence_score: row.confidence_score,
      confidence_percent: parseFloat(row.confidence_percent),
      weighted_monthly: parseFloat(row.weighted_monthly),
      weighted_onetime: parseFloat(row.weighted_onetime),
      trigger_source: row.trigger_source,
      scored_at: row.scored_at,
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Failed to fetch score history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch score history' },
      { status: 500 }
    )
  }
}
