// ============================================================
// POST /api/pipeline/recalculate
// ============================================================
//
// Recalculates the pipeline confidence score for a recommendation.
// Called by:
//   - UI actions (manual refresh, after editing call scores)
//   - Webhooks (email tracking, HighLevel events)
//   - Cron jobs (daily bulk recalculation)
//
// Protected: requires admin, super_admin, production_team, or sales role.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { recalculateScore, recalculateScores } from '@/lib/pipeline/recalculate-score';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify caller has appropriate permissions
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    // Support both single and bulk recalculation
    if (body.recommendation_id) {
      // Single recommendation
      const result = await recalculateScore(body.recommendation_id);

      return NextResponse.json({
        success: true,
        recommendation_id: body.recommendation_id,
        result: result ? {
          confidence_score: result.confidence_score,
          confidence_percent: result.confidence_percent,
          weighted_monthly: result.weighted_monthly,
          weighted_onetime: result.weighted_onetime,
          base_score: result.base_score,
          total_penalties: result.total_penalties,
          total_bonus: result.total_bonus,
        } : null,
        skipped: result === null,
      });
    }

    if (body.recommendation_ids && Array.isArray(body.recommendation_ids)) {
      // Bulk recalculation
      const results = await recalculateScores(body.recommendation_ids);

      const summary = {
        total: body.recommendation_ids.length,
        processed: results.filter(r => r !== null).length,
        skipped: results.filter(r => r === null).length,
      };

      return NextResponse.json({
        success: true,
        summary,
      });
    }

    return NextResponse.json(
      { error: 'Either recommendation_id or recommendation_ids is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Pipeline Recalculate API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate score' },
      { status: 500 }
    );
  }
}
