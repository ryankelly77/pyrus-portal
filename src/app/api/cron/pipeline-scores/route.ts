// ============================================================
// Cron: Daily Pipeline Score Recalculation
// ============================================================
//
// Run daily at 6 AM UTC (midnight CST) to:
//   1. Process queued score events from database triggers
//   2. Recalculate stale scores (not updated in 23+ hours)
//
// This ensures time-based penalties are applied even when
// no events trigger a recalculation:
//   - Email not opened: 2.5 pts/day after 24hr grace (max 35)
//   - Proposal not viewed: 2 pts/day after 48hr grace (max 25)
//   - Silence: 3 pts/day after 5-day grace (max 80)
//
// Configure in vercel.json:
//   {
//     "crons": [{
//       "path": "/api/cron/pipeline-scores",
//       "schedule": "0 6 * * *"
//     }]
//   }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runDailyBatchRecalculation } from '@/lib/pipeline/batch-recalculate';
import { dbPool } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for batch processing

// Verify cron secret to prevent unauthorized access
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Vercel cron jobs include this header
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  // If it's a Vercel cron job, allow it
  if (isVercelCron) {
    return true;
  }

  // If no secret configured, only allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development';
  }

  // Check bearer token
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const cronId = `cron-${Date.now()}`;

  // Verify authorization
  if (!verifyCronAuth(request)) {
    console.error(`[Cron ${cronId}] Unauthorized request`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`[Cron ${cronId}] ========================================`);
    console.log(`[Cron ${cronId}] Pipeline score recalculation STARTING`);
    console.log(`[Cron ${cronId}] Time: ${new Date().toISOString()}`);

    // Pre-flight check: verify database connectivity and table existence
    try {
      const preflight = await dbPool.query(`
        SELECT
          (SELECT COUNT(*) FROM recommendations WHERE status IN ('sent', 'declined') AND archived_at IS NULL) as active_deals,
          (SELECT COUNT(*) FROM pipeline_score_history) as history_count,
          (SELECT MAX(scored_at) FROM pipeline_score_history) as latest_score
      `);
      const pf = preflight.rows[0];
      console.log(`[Cron ${cronId}] Pre-flight: ${pf.active_deals} active deals, ${pf.history_count} history records, latest: ${pf.latest_score}`);
    } catch (preflightError) {
      console.error(`[Cron ${cronId}] Pre-flight check failed:`, preflightError);
      // Continue anyway - the main function might still work
    }

    const results = await runDailyBatchRecalculation();

    // Post-flight check: verify new records were created
    try {
      const postflight = await dbPool.query(`
        SELECT COUNT(*) as new_records
        FROM pipeline_score_history
        WHERE scored_at > NOW() - INTERVAL '5 minutes'
      `);
      console.log(`[Cron ${cronId}] Post-flight: ${postflight.rows[0].new_records} records created in last 5 min`);
    } catch {
      // Ignore post-flight errors
    }

    const response = {
      success: true,
      cron_id: cronId,
      timestamp: new Date().toISOString(),
      duration_ms: results.total_duration_ms,
      queue: {
        processed: results.queueResults.processed,
        succeeded: results.queueResults.succeeded,
        failed: results.queueResults.failed,
        skipped: results.queueResults.skipped,
      },
      stale: {
        processed: results.staleResults.processed,
        succeeded: results.staleResults.succeeded,
        failed: results.staleResults.failed,
        skipped: results.staleResults.skipped,
      },
    };

    console.log(`[Cron ${cronId}] COMPLETED:`, JSON.stringify(response));
    console.log(`[Cron ${cronId}] ========================================`);

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[Cron ${cronId}] FAILED:`, errorMessage);
    console.error(`[Cron ${cronId}] Stack:`, errorStack);
    console.log(`[Cron ${cronId}] ========================================`);

    return NextResponse.json(
      {
        success: false,
        cron_id: cronId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
