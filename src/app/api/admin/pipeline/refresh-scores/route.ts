// ============================================================
// Admin API: Force Refresh Pipeline Scores
// ============================================================
//
// Manually trigger recalculation for ALL active deals,
// bypassing the stale check. Returns detailed results.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { recalculateAllActiveDeals } from '@/lib/pipeline/batch-recalculate';
import { dbPool } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const { profile } = auth;

    // Only admins and super_admins can trigger manual refresh
    if (!['admin', 'super_admin', 'sales'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('[Pipeline] Manual score refresh triggered by:', profile.email);

    // Get diagnostic info before recalculation
    const diagnostics: Record<string, unknown> = {};

    try {
      // Check how many active deals exist
      const activeDealsResult = await dbPool.query(
        `SELECT COUNT(*) as count FROM recommendations
         WHERE status IN ('sent', 'declined') AND archived_at IS NULL`
      );
      diagnostics.active_deals_count = parseInt(activeDealsResult.rows[0]?.count || '0');

      // Check if pipeline_score_history table exists and has records
      const historyCountResult = await dbPool.query(
        `SELECT COUNT(*) as count FROM pipeline_score_history`
      );
      diagnostics.history_records_count = parseInt(historyCountResult.rows[0]?.count || '0');

      // Get the most recent history entry
      const latestHistoryResult = await dbPool.query(
        `SELECT scored_at, trigger_source FROM pipeline_score_history
         ORDER BY scored_at DESC LIMIT 1`
      );
      diagnostics.latest_history_entry = latestHistoryResult.rows[0] || null;
    } catch (diagError) {
      console.error('[Pipeline] Diagnostics error:', diagError);
      diagnostics.error = diagError instanceof Error ? diagError.message : 'Unknown';
    }

    // Force recalculate ALL active deals (not just stale ones)
    const results = await recalculateAllActiveDeals('manual_refresh');

    console.log('[Pipeline] Manual refresh complete:', results);

    // Get updated history count after recalculation
    try {
      const newHistoryCountResult = await dbPool.query(
        `SELECT COUNT(*) as count FROM pipeline_score_history`
      );
      diagnostics.history_records_after = parseInt(newHistoryCountResult.rows[0]?.count || '0');
      diagnostics.new_history_records =
        (diagnostics.history_records_after as number) - (diagnostics.history_records_count as number);
    } catch {
      // Ignore
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated ${results.succeeded} deals`,
      details: {
        processed: results.processed,
        succeeded: results.succeeded,
        failed: results.failed,
        skipped: results.skipped,
        duration_ms: results.duration_ms,
        errors: results.errors.slice(0, 5), // First 5 errors for debugging
      },
      diagnostics,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pipeline] Manual refresh failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
