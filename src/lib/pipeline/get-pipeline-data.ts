// ============================================================
// Pipeline Data Query
// ============================================================
//
// Server-side function to fetch pipeline deals with aggregates.
// Supports filtering by rep, tier, and date range.
// ============================================================

import { dbPool } from '@/lib/prisma';
import type {
  PipelineDeal,
  PipelineAggregates,
  PipelineFilters,
  PipelineRep,
  PipelineDataResponse,
  ArchiveAnalytics,
  ReasonBreakdown,
  ArchiveReason,
} from './pipeline-view-types';

/**
 * Fetch all pipeline reps from the pipeline_reps view
 */
export async function getPipelineReps(): Promise<PipelineRep[]> {
  const result = await dbPool.query(`
    SELECT
      id,
      full_name,
      email,
      role,
      avatar_url
    FROM pipeline_reps
    ORDER BY full_name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    avatar_url: row.avatar_url,
  }));
}

/**
 * Fetch pipeline deals with optional filters
 */
export async function getPipelineDeals(
  filters: PipelineFilters = {}
): Promise<PipelineDeal[]> {
  const conditions: string[] = ["r.status = 'sent'"];
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Filter by archived status (default: active only)
  const archivedFilter = filters.archived || 'active';
  if (archivedFilter === 'active') {
    conditions.push('r.archived_at IS NULL');
  } else if (archivedFilter === 'archived') {
    conditions.push('r.archived_at IS NOT NULL');
  }
  // 'all' doesn't add any condition

  // Filter by rep
  if (filters.rep_id) {
    conditions.push(`r.created_by = $${paramIndex}`);
    params.push(filters.rep_id);
    paramIndex++;
  }

  // Filter by tier
  if (filters.predicted_tier) {
    conditions.push(`r.predicted_tier = $${paramIndex}`);
    params.push(filters.predicted_tier);
    paramIndex++;
  }

  // Filter by date range
  if (filters.sent_after) {
    conditions.push(`r.sent_at >= $${paramIndex}`);
    params.push(filters.sent_after);
    paramIndex++;
  }

  if (filters.sent_before) {
    conditions.push(`r.sent_at <= $${paramIndex}`);
    params.push(filters.sent_before);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      r.id,
      r.status,
      r.sent_at,
      r.predicted_tier,
      COALESCE(r.predicted_monthly, 0) as predicted_monthly,
      COALESCE(r.predicted_onetime, 0) as predicted_onetime,
      r.confidence_score,
      r.confidence_percent,
      r.weighted_monthly,
      r.weighted_onetime,
      r.last_scored_at,
      r.created_at,
      -- Score breakdown
      r.base_score,
      r.total_penalties,
      r.total_bonus,
      r.penalty_email_not_opened,
      r.penalty_proposal_not_viewed,
      r.penalty_silence,
      -- Snooze status
      r.snoozed_until,
      r.snooze_reason,
      -- Archive status
      r.archived_at,
      r.archive_reason,
      r.archive_notes,
      r.revived_at,
      -- Client info
      c.name as client_name,
      c.id as client_id,
      c.contact_email as client_email,
      c.avatar_color as client_avatar_color,
      -- Rep info (via pipeline_reps view)
      pr.full_name as rep_full_name,
      pr.avatar_url as rep_avatar_url,
      pr.id as rep_id,
      -- Tier pricing from recommendation_items
      (
        SELECT COALESCE(SUM(COALESCE(ri.monthly_price, 0)), 0)
        FROM recommendation_items ri
        WHERE ri.recommendation_id = r.id AND ri.tier = 'good'
      ) as good_monthly,
      (
        SELECT COALESCE(SUM(COALESCE(ri.monthly_price, 0)), 0)
        FROM recommendation_items ri
        WHERE ri.recommendation_id = r.id AND ri.tier = 'better'
      ) as better_monthly,
      (
        SELECT COALESCE(SUM(COALESCE(ri.monthly_price, 0)), 0)
        FROM recommendation_items ri
        WHERE ri.recommendation_id = r.id AND ri.tier = 'best'
      ) as best_monthly,
      -- Last communication
      (
        SELECT MAX(contact_at)
        FROM recommendation_communications rc
        WHERE rc.recommendation_id = r.id
      ) as last_communication_at,
      -- Last inbound specifically
      (
        SELECT MAX(contact_at)
        FROM recommendation_communications rc
        WHERE rc.recommendation_id = r.id AND rc.direction = 'inbound'
      ) as last_inbound_at,
      -- Days since sent
      CASE
        WHEN r.sent_at IS NOT NULL
        THEN EXTRACT(DAY FROM now() - r.sent_at)::integer
        ELSE NULL
      END as age_days,
      -- Call scores (from recommendation_call_scores)
      cs.budget_clarity as call_budget_clarity,
      cs.competition as call_competition,
      cs.engagement as call_engagement,
      cs.plan_fit as call_plan_fit,
      -- Milestones (aggregated from recommendation_invites)
      (
        SELECT MIN(inv.email_opened_at)
        FROM recommendation_invites inv
        WHERE inv.recommendation_id = r.id AND inv.email_opened_at IS NOT NULL
      ) as first_email_opened_at,
      (
        SELECT MIN(inv.account_created_at)
        FROM recommendation_invites inv
        WHERE inv.recommendation_id = r.id AND inv.account_created_at IS NOT NULL
      ) as first_account_created_at,
      (
        SELECT MIN(inv.viewed_at)
        FROM recommendation_invites inv
        WHERE inv.recommendation_id = r.id AND inv.viewed_at IS NOT NULL
      ) as first_proposal_viewed_at,
      -- Followup count since last reply
      (
        SELECT COUNT(*)
        FROM recommendation_communications rc
        WHERE rc.recommendation_id = r.id
          AND rc.direction = 'outbound'
          AND rc.contact_at > COALESCE(
            (SELECT MAX(rc2.contact_at) FROM recommendation_communications rc2
             WHERE rc2.recommendation_id = r.id AND rc2.direction = 'inbound'),
            r.sent_at
          )
      )::integer as followup_count_since_last_reply
    FROM recommendations r
    JOIN clients c ON c.id = r.client_id
    LEFT JOIN pipeline_reps pr ON pr.id = r.created_by
    LEFT JOIN recommendation_call_scores cs ON cs.recommendation_id = r.id
    ${whereClause}
    ORDER BY r.confidence_score DESC NULLS LAST
  `;

  const result = await dbPool.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    client_name: row.client_name,
    client_id: row.client_id,
    client_email: row.client_email || null,
    client_avatar_color: row.client_avatar_color || null,
    rep_full_name: row.rep_full_name,
    rep_avatar_url: row.rep_avatar_url,
    rep_id: row.rep_id,
    status: row.status,
    sent_at: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    predicted_tier: row.predicted_tier,
    predicted_monthly: parseFloat(row.predicted_monthly) || 0,
    predicted_onetime: parseFloat(row.predicted_onetime) || 0,
    good_monthly: row.good_monthly !== null ? parseFloat(row.good_monthly) : null,
    better_monthly: row.better_monthly !== null ? parseFloat(row.better_monthly) : null,
    best_monthly: row.best_monthly !== null ? parseFloat(row.best_monthly) : null,
    confidence_score: row.confidence_score !== null ? parseInt(row.confidence_score) : null,
    confidence_percent: row.confidence_percent !== null ? parseFloat(row.confidence_percent) : null,
    weighted_monthly: row.weighted_monthly !== null ? parseFloat(row.weighted_monthly) : null,
    weighted_onetime: row.weighted_onetime !== null ? parseFloat(row.weighted_onetime) : null,
    last_scored_at: row.last_scored_at ? new Date(row.last_scored_at).toISOString() : null,
    last_communication_at: row.last_communication_at
      ? new Date(row.last_communication_at).toISOString()
      : null,
    last_inbound_at: row.last_inbound_at
      ? new Date(row.last_inbound_at).toISOString()
      : null,
    age_days: row.age_days !== null ? parseInt(row.age_days) : null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
    // Score breakdown
    base_score: row.base_score !== null ? parseInt(row.base_score) : null,
    total_penalties: row.total_penalties !== null ? parseFloat(row.total_penalties) : null,
    total_bonus: row.total_bonus !== null ? parseFloat(row.total_bonus) : null,
    penalty_email_not_opened: row.penalty_email_not_opened !== null ? parseFloat(row.penalty_email_not_opened) : null,
    penalty_proposal_not_viewed: row.penalty_proposal_not_viewed !== null ? parseFloat(row.penalty_proposal_not_viewed) : null,
    penalty_silence: row.penalty_silence !== null ? parseFloat(row.penalty_silence) : null,
    // Call scores
    call_budget_clarity: row.call_budget_clarity || null,
    call_competition: row.call_competition || null,
    call_engagement: row.call_engagement || null,
    call_plan_fit: row.call_plan_fit || null,
    // Milestones
    first_email_opened_at: row.first_email_opened_at
      ? new Date(row.first_email_opened_at).toISOString()
      : null,
    first_account_created_at: row.first_account_created_at
      ? new Date(row.first_account_created_at).toISOString()
      : null,
    first_proposal_viewed_at: row.first_proposal_viewed_at
      ? new Date(row.first_proposal_viewed_at).toISOString()
      : null,
    // Communication stats
    followup_count_since_last_reply: row.followup_count_since_last_reply !== null
      ? parseInt(row.followup_count_since_last_reply)
      : 0,
    // Snooze status
    snoozed_until: row.snoozed_until
      ? new Date(row.snoozed_until).toISOString()
      : null,
    snooze_reason: row.snooze_reason || null,
    // Archive status
    archived_at: row.archived_at
      ? new Date(row.archived_at).toISOString()
      : null,
    archive_reason: row.archive_reason || null,
    archive_notes: row.archive_notes || null,
    revived_at: row.revived_at
      ? new Date(row.revived_at).toISOString()
      : null,
  }));
}

