// ============================================================
// Pipeline Scoring: Batch Recalculation
// ============================================================
//
// For scheduled jobs (daily cron) to:
//   1. Process queued score events from database triggers
//   2. Recalculate stale scores (not updated in 23+ hours)
//   3. Apply time-based decay penalties to all active deals
//
// Scoring penalties that require daily recalculation:
//   - Email not opened: 2.5 pts/day after 24hr grace (max 35)
//   - Proposal not viewed: 2 pts/day after 48hr grace (max 25)
//   - Silence: 3 pts/day after 5-day grace (max 80)
//
// Run this via: npx tsx src/lib/pipeline/batch-recalculate.ts
// Or call from a Vercel/Supabase cron job.
// ============================================================

import { dbPool } from '@/lib/prisma';
import { recalculateScore } from './recalculate-score';
import type { ScoringResult } from './types';

/** Batch size for processing recommendations */
const BATCH_SIZE = 25;

/** Delay between batches in milliseconds */
const BATCH_DELAY_MS = 200;

/** Alert threshold: if error rate exceeds this, trigger an alert */
const ERROR_RATE_ALERT_THRESHOLD = 0.5; // 50%

export interface BatchRecalculateResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  errors: Array<{ recommendation_id: string; error: string }>;
}

/**
 * Process queued score events from database triggers.
 * Called before the main recalculation to handle any pending events.
 */
export async function processScoreEventQueue(): Promise<BatchRecalculateResult> {
  const startTime = Date.now();
  const errors: Array<{ recommendation_id: string; error: string }> = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Get distinct recommendation IDs from unprocessed events
  const result = await dbPool.query(
    `SELECT DISTINCT recommendation_id
     FROM pipeline_score_events
     WHERE processed_at IS NULL`
  );

  const recommendationIds = result.rows.map((r: any) => r.recommendation_id);

  if (recommendationIds.length === 0) {
    console.log('[Batch Recalculate] No queued events to process');
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duration_ms: Date.now() - startTime,
      errors: [],
    };
  }

  console.log(`[Batch Recalculate] Processing ${recommendationIds.length} recommendations from event queue`);

  // Process in batches
  for (let i = 0; i < recommendationIds.length; i += BATCH_SIZE) {
    const batch = recommendationIds.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (id: string) => {
        try {
          // Events from queue use 'tracking_event' as we don't know the specific trigger
          const result = await recalculateScore(id, 'tracking_event');
          if (result === null) {
            skipped++;
          } else {
            succeeded++;
          }
          return { id, success: true };
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ recommendation_id: id, error: errorMsg });
          console.error(`[Batch Recalculate] Failed to process ${id}:`, errorMsg);
          return { id, success: false, error: errorMsg };
        }
      })
    );

    // Delay between batches
    if (i + BATCH_SIZE < recommendationIds.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Mark events as processed
  await dbPool.query(
    `UPDATE pipeline_score_events
     SET processed_at = NOW()
     WHERE processed_at IS NULL`
  );

  const duration_ms = Date.now() - startTime;
  console.log(`[Batch Recalculate] Event queue processed in ${duration_ms}ms: ${succeeded} succeeded, ${skipped} skipped, ${failed} failed`);

  return {
    processed: recommendationIds.length,
    succeeded,
    failed,
    skipped,
    duration_ms,
    errors,
  };
}

/**
 * Recalculate scores for all stale recommendations.
 * A recommendation is "stale" if:
 *   - status is 'sent' or 'declined' (active pipeline)
 *   - AND (last_scored_at IS NULL OR last_scored_at < now() - 23 hours)
 *
 * The 23-hour window ensures we don't skip recommendations due to timing drift.
 */
export async function batchRecalculateStaleScores(): Promise<BatchRecalculateResult> {
  const startTime = Date.now();
  const errors: Array<{ recommendation_id: string; error: string }> = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Get all stale active pipeline deals (exclude archived)
  const result = await dbPool.query(
    `SELECT id FROM recommendations
     WHERE status IN ('sent', 'declined')
       AND archived_at IS NULL
       AND (last_scored_at IS NULL OR last_scored_at < NOW() - INTERVAL '23 hours')
     ORDER BY last_scored_at ASC NULLS FIRST`
  );

  const recommendationIds = result.rows.map((d: any) => d.id);

  if (recommendationIds.length === 0) {
    console.log('[Batch Recalculate] No stale scores to recalculate');
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duration_ms: Date.now() - startTime,
      errors: [],
    };
  }

  console.log(`[Batch Recalculate] Recalculating ${recommendationIds.length} stale scores`);

  // Process in batches
  for (let i = 0; i < recommendationIds.length; i += BATCH_SIZE) {
    const batch = recommendationIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(recommendationIds.length / BATCH_SIZE);

    console.log(`[Batch Recalculate] Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`);

    const batchResults = await Promise.all(
      batch.map(async (id: string) => {
        try {
          const result = await recalculateScore(id, 'daily_cron');
          if (result === null) {
            skipped++;
          } else {
            succeeded++;
          }
          return { id, success: true };
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ recommendation_id: id, error: errorMsg });
          console.error(`[Batch Recalculate] Failed to recalculate ${id}:`, errorMsg);
          return { id, success: false, error: errorMsg };
        }
      })
    );

    // Delay between batches
    if (i + BATCH_SIZE < recommendationIds.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const duration_ms = Date.now() - startTime;
  const processed = recommendationIds.length;

  // Check error rate and alert if too high
  const errorRate = processed > 0 ? failed / processed : 0;
  if (errorRate > ERROR_RATE_ALERT_THRESHOLD) {
    console.error('[ALERT] Batch Recalculate: High error rate detected', {
      alert_type: 'pipeline_scoring_high_error_rate',
      severity: 'warning',
      error_rate: errorRate,
      total_processed: processed,
      total_failed: failed,
      errors: errors.slice(0, 10), // First 10 errors
    });
  }

  console.log(
    `[Batch Recalculate] Stale scores recalculated in ${duration_ms}ms: ` +
    `${succeeded} succeeded, ${skipped} skipped, ${failed} failed`
  );

  return {
    processed,
    succeeded,
    failed,
    skipped,
    duration_ms,
    errors,
  };
}

