// ============================================================
// Pipeline Scoring Engine
// ============================================================
//
// Pure function: takes ScoringInput, returns ScoringResult.
// No database calls, no side effects, no Date.now().
// All time comes from the `now` parameter for deterministic testing.
//
// Scoring Flow:
//   1. Closed-lost deals → immediate zero
//   2. Compute base score from on-call factors (or use default)
//   3. Compute penalty: [EMAIL_NOT_OPENED]
//   4. Compute penalty: [PROPOSAL_NOT_VIEWED]
//   5. Compute penalty: [SILENCE]
//   6. Compute multi-invite bonus
//   7. Final score = clamp(base - penalties + bonus, 0, 100)
//   8. Derive weighted pipeline values
// ============================================================

import type {
  ScoringInput,
  ScoringResult,
  PenaltyBreakdown,
  CallScoreInputs,
  ScoringConfig,
  PenaltyConfig,
  InviteMilestones,
  InviteStats,
  CommunicationData,
} from './types';

// --- Utility ---

/** Milliseconds in one hour */
const MS_PER_HOUR = 1000 * 60 * 60;
/** Milliseconds in one day */
const MS_PER_DAY = MS_PER_HOUR * 24;

/**
 * Compute the number of full days elapsed between two ISO timestamps.
 * Returns 0 if either is null or if the difference is negative.
 */
