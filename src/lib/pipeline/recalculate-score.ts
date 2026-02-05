// ============================================================
// Pipeline Scoring: Recalculation Orchestrator
// ============================================================
//
// Main entry point for recalculating a recommendation's score.
// Ties together data assembly, scoring, and writing.
// ============================================================

import { assembleScoringInput } from './assemble-scoring-input';
import { computePipelineScore } from './scoring-engine';
import { writeScore } from './write-score';
import type { ScoringResult } from './types';

/**
 * Recalculates the pipeline score for a recommendation.
 *
 * This is the main function to call when any scoring-relevant data changes.
 * It handles errors gracefully - failures are logged but don't throw.
 *
 * @param recommendationId - The recommendation to recalculate
 * @param triggerSource - What triggered this recalculation (for history tracking)
 * @param options - Optional configuration
 * @returns The scoring result, or null if recalculation was skipped/failed
 */
export async function recalculateScore(
  recommendationId: string,
  triggerSource: string = 'unknown',
  options: {
    /** Skip recalculation for terminal statuses (accepted, closed_lost) */
    skipTerminal?: boolean;
  } = {}
): Promise<ScoringResult | null> {
  const { skipTerminal = true } = options;

  try {
    console.log(`[Pipeline Scoring] Recalculating score for ${recommendationId}`);

    // Assemble all input data from database
    const input = await assembleScoringInput(recommendationId);

    // Skip terminal statuses if requested (score is fixed)
    if (skipTerminal) {
      if (input.deal.status === 'accepted') {
        console.log(`[Pipeline Scoring] Skipping ${recommendationId} - status is accepted (score fixed at 100)`);
        return null;
      }
      if (input.deal.status === 'closed_lost') {
        console.log(`[Pipeline Scoring] Skipping ${recommendationId} - status is closed_lost (score fixed at 0)`);
        return null;
      }
    }

    // Compute the score
    const result = computePipelineScore(input);

    // Write back to database (includes history record)
    await writeScore(recommendationId, result, triggerSource);

    console.log(
      `[Pipeline Scoring] Completed for ${recommendationId}: ` +
      `score=${result.confidence_score}, ` +
      `base=${result.base_score}, ` +
      `penalties=${result.total_penalties}, ` +
      `bonus=${result.total_bonus}`
    );

    return result;
  } catch (error) {
    console.error(`[Pipeline Scoring] Failed for ${recommendationId}:`, error);
    // Return null instead of throwing - scoring failures shouldn't break primary operations
    return null;
  }
}

/**
 * Recalculates scores for multiple recommendations in parallel.
 *
 * @param recommendationIds - Array of recommendation IDs to recalculate
 * @param triggerSource - What triggered this recalculation (for history tracking)
 * @returns Array of results (null for any that failed/skipped)
 */
export async function recalculateScores(
  recommendationIds: string[],
  triggerSource: string = 'unknown'
): Promise<(ScoringResult | null)[]> {
  return Promise.all(
    recommendationIds.map(id => recalculateScore(id, triggerSource))
  );
}

/**
 * Helper to trigger recalculation after a database event.
 * Wraps recalculateScore with additional logging for event-driven calls.
 *
 * @param recommendationId - The recommendation to recalculate
 * @param triggerSource - What triggered this recalculation (for history tracking)
 */
export async function triggerRecalculation(
  recommendationId: string,
  triggerSource: string
): Promise<void> {
  console.log(`[Pipeline Scoring] Triggered by: ${triggerSource}`);
  await recalculateScore(recommendationId, triggerSource);
}
