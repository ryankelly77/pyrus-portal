// ============================================================
// Pipeline Revenue Summary
// ============================================================
//
// Aggregates pipeline deals into revenue projection buckets
// for the Revenue / MRR page.
// ============================================================

import { dbPool } from '@/lib/prisma';

/**
 * Bucket stats for a group of deals
 */
interface BucketStats {
  weighted_mrr: number;
  raw_mrr: number;
  deal_count: number;
  avg_confidence: number;
}

/**
 * On Hold bucket (snoozed deals) - no avg_confidence since they're paused
 */
interface OnHoldStats {
  weighted_mrr: number;
  raw_mrr: number;
  deal_count: number;
}

/**
 * Pipeline Revenue Summary
 */
export interface PipelineRevenueSummary {
  /** Current MRR from active subscriptions (from Stripe) */
  current_mrr: number;
  /** Active clients count */
  active_client_count: number;
  /** High confidence deals that are mature (>= 70% AND >= 14 days) */
  closing_soon: BucketStats;
  /** Medium+ confidence deals still working (>= 30%, not closing_soon) */
  in_pipeline: BucketStats;
  /** Low confidence deals needing attention (< 30%) */
  at_risk: BucketStats;
  /** Snoozed deals with resume date */
  on_hold: OnHoldStats;
  /** Projected MRR = current + closing_soon.weighted + in_pipeline.weighted */
  projected_mrr: number;
  /** Potential growth = projected - current */
  potential_growth: number;
  /** Most recent last_scored_at timestamp */
  last_updated: string | null;
  /** Closing soon deals for mini table */
  closing_soon_deals: ClosingSoonDeal[];
}

/**
 * Deal info for the closing soon mini table
 */
export interface ClosingSoonDeal {
  id: string;
  client_name: string;
  client_id: string;
  rep_full_name: string | null;
  predicted_monthly: number;
  confidence_score: number;
  weighted_monthly: number;
  age_days: number;
}

/**
 * Fetch pipeline revenue summary with bucketed deals
 */
