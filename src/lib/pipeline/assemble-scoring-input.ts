// ============================================================
// Pipeline Scoring: Data Assembly
// ============================================================
//
// Assembles all data needed for scoring from the database.
// Uses raw SQL queries for compatibility with new columns
// that may not yet be in the Prisma/Supabase type definitions.
// ============================================================

import { dbPool } from '@/lib/prisma';
import { DEFAULT_CONFIG } from './default-config';
import type {
  ScoringInput,
  ScoringConfig,
  DealData,
  CallScoreInputs,
  InviteMilestones,
  InviteStats,
  CommunicationData,
  DealStatus,
  BudgetClarity,
  Competition,
  Engagement,
  PlanFit,
} from './types';

/**
 * Assembles all data needed for scoring a recommendation.
 * Queries the database and transforms into the ScoringInput format.
 */
export async function assembleScoringInput(
  recommendationId: string
): Promise<ScoringInput> {
  // Fetch deal data from recommendations table
  const recResult = await dbPool.query(
    `SELECT
      id,
      status,
      sent_at,
      predicted_monthly,
      predicted_onetime,
      snoozed_until,
      revived_at
     FROM recommendations
     WHERE id = $1`,
    [recommendationId]
  );

  if (recResult.rows.length === 0) {
    throw new Error(`Recommendation not found: ${recommendationId}`);
  }

  const recommendation = recResult.rows[0];

  const deal: DealData = {
    status: (recommendation.status || 'draft') as DealStatus,
    sent_at: recommendation.sent_at,
    predicted_monthly: Number(recommendation.predicted_monthly) || 0,
    predicted_onetime: Number(recommendation.predicted_onetime) || 0,
    snoozed_until: recommendation.snoozed_until?.toISOString?.() || recommendation.snoozed_until || null,
    revived_at: recommendation.revived_at?.toISOString?.() || recommendation.revived_at || null,
  };

  // Fetch call scores (nullable - may not exist yet)
  const callScoreResult = await dbPool.query(
    `SELECT budget_clarity, competition, engagement, plan_fit
     FROM recommendation_call_scores
     WHERE recommendation_id = $1`,
    [recommendationId]
  );

  const callScoreRow = callScoreResult.rows[0];
  const call_scores: CallScoreInputs | null = callScoreRow
    ? {
        budget_clarity: callScoreRow.budget_clarity as BudgetClarity,
        competition: callScoreRow.competition as Competition,
        engagement: callScoreRow.engagement as Engagement,
        plan_fit: callScoreRow.plan_fit as PlanFit,
      }
    : null;

  // Fetch invite milestones and stats
  const inviteResult = await dbPool.query(
    `SELECT email_opened_at, account_created_at, viewed_at
     FROM recommendation_invites
     WHERE recommendation_id = $1`,
    [recommendationId]
  );

  const invites = inviteResult.rows;

  // Compute milestones (earliest timestamps)
  const milestones: InviteMilestones = {
    first_email_opened_at: invites
      .map((i: any) => i.email_opened_at)
      .filter(Boolean)
      .sort()[0] || null,
    first_account_created_at: invites
      .map((i: any) => i.account_created_at)
      .filter(Boolean)
      .sort()[0] || null,
    first_proposal_viewed_at: invites
      .map((i: any) => i.viewed_at)
      .filter(Boolean)
      .sort()[0] || null,
  };

  // Compute invite stats
  const invite_stats: InviteStats = {
    total_invites: invites.length,
    opened_count: invites.filter((i: any) => i.email_opened_at).length,
    accounts_created_count: invites.filter((i: any) => i.account_created_at).length,
    viewed_count: invites.filter((i: any) => i.viewed_at).length,
  };

  // Fetch communication data
  const commResult = await dbPool.query(
    `SELECT direction, contact_at
     FROM recommendation_communications
     WHERE recommendation_id = $1
     ORDER BY contact_at DESC`,
    [recommendationId]
  );

  const comms = commResult.rows;

  // Find last inbound and outbound contacts
  const inboundComms = comms.filter((c: any) => c.direction === 'inbound');
  const outboundComms = comms.filter((c: any) => c.direction === 'outbound');

  const last_prospect_contact_at = inboundComms[0]?.contact_at?.toISOString?.() || inboundComms[0]?.contact_at || null;
  const last_team_contact_at = outboundComms[0]?.contact_at?.toISOString?.() || outboundComms[0]?.contact_at || null;

  // Count follow-ups since last reply (outbound after last inbound)
  let followup_count_since_last_reply = 0;
  if (last_prospect_contact_at) {
    const lastInboundTime = new Date(last_prospect_contact_at).getTime();
    followup_count_since_last_reply = outboundComms.filter(
      (c: any) => new Date(c.contact_at).getTime() > lastInboundTime
    ).length;
  } else {
    // No inbound yet, all outbound are follow-ups
    followup_count_since_last_reply = outboundComms.length;
  }

  const communications: CommunicationData = {
    last_prospect_contact_at,
    last_team_contact_at,
    followup_count_since_last_reply,
  };

  // Fetch scoring config from settings (or use default)
  const configResult = await dbPool.query(
    `SELECT value FROM settings WHERE key = 'pipeline_scoring_config'`
  );

  let config: ScoringConfig = DEFAULT_CONFIG;
  const configRow = configResult.rows[0];
  if (configRow?.value) {
    try {
      // The value is JSONB, should already be an object
      config = typeof configRow.value === 'string'
        ? JSON.parse(configRow.value)
        : configRow.value;
    } catch (e) {
      console.error('Failed to parse scoring config, using default:', e);
    }
  }

  return {
    deal,
    call_scores,
    milestones,
    invite_stats,
    communications,
    config,
    now: new Date().toISOString(),
  };
}