/**
 * Compute aggregates from deals array
 */
export function computeAggregates(deals: PipelineDeal[]): PipelineAggregates {
  if (deals.length === 0) {
    return {
      total_weighted_mrr: 0,
      total_raw_mrr: 0,
      total_weighted_onetime: 0,
      total_raw_onetime: 0,
      deal_count: 0,
      avg_confidence: 0,
      pipeline_confidence_pct: 0,
    };
  }

  let totalWeightedMRR = 0;
  let totalRawMRR = 0;
  let totalWeightedOnetime = 0;
  let totalRawOnetime = 0;
  let totalConfidence = 0;
  let scoredDealsCount = 0;

  for (const deal of deals) {
    totalRawMRR += deal.predicted_monthly;
    totalRawOnetime += deal.predicted_onetime;

    if (deal.weighted_monthly !== null) {
      totalWeightedMRR += deal.weighted_monthly;
    }
    if (deal.weighted_onetime !== null) {
      totalWeightedOnetime += deal.weighted_onetime;
    }
    if (deal.confidence_score !== null) {
      totalConfidence += deal.confidence_score;
      scoredDealsCount++;
    }
  }

  const avgConfidence = scoredDealsCount > 0 ? totalConfidence / scoredDealsCount : 0;
  const pipelineConfidencePct = totalRawMRR > 0 ? (totalWeightedMRR / totalRawMRR) * 100 : 0;

  return {
    total_weighted_mrr: Math.round(totalWeightedMRR * 100) / 100,
    total_raw_mrr: Math.round(totalRawMRR * 100) / 100,
    total_weighted_onetime: Math.round(totalWeightedOnetime * 100) / 100,
    total_raw_onetime: Math.round(totalRawOnetime * 100) / 100,
    deal_count: deals.length,
    avg_confidence: Math.round(avgConfidence),
    pipeline_confidence_pct: Math.round(pipelineConfidencePct),
  };
}

