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
import { runDailyBatchRecalculation, batchRecalculateStaleScores } from '@/lib/pipeline/batch-recalculate';

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

  // Verify authorization
  if (!verifyCronAuth(request)) {
    console.error('[Cron] Pipeline score recalculation: Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting pipeline score recalculation...');
    console.log('[Cron] Request time:', new Date().toISOString());

    const results = await runDailyBatchRecalculation();

    const response = {
      success: true,
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

    console.log('[Cron] Pipeline score recalculation completed:', response);

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Pipeline score recalculation failed:', error);

    return NextResponse.json(
      {
        success: false,
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