/**
 * Recalculate all active deals regardless of last_scored_at.
 * Use this for full recalculation after config changes.
 *
 * @param triggerSource - What triggered this recalculation (defaults to 'manual_refresh')
 */
export async function recalculateAllActiveDeals(
  triggerSource: string = 'manual_refresh'
): Promise<BatchRecalculateResult> {
  const startTime = Date.now();
  const errors: Array<{ recommendation_id: string; error: string }> = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Get all active pipeline deals (exclude archived)
  const result = await dbPool.query(
    `SELECT id FROM recommendations WHERE status IN ('sent', 'declined') AND archived_at IS NULL`
  );

  const recommendationIds = result.rows.map((d: any) => d.id);

  if (recommendationIds.length === 0) {
    console.log('[Batch Recalculate] No active deals to recalculate');
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duration_ms: Date.now() - startTime,
      errors: [],
    };
  }

  console.log(`[Batch Recalculate] Recalculating ALL ${recommendationIds.length} active deals`);

  // Process in batches
  for (let i = 0; i < recommendationIds.length; i += BATCH_SIZE) {
    const batch = recommendationIds.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (id: string) => {
        try {
          const result = await recalculateScore(id, triggerSource);
          if (result === null) {
            skipped++;
          } else {
            succeeded++;
          }
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ recommendation_id: id, error: errorMsg });
          console.error(`[Batch Recalculate] Failed to recalculate ${id}:`, errorMsg);
        }
      })
    );

    // Delay between batches
    if (i + BATCH_SIZE < recommendationIds.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const duration_ms = Date.now() - startTime;

  console.log(
    `[Batch Recalculate] All active deals recalculated in ${duration_ms}ms: ` +
    `${succeeded} succeeded, ${skipped} skipped, ${failed} failed`
  );

  return {
    processed: recommendationIds.length,
    succeeded,
    failed,
    skipped,
    duration_ms,
    errors,
  };
}

/**
 * Log a scoring run to the pipeline_scoring_runs table for audit history.
 */
async function logScoringRun(
  runType: 'daily_cron' | 'event_queue' | 'manual',
  result: BatchRecalculateResult
): Promise<void> {
  try {
    await dbPool.query(
      `INSERT INTO pipeline_scoring_runs
        (run_type, processed, succeeded, failed, skipped, duration_ms, errors, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        runType,
        result.processed,
        result.succeeded,
        result.failed,
        result.skipped,
        result.duration_ms,
        JSON.stringify(result.errors.slice(0, 50)), // Limit stored errors
      ]
    );
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('[Batch Recalculate] Failed to log scoring run:', error);
  }
}

/**
 * Full daily batch process:
 *   1. Process any queued events from database triggers
 *   2. Recalculate all stale scores (not updated in 23+ hours)
 *
 * This is the main function called by the cron job.
 */
export async function runDailyBatchRecalculation(): Promise<{
  queueResults: BatchRecalculateResult;
  staleResults: BatchRecalculateResult;
  total_duration_ms: number;
}> {
  const startTime = Date.now();
  console.log('[Batch Recalculate] Starting daily batch recalculation...');
  console.log('[Batch Recalculate] Timestamp:', new Date().toISOString());

  // 1. Process any queued events first
  const queueResults = await processScoreEventQueue();
  await logScoringRun('event_queue', queueResults);

  // 2. Recalculate all stale scores
  const staleResults = await batchRecalculateStaleScores();
  await logScoringRun('daily_cron', staleResults);

  const total_duration_ms = Date.now() - startTime;

  console.log('[Batch Recalculate] Daily batch complete', {
    total_duration_ms,
    queue: {
      processed: queueResults.processed,
      succeeded: queueResults.succeeded,
      failed: queueResults.failed,
    },
    stale: {
      processed: staleResults.processed,
      succeeded: staleResults.succeeded,
      failed: staleResults.failed,
    },
  });

  return { queueResults, staleResults, total_duration_ms };
}

// Allow running directly with `npx tsx src/lib/pipeline/batch-recalculate.ts`
if (require.main === module) {
  runDailyBatchRecalculation()
    .then(results => {
      console.log('Batch recalculation completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Batch recalculation failed:', error);
      process.exit(1);
    });
}