/**
 * Get complete pipeline data with deals, aggregates, and reps
 */
export async function getPipelineData(
  filters: PipelineFilters = {}
): Promise<PipelineDataResponse> {
  const [deals, reps] = await Promise.all([
    getPipelineDeals(filters),
    getPipelineReps(),
  ]);

  const aggregates = computeAggregates(deals);

  return {
    deals,
    aggregates,
    reps,
  };
}

/**
 * Archive analytics filters - date range applies to archived_at
 */
export interface ArchiveAnalyticsFilters {
  /** Filter by archived_at >= this date */
  archived_after?: string;
  /** Filter by archived_at <= this date */
  archived_before?: string;
  /** Filter by sales rep ID */
  rep_id?: string;
}

/**
 * Get archive analytics with breakdown by reason
 */
export async function getArchiveAnalytics(
  filters: ArchiveAnalyticsFilters = {}
): Promise<ArchiveAnalytics> {
  const conditions: string[] = [
    "r.status = 'sent'",
    'r.archived_at IS NOT NULL',
  ];
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Filter by archived_at date range
  if (filters.archived_after) {
    conditions.push(`r.archived_at >= $${paramIndex}`);
    params.push(filters.archived_after);
    paramIndex++;
  }

  if (filters.archived_before) {
    conditions.push(`r.archived_at <= $${paramIndex}`);
    params.push(filters.archived_before);
    paramIndex++;
  }

  // Filter by rep
  if (filters.rep_id) {
    conditions.push(`r.created_by = $${paramIndex}`);
    params.push(filters.rep_id);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Query for aggregated analytics
  const analyticsQuery = `
    SELECT
      COUNT(*)::integer as total_archived,
      COALESCE(SUM(r.predicted_monthly), 0) as lost_mrr,
      COALESCE(SUM(r.predicted_onetime), 0) as lost_onetime,
      COALESCE(AVG(
        CASE
          WHEN r.sent_at IS NOT NULL AND r.archived_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (r.archived_at - r.sent_at)) / 86400
          ELSE NULL
        END
      ), 0) as avg_days_to_archive
    FROM recommendations r
    ${whereClause}
  `;

  // Query for breakdown by reason
  const breakdownQuery = `
    SELECT
      r.archive_reason as reason,
      COUNT(*)::integer as count,
      COALESCE(SUM(r.predicted_monthly), 0) as mrr_lost,
      COALESCE(SUM(r.predicted_onetime), 0) as onetime_lost
    FROM recommendations r
    ${whereClause}
    AND r.archive_reason IS NOT NULL
    GROUP BY r.archive_reason
    ORDER BY count DESC
  `;

  const [analyticsResult, breakdownResult] = await Promise.all([
    dbPool.query(analyticsQuery, params),
    dbPool.query(breakdownQuery, params),
  ]);

  const analytics = analyticsResult.rows[0];
  const totalArchived = parseInt(analytics.total_archived) || 0;

  const reasons_breakdown: ReasonBreakdown[] = breakdownResult.rows.map((row) => ({
    reason: row.reason as ArchiveReason,
    count: parseInt(row.count) || 0,
    mrr_lost: parseFloat(row.mrr_lost) || 0,
    onetime_lost: parseFloat(row.onetime_lost) || 0,
    percentage: totalArchived > 0 ? Math.round((parseInt(row.count) / totalArchived) * 100) : 0,
  }));

  const topReason = reasons_breakdown.length > 0 ? reasons_breakdown[0] : null;

  return {
    total_archived: totalArchived,
    lost_mrr: parseFloat(analytics.lost_mrr) || 0,
    lost_onetime: parseFloat(analytics.lost_onetime) || 0,
    avg_days_to_archive: Math.round(parseFloat(analytics.avg_days_to_archive) || 0),
    top_reason: topReason?.reason || null,
    top_reason_percentage: topReason?.percentage || 0,
    reasons_breakdown,
  };
}