function daysBetween(from: string | null, to: string): number {
  if (!from) return 0;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

/**
 * Compute the number of full hours elapsed between two ISO timestamps.
 * Returns 0 if either is null or if the difference is negative.
 */
function hoursBetween(from: string | null, to: string): number {
  if (!from) return 0;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(diff / MS_PER_HOUR));
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to 2 decimal places for currency */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- Base Score Calculation ---

/**
 * Compute the on-call base score from the four rep-entered factors.
 *
 * Each factor is mapped to a 0–1 multiplier via config,
 * then multiplied by its weight. The sum of all weights = max possible score.
 *
 * Example with default config:
 *   budget_clarity=clear (1.0 × 25) + competition=none (1.0 × 20)
 *   + engagement=high (1.0 × 25) + plan_fit=strong (1.0 × 30)
 *   = 25 + 20 + 25 + 30 = 100 (perfect score)
 */
function computeBaseScore(
  callScores: CallScoreInputs,
  config: ScoringConfig
): number {
  const { call_weights, call_score_mappings } = config;

  const budgetPoints =
    (call_score_mappings.budget_clarity[callScores.budget_clarity] ?? 0) *
    call_weights.budget_clarity;

  const competitionPoints =
    (call_score_mappings.competition[callScores.competition] ?? 0) *
    call_weights.competition;

  const engagementPoints =
    (call_score_mappings.engagement[callScores.engagement] ?? 0) *
    call_weights.engagement;

  const planFitPoints =
    (call_score_mappings.plan_fit[callScores.plan_fit] ?? 0) *
    call_weights.plan_fit;

  return budgetPoints + competitionPoints + engagementPoints + planFitPoints;
}

// --- Penalty Calculations ---

/**
 * [EMAIL_NOT_OPENED] — Penalty when no invitee has opened the email.
 *
 * Starts accumulating after grace_period_hours from sent_at.
 * Zeroed entirely if any invite email has been opened.
 */
function computeEmailNotOpenedPenalty(
  sentAt: string | null,
  milestones: InviteMilestones,
  config: PenaltyConfig,
  now: string
): number {
  // If any invitee opened the email, no penalty
  if (milestones.first_email_opened_at) return 0;

  // If recommendation hasn't been sent yet, no penalty
  if (!sentAt) return 0;

  const hoursElapsed = hoursBetween(sentAt, now);
  const graceHours = config.grace_period_hours ?? 24;

  if (hoursElapsed <= graceHours) return 0;

  // Convert hours past grace to days for daily_penalty calculation
  const daysPastGrace = (hoursElapsed - graceHours) / 24;
  const rawPenalty = daysPastGrace * config.daily_penalty;

  return Math.min(rawPenalty, config.max_penalty);
}

/**
 * [PROPOSAL_NOT_VIEWED] — Penalty when no invitee has viewed the recommendation page.
 *
 * Only starts AFTER the email has been opened (or account created).
 * If the email hasn't been opened, this penalty does not apply
 * (the email_not_opened penalty handles that phase).
 *
 * Anchor point: first_email_opened_at or first_account_created_at
 * (whichever happened first, indicating they've engaged).
 */
function computeProposalNotViewedPenalty(
  milestones: InviteMilestones,
  config: PenaltyConfig,
  now: string
): number {
  // If proposal has been viewed, no penalty
  if (milestones.first_proposal_viewed_at) return 0;

  // Find the engagement anchor: earliest of email_opened or account_created
  const anchors = [
    milestones.first_email_opened_at,
    milestones.first_account_created_at,
  ].filter(Boolean) as string[];

  if (anchors.length === 0) {
    // No email opened and no account created → this penalty doesn't apply yet
    // (email_not_opened penalty is handling decay during this phase)
    return 0;
  }

  // Use earliest anchor
  const anchorTime = anchors
    .map((a) => new Date(a).getTime())
    .sort((a, b) => a - b)[0];
  const anchorStr = new Date(anchorTime).toISOString();

  const hoursElapsed = hoursBetween(anchorStr, now);
  const graceHours = config.grace_period_hours ?? 48;

  if (hoursElapsed <= graceHours) return 0;

  const daysPastGrace = (hoursElapsed - graceHours) / 24;
  const rawPenalty = daysPastGrace * config.daily_penalty;

  return Math.min(rawPenalty, config.max_penalty);
}

/**
 * [SILENCE] — Penalty for lack of prospect communication.
 *
 * Starts accumulating after grace_period_days from the later of:
 *   - sent_at (if no communication has happened at all)
 *   - last_prospect_contact_at (if they've communicated before)
 *
 * Accelerated by follow-up count: if the team has sent
 * followup_acceleration_threshold+ follow-ups without a response,
 * the daily_penalty is multiplied by followup_acceleration_multiplier.
 *
 * This is the "slow death" penalty — it's the primary driver of
 * long-term score decay for deals that go silent.
 */
function computeSilencePenalty(
  sentAt: string | null,
  communications: CommunicationData,
  config: PenaltyConfig,
  now: string
): number {
  if (!sentAt) return 0;

  // Anchor: last time the prospect said anything, or sent_at if never
  const anchor = communications.last_prospect_contact_at ?? sentAt;

  const daysElapsed = daysBetween(anchor, now);
  const graceDays = config.grace_period_days ?? 5;

  if (daysElapsed <= graceDays) return 0;

  const daysPastGrace = daysElapsed - graceDays;

  // Determine if follow-up acceleration applies
  let effectiveDailyPenalty = config.daily_penalty;
  const threshold = config.followup_acceleration_threshold ?? 2;
  const multiplier = config.followup_acceleration_multiplier ?? 1.5;

  if (communications.followup_count_since_last_reply >= threshold) {
    effectiveDailyPenalty = config.daily_penalty * multiplier;
  }

  const rawPenalty = daysPastGrace * effectiveDailyPenalty;

  return Math.min(rawPenalty, config.max_penalty);
}

// --- Multi-Invite Bonus ---

/**
 * Bonus points when ALL invitees hit milestones (not just the first one).
 *
 * This is additive — it can partially offset penalties.
 * Only applies when total_invites > 1 (no bonus for single invites).
 */
function computeMultiInviteBonus(
  inviteStats: InviteStats,
  config: ScoringConfig
): number {
  if (inviteStats.total_invites <= 1) return 0;

  let bonus = 0;

  // All invitees opened the email
  if (
    inviteStats.opened_count >= inviteStats.total_invites &&
    inviteStats.total_invites > 0
  ) {
    bonus += config.multi_invite_bonus.all_opened_bonus;
  }

  // All invitees viewed the proposal
  if (
    inviteStats.viewed_count >= inviteStats.total_invites &&
    inviteStats.total_invites > 0
  ) {
    bonus += config.multi_invite_bonus.all_viewed_bonus;
  }

  return bonus;
}

// --- Main Scoring Function ---

/**
 * Compute the pipeline confidence score for a single recommendation/deal.
 *
 * This is a PURE FUNCTION — deterministic, no side effects.
 * Pass in everything it needs, get a result back.
 *
 * @param input - Complete deal data, config, and current timestamp
 * @returns ScoringResult with score, weighted values, and penalty breakdown
 */
export function computePipelineScore(input: ScoringInput): ScoringResult {
  const { deal, call_scores, milestones, invite_stats, communications, config, now } = input;

  // ---- Immediate zero for closed-lost deals ----
  if (deal.status === 'closed_lost') {
    return {
      confidence_score: 0,
      confidence_percent: 0,
      weighted_monthly: 0,
      weighted_onetime: 0,
      base_score: 0,
      total_penalties: 0,
      total_bonus: 0,
      penalty_breakdown: {
        email_not_opened: 0,
        proposal_not_viewed: 0,
        silence: 0,
        multi_invite_bonus: 0,
      },
    };
  }

  // ---- Immediate zero for accepted deals (they're customers now, not pipeline) ----
  if (deal.status === 'accepted') {
    return {
      confidence_score: 100,
      confidence_percent: 1,
      weighted_monthly: deal.predicted_monthly,
      weighted_onetime: deal.predicted_onetime,
      base_score: 100,
      total_penalties: 0,
      total_bonus: 0,
      penalty_breakdown: {
        email_not_opened: 0,
        proposal_not_viewed: 0,
        silence: 0,
        multi_invite_bonus: 0,
      },
    };
  }

  // ---- Draft deals: return base score only, no penalties ----
  if (deal.status === 'draft') {
    const baseScore = call_scores
      ? computeBaseScore(call_scores, config)
      : config.default_base_score;

    return {
      confidence_score: Math.round(clamp(baseScore, 0, 100)),
      confidence_percent: round2(clamp(baseScore, 0, 100) / 100),
      weighted_monthly: round2(deal.predicted_monthly * (clamp(baseScore, 0, 100) / 100)),
      weighted_onetime: round2(deal.predicted_onetime * (clamp(baseScore, 0, 100) / 100)),
      base_score: Math.round(baseScore),
      total_penalties: 0,
      total_bonus: 0,
      penalty_breakdown: {
        email_not_opened: 0,
        proposal_not_viewed: 0,
        silence: 0,
        multi_invite_bonus: 0,
      },
    };
  }

  // ---- Active pipeline deals (status = 'sent' or 'declined') ----

  // Step 1: Base score
  const baseScore = call_scores
    ? computeBaseScore(call_scores, config)
    : config.default_base_score;

  // Step 2: Penalties
  const emailPenalty = computeEmailNotOpenedPenalty(
    deal.sent_at,
    milestones,
    config.penalties.email_not_opened,
    now
  );

  const viewPenalty = computeProposalNotViewedPenalty(
    milestones,
    config.penalties.proposal_not_viewed,
    now
  );

  const silencePenalty = computeSilencePenalty(
    deal.sent_at,
    communications,
    config.penalties.silence,
    now
  );

  const totalPenalties = emailPenalty + viewPenalty + silencePenalty;

  // Step 3: Multi-invite bonus
  const bonus = computeMultiInviteBonus(invite_stats, config);

  // Step 4: Final score
  const rawScore = baseScore - totalPenalties + bonus;
  const finalScore = Math.round(clamp(rawScore, 0, 100));
  const confidencePercent = round2(finalScore / 100);

  // Step 5: Weighted pipeline values
  const weightedMonthly = round2(deal.predicted_monthly * confidencePercent);
  const weightedOnetime = round2(deal.predicted_onetime * confidencePercent);

  return {
    confidence_score: finalScore,
    confidence_percent: confidencePercent,
    weighted_monthly: weightedMonthly,
    weighted_onetime: weightedOnetime,
    base_score: Math.round(baseScore),
    total_penalties: round2(totalPenalties),
    total_bonus: bonus,
    penalty_breakdown: {
      email_not_opened: round2(emailPenalty),
      proposal_not_viewed: round2(viewPenalty),
      silence: round2(silencePenalty),
      multi_invite_bonus: bonus,
    },
  };
}

// --- Exported utilities for direct testing ---
export {
  computeBaseScore,
  computeEmailNotOpenedPenalty,
  computeProposalNotViewedPenalty,
  computeSilencePenalty,
  computeMultiInviteBonus,
  daysBetween,
  hoursBetween,
};
