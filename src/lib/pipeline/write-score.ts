// ============================================================
// Pipeline Scoring: Score Writer
// ============================================================
//
// Writes computed score results back to the recommendations table.
// Uses raw SQL for compatibility with new columns.
// ============================================================

import { dbPool } from '@/lib/prisma';
import type { ScoringResult } from './types';

/**
 * Writes the scoring result back to the recommendations table.
 * Includes the detailed breakdown for display in the pipeline UI.
 * Also records the score in the history table for trend tracking.
 *
 * @param triggerSource - What caused this recalculation (e.g., 'invite_sent', 'call_score_updated')
 */
export async function writeScore(
  recommendationId: string,
  result: ScoringResult,
  triggerSource: string = 'unknown'
): Promise<void> {
  const { rowCount } = await dbPool.query(
    `UPDATE recommendations
     SET confidence_score = $1,
         confidence_percent = $2,
         weighted_monthly = $3,
         weighted_onetime = $4,
         base_score = $5,
         total_penalties = $6,
         total_bonus = $7,
         penalty_email_not_opened = $8,
         penalty_proposal_not_viewed = $9,
         penalty_silence = $10,
         last_scored_at = NOW()
     WHERE id = $11`,
    [
      result.confidence_score,
      result.confidence_percent,
      result.weighted_monthly,
      result.weighted_onetime,
      result.base_score,
      result.total_penalties,
      result.total_bonus,
      result.penalty_breakdown.email_not_opened,
      result.penalty_breakdown.proposal_not_viewed,
      result.penalty_breakdown.silence,
      recommendationId,
    ]
  );

  if (rowCount === 0) {
    throw new Error(`Failed to write score: recommendation ${recommendationId} not found`);
  }

  // Insert history record for trend tracking and audit
  await dbPool.query(
    `INSERT INTO pipeline_score_history (
       recommendation_id,
       confidence_score,
       confidence_percent,
       weighted_monthly,
       weighted_onetime,
       trigger_source,
       breakdown,
       scored_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      recommendationId,
      result.confidence_score,
      result.confidence_percent,
      result.weighted_monthly,
      result.weighted_onetime,
      triggerSource,
      JSON.stringify(result), // Store full breakdown for audit
    ]
  );

  console.log(
    `[Pipeline Scoring] Wrote score for ${recommendationId}: ` +
    `confidence=${result.confidence_score}, ` +
    `weighted_monthly=${result.weighted_monthly}, ` +
    `trigger=${triggerSource}`
  );
}