export async function getPipelineRevenueSummary(currentMRR: number, activeClientCount: number): Promise<PipelineRevenueSummary> {
  // Query all active (non-archived) sent recommendations
  const query = `
    SELECT
      r.id,
      r.confidence_score,
      COALESCE(r.predicted_monthly, 0) as predicted_monthly,
      COALESCE(r.weighted_monthly, 0) as weighted_monthly,
      r.snoozed_until,
      r.sent_at,
      r.revived_at,
      r.last_scored_at,
      c.name as client_name,
      c.id as client_id,
      pr.full_name as rep_full_name,
      CASE
        WHEN r.revived_at IS NOT NULL THEN EXTRACT(DAY FROM now() - r.revived_at)::integer
        WHEN r.sent_at IS NOT NULL THEN EXTRACT(DAY FROM now() - r.sent_at)::integer
        ELSE 0
      END as age_days
    FROM recommendations r
    JOIN clients c ON c.id = r.client_id
    LEFT JOIN pipeline_reps pr ON pr.id = r.created_by
    WHERE r.status = 'sent'
      AND r.archived_at IS NULL
    ORDER BY r.confidence_score DESC NULLS LAST
  `;

  const result = await dbPool.query(query);
  const now = new Date();

  // Initialize bucket accumulators
  const closingSoon: BucketStats = { weighted_mrr: 0, raw_mrr: 0, deal_count: 0, avg_confidence: 0 };
  const inPipeline: BucketStats = { weighted_mrr: 0, raw_mrr: 0, deal_count: 0, avg_confidence: 0 };
  const atRisk: BucketStats = { weighted_mrr: 0, raw_mrr: 0, deal_count: 0, avg_confidence: 0 };
  const onHold: OnHoldStats = { weighted_mrr: 0, raw_mrr: 0, deal_count: 0 };

  let closingSoonConfidenceSum = 0;
  let inPipelineConfidenceSum = 0;
  let atRiskConfidenceSum = 0;
  let lastUpdated: string | null = null;
  const closingSoonDeals: ClosingSoonDeal[] = [];

  for (const row of result.rows) {
    const confidenceScore = row.confidence_score !== null ? parseInt(row.confidence_score) : 0;
    const predictedMonthly = parseFloat(row.predicted_monthly) || 0;
    const weightedMonthly = parseFloat(row.weighted_monthly) || 0;
    const snoozedUntil = row.snoozed_until ? new Date(row.snoozed_until) : null;
    const ageDays = parseInt(row.age_days) || 0;

    // Track most recent last_scored_at
    if (row.last_scored_at) {
      const scoredAt = new Date(row.last_scored_at).toISOString();
      if (!lastUpdated || scoredAt > lastUpdated) {
        lastUpdated = scoredAt;
      }
    }

    // Bucket the deal
    if (snoozedUntil && snoozedUntil > now) {
      // On Hold: snoozed with future resume date
      onHold.weighted_mrr += weightedMonthly;
      onHold.raw_mrr += predictedMonthly;
      onHold.deal_count++;
    } else if (confidenceScore >= 70 && ageDays >= 14) {
      // Closing Soon: high confidence AND mature
      closingSoon.weighted_mrr += weightedMonthly;
      closingSoon.raw_mrr += predictedMonthly;
      closingSoon.deal_count++;
      closingSoonConfidenceSum += confidenceScore;

      // Add to mini table (limited to top deals)
      if (closingSoonDeals.length < 10) {
        closingSoonDeals.push({
          id: row.id,
          client_name: row.client_name,
          client_id: row.client_id,
          rep_full_name: row.rep_full_name,
          predicted_monthly: predictedMonthly,
          confidence_score: confidenceScore,
          weighted_monthly: weightedMonthly,
          age_days: ageDays,
        });
      }
    } else if (confidenceScore >= 30) {
      // In Pipeline: medium+ confidence, not closing soon
      inPipeline.weighted_mrr += weightedMonthly;
      inPipeline.raw_mrr += predictedMonthly;
      inPipeline.deal_count++;
      inPipelineConfidenceSum += confidenceScore;
    } else {
      // At Risk: low confidence (< 30%)
      atRisk.weighted_mrr += weightedMonthly;
      atRisk.raw_mrr += predictedMonthly;
      atRisk.deal_count++;
      atRiskConfidenceSum += confidenceScore;
    }
  }

  // Calculate average confidences
  closingSoon.avg_confidence = closingSoon.deal_count > 0
    ? Math.round(closingSoonConfidenceSum / closingSoon.deal_count)
    : 0;
  inPipeline.avg_confidence = inPipeline.deal_count > 0
    ? Math.round(inPipelineConfidenceSum / inPipeline.deal_count)
    : 0;
  atRisk.avg_confidence = atRisk.deal_count > 0
    ? Math.round(atRiskConfidenceSum / atRisk.deal_count)
    : 0;

  // Round MRR values
  closingSoon.weighted_mrr = Math.round(closingSoon.weighted_mrr);
  closingSoon.raw_mrr = Math.round(closingSoon.raw_mrr);
  inPipeline.weighted_mrr = Math.round(inPipeline.weighted_mrr);
  inPipeline.raw_mrr = Math.round(inPipeline.raw_mrr);
  atRisk.weighted_mrr = Math.round(atRisk.weighted_mrr);
  atRisk.raw_mrr = Math.round(atRisk.raw_mrr);
  onHold.weighted_mrr = Math.round(onHold.weighted_mrr);
  onHold.raw_mrr = Math.round(onHold.raw_mrr);

  // Calculate projections
  // At Risk and On Hold do NOT count toward projection - keeps number conservative
  const projectedMRR = currentMRR + closingSoon.weighted_mrr + inPipeline.weighted_mrr;
  const potentialGrowth = projectedMRR - currentMRR;

  return {
    current_mrr: currentMRR,
    active_client_count: activeClientCount,
    closing_soon: closingSoon,
    in_pipeline: inPipeline,
    at_risk: atRisk,
    on_hold: onHold,
    projected_mrr: Math.round(projectedMRR),
    potential_growth: Math.round(potentialGrowth),
    last_updated: lastUpdated,
    closing_soon_deals: closingSoonDeals,
  };
}
