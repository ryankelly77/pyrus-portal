// ============================================================
// Pipeline Scoring Engine — Test Suite
// ============================================================
//
// Test structure:
//   1. Utility functions (daysBetween, hoursBetween)
//   2. Base score calculation (all call factor combinations)
//   3. Email not opened penalty
//   4. Proposal not viewed penalty
//   5. Silence/inactivity penalty
//   6. Multi-invite bonus
//   7. Full scoring integration (realistic scenarios)
//   8. Edge cases and status handling
//
// Run: npx vitest run scoring-engine.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  computePipelineScore,
  computeBaseScore,
  computeEmailNotOpenedPenalty,
  computeProposalNotViewedPenalty,
  computeSilencePenalty,
  computeMultiInviteBonus,
  daysBetween,
  hoursBetween,
} from './scoring-engine';
import { DEFAULT_CONFIG } from './default-config';
import type {
  ScoringInput,
  CallScoreInputs,
  InviteMilestones,
  InviteStats,
  CommunicationData,
  DealData,
  ScoringConfig,
} from './types';

// --- Test Helpers ---

/** Create a date string N days from a base date */
function daysFromNow(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Create a date string N hours from a base date */
function hoursFromNow(base: string, hours: number): string {
  const d = new Date(base);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

/** Standard "perfect" call scores */
const PERFECT_CALL: CallScoreInputs = {
  budget_clarity: 'clear',
  competition: 'none',
  engagement: 'high',
  plan_fit: 'strong',
};

/** Standard "mediocre" call scores */
const MEDIOCRE_CALL: CallScoreInputs = {
  budget_clarity: 'vague',
  competition: 'some',
  engagement: 'medium',
  plan_fit: 'medium',
};

/** Standard "terrible" call scores */
const TERRIBLE_CALL: CallScoreInputs = {
  budget_clarity: 'no_budget',
  competition: 'many',
  engagement: 'low',
  plan_fit: 'poor',
};

/** No milestones hit yet */
const NO_MILESTONES: InviteMilestones = {
  first_email_opened_at: null,
  first_account_created_at: null,
  first_proposal_viewed_at: null,
};

/** All milestones hit */
function allMilestonesHit(base: string): InviteMilestones {
  return {
    first_email_opened_at: hoursFromNow(base, 2),
    first_account_created_at: hoursFromNow(base, 4),
    first_proposal_viewed_at: hoursFromNow(base, 5),
  };
}

/** Single invite stats (1 sent, none opened/viewed) */
const SINGLE_INVITE_NONE: InviteStats = {
  total_invites: 1,
  opened_count: 0,
  accounts_created_count: 0,
  viewed_count: 0,
};

/** Single invite stats (1 sent, all milestones hit) */
const SINGLE_INVITE_ALL: InviteStats = {
  total_invites: 1,
  opened_count: 1,
  accounts_created_count: 1,
  viewed_count: 1,
};

/** No communications */
const NO_COMMS: CommunicationData = {
  last_prospect_contact_at: null,
  last_team_contact_at: null,
  followup_count_since_last_reply: 0,
};

/** Base timestamp for all tests */
const T0 = '2025-06-01T10:00:00.000Z';

/** Standard deal data (sent, $500/mo, $1000 one-time) */
function makeDeal(overrides: Partial<DealData> = {}): DealData {
  return {
    status: 'sent',
    sent_at: T0,
    predicted_monthly: 500,
    predicted_onetime: 1000,
    ...overrides,
  };
}

/** Build a full scoring input */
function makeInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    deal: makeDeal(),
    call_scores: PERFECT_CALL,
    milestones: allMilestonesHit(T0),
    invite_stats: SINGLE_INVITE_ALL,
    communications: {
      last_prospect_contact_at: T0,
      last_team_contact_at: T0,
      followup_count_since_last_reply: 0,
    },
    config: DEFAULT_CONFIG,
    now: hoursFromNow(T0, 1), // 1 hour after sent
    ...overrides,
  };
}


// ============================================================
// 1. Utility Functions
// ============================================================

describe('Utility: daysBetween', () => {
  it('returns 0 for null input', () => {
    expect(daysBetween(null, T0)).toBe(0);
  });

  it('returns 0 for same timestamp', () => {
    expect(daysBetween(T0, T0)).toBe(0);
  });

  it('returns 1 for exactly 24 hours', () => {
    expect(daysBetween(T0, daysFromNow(T0, 1))).toBe(1);
  });

  it('returns 7 for one week', () => {
    expect(daysBetween(T0, daysFromNow(T0, 7))).toBe(7);
  });

  it('returns 0 for negative difference (from is after to)', () => {
    expect(daysBetween(daysFromNow(T0, 5), T0)).toBe(0);
  });

  it('truncates partial days (23 hours = 0 days)', () => {
    expect(daysBetween(T0, hoursFromNow(T0, 23))).toBe(0);
  });
});

describe('Utility: hoursBetween', () => {
  it('returns 0 for null input', () => {
    expect(hoursBetween(null, T0)).toBe(0);
  });

  it('returns 24 for one day', () => {
    expect(hoursBetween(T0, daysFromNow(T0, 1))).toBe(24);
  });

  it('returns 0 for negative difference', () => {
    expect(hoursBetween(daysFromNow(T0, 1), T0)).toBe(0);
  });
});


// ============================================================
// 2. Base Score Calculation
// ============================================================

describe('Base Score: Call Factors', () => {
  it('perfect call = 100 points', () => {
    const score = computeBaseScore(PERFECT_CALL, DEFAULT_CONFIG);
    // clear(1.0×25) + none(1.0×20) + high(1.0×25) + strong(1.0×30) = 100
    expect(score).toBe(100);
  });

  it('mediocre call scores appropriately', () => {
    const score = computeBaseScore(MEDIOCRE_CALL, DEFAULT_CONFIG);
    // vague(0.5×25) + some(0.5×20) + medium(0.55×25) + medium(0.6×30)
    // = 12.5 + 10 + 13.75 + 18 = 54.25
    expect(score).toBeCloseTo(54.25, 2);
  });

  it('terrible call = minimum points', () => {
    const score = computeBaseScore(TERRIBLE_CALL, DEFAULT_CONFIG);
    // no_budget(0×25) + many(0.15×20) + low(0.15×25) + poor(0×30)
    // = 0 + 3 + 3.75 + 0 = 6.75
    expect(score).toBeCloseTo(6.75, 2);
  });

  it('mixed call: clear budget, many competitors, low engagement, strong fit', () => {
    const score = computeBaseScore(
      {
        budget_clarity: 'clear',
        competition: 'many',
        engagement: 'low',
        plan_fit: 'strong',
      },
      DEFAULT_CONFIG
    );
    // clear(1.0×25) + many(0.15×20) + low(0.15×25) + strong(1.0×30)
    // = 25 + 3 + 3.75 + 30 = 61.75
    expect(score).toBeCloseTo(61.75, 2);
  });

  it('all "none" selections (budget=none, not no_budget)', () => {
    const score = computeBaseScore(
      {
        budget_clarity: 'none',
        competition: 'none',
        engagement: 'low',
        plan_fit: 'weak',
      },
      DEFAULT_CONFIG
    );
    // none(0.2×25) + none(1.0×20) + low(0.15×25) + weak(0.25×30)
    // = 5 + 20 + 3.75 + 7.5 = 36.25
    expect(score).toBeCloseTo(36.25, 2);
  });
});


// ============================================================
// 3. Email Not Opened Penalty
// ============================================================

describe('Penalty: Email Not Opened [NOT_OPENED]', () => {
  const penaltyConfig = DEFAULT_CONFIG.penalties.email_not_opened;

  it('no penalty within 24-hour grace period', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      hoursFromNow(T0, 23) // 23 hours after sent
    );
    expect(penalty).toBe(0);
  });

  it('no penalty if email was opened', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      { ...NO_MILESTONES, first_email_opened_at: hoursFromNow(T0, 2) },
      penaltyConfig,
      daysFromNow(T0, 30) // 30 days later, but email was opened
    );
    expect(penalty).toBe(0);
  });

  it('penalty starts after 24 hours', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      hoursFromNow(T0, 48) // 48 hours after sent = 1 day past grace
    );
    // 1 day past grace × 2.5/day = 2.5
    expect(penalty).toBe(2.5);
  });

  it('accumulates daily', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      daysFromNow(T0, 5) // 5 days after sent = 4 days past grace
    );
    // 4 days past grace × 2.5/day = 10
    expect(penalty).toBe(10);
  });

  it('caps at max_penalty (35)', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      daysFromNow(T0, 60) // 60 days — way past max
    );
    expect(penalty).toBe(35);
  });

  it('no penalty if not sent yet', () => {
    const penalty = computeEmailNotOpenedPenalty(
      null,
      NO_MILESTONES,
      penaltyConfig,
      T0
    );
    expect(penalty).toBe(0);
  });

  it('exact grace period boundary = no penalty', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      hoursFromNow(T0, 24) // exactly at 24h boundary
    );
    expect(penalty).toBe(0);
  });
});


// ============================================================
// 4. Proposal Not Viewed Penalty
// ============================================================

describe('Penalty: Proposal Not Viewed [NOT_VIEWED]', () => {
  const penaltyConfig = DEFAULT_CONFIG.penalties.proposal_not_viewed;

  it('no penalty if proposal was viewed', () => {
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: hoursFromNow(T0, 1),
        first_account_created_at: null,
        first_proposal_viewed_at: hoursFromNow(T0, 2),
      },
      penaltyConfig,
      daysFromNow(T0, 30) // long time later, but viewed
    );
    expect(penalty).toBe(0);
  });

  it('no penalty if email not opened yet (email penalty handles this phase)', () => {
    const penalty = computeProposalNotViewedPenalty(
      NO_MILESTONES,
      penaltyConfig,
      daysFromNow(T0, 30)
    );
    expect(penalty).toBe(0);
  });

  it('no penalty within 48-hour grace period after email open', () => {
    const emailOpenedAt = hoursFromNow(T0, 12);
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: emailOpenedAt,
        first_account_created_at: null,
        first_proposal_viewed_at: null,
      },
      penaltyConfig,
      hoursFromNow(emailOpenedAt, 47) // within 48h grace
    );
    expect(penalty).toBe(0);
  });

  it('penalty starts after 48 hours post email open', () => {
    const emailOpenedAt = hoursFromNow(T0, 12);
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: emailOpenedAt,
        first_account_created_at: null,
        first_proposal_viewed_at: null,
      },
      penaltyConfig,
      hoursFromNow(emailOpenedAt, 72) // 24h past grace = 1 day
    );
    // 1 day past grace × 2/day = 2
    expect(penalty).toBe(2);
  });

  it('caps at max_penalty (25)', () => {
    const emailOpenedAt = hoursFromNow(T0, 12);
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: emailOpenedAt,
        first_account_created_at: null,
        first_proposal_viewed_at: null,
      },
      penaltyConfig,
      daysFromNow(emailOpenedAt, 60) // way past max
    );
    expect(penalty).toBe(25);
  });

  it('uses account_created_at as anchor if email_opened_at is null', () => {
    const accountCreatedAt = hoursFromNow(T0, 24);
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: null,
        first_account_created_at: accountCreatedAt,
        first_proposal_viewed_at: null,
      },
      penaltyConfig,
      hoursFromNow(accountCreatedAt, 72) // 24h past grace
    );
    expect(penalty).toBe(2);
  });

  it('uses earliest anchor when both email_opened and account_created exist', () => {
    const emailOpenedAt = hoursFromNow(T0, 10);
    const accountCreatedAt = hoursFromNow(T0, 20); // later
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: emailOpenedAt,
        first_account_created_at: accountCreatedAt,
        first_proposal_viewed_at: null,
      },
      penaltyConfig,
      hoursFromNow(emailOpenedAt, 72) // 24h past grace from EARLIER anchor
    );
    // Should use emailOpenedAt as anchor (earlier)
    expect(penalty).toBe(2);
  });
});


// ============================================================
// 5. Silence / Inactivity Penalty
// ============================================================

describe('Penalty: Silence [SILENCE]', () => {
  const penaltyConfig = DEFAULT_CONFIG.penalties.silence;

  it('no penalty within 5-day grace period', () => {
    const penalty = computeSilencePenalty(
      T0,
      NO_COMMS,
      penaltyConfig,
      daysFromNow(T0, 4)
    );
    expect(penalty).toBe(0);
  });

  it('penalty starts after 5-day grace period', () => {
    const penalty = computeSilencePenalty(
      T0,
      NO_COMMS,
      penaltyConfig,
      daysFromNow(T0, 7) // 2 days past grace
    );
    // 2 days × 3/day = 6
    expect(penalty).toBe(6);
  });

  it('resets grace period from last prospect contact', () => {
    const lastContact = daysFromNow(T0, 10);
    const penalty = computeSilencePenalty(
      T0,
      {
        last_prospect_contact_at: lastContact,
        last_team_contact_at: null,
        followup_count_since_last_reply: 0,
      },
      penaltyConfig,
      daysFromNow(lastContact, 3) // 3 days since last contact, within grace
    );
    expect(penalty).toBe(0);
  });

  it('accumulates after grace from last prospect contact', () => {
    const lastContact = daysFromNow(T0, 10);
    const penalty = computeSilencePenalty(
      T0,
      {
        last_prospect_contact_at: lastContact,
        last_team_contact_at: null,
        followup_count_since_last_reply: 0,
      },
      penaltyConfig,
      daysFromNow(lastContact, 8) // 3 days past grace
    );
    // 3 days × 3/day = 9
    expect(penalty).toBe(9);
  });

  it('caps at max_penalty (80)', () => {
    const penalty = computeSilencePenalty(
      T0,
      NO_COMMS,
      penaltyConfig,
      daysFromNow(T0, 100) // extreme silence
    );
    expect(penalty).toBe(80);
  });

  it('accelerates penalty after 2+ follow-ups with no reply', () => {
    const penalty = computeSilencePenalty(
      T0,
      {
        last_prospect_contact_at: null,
        last_team_contact_at: daysFromNow(T0, 8),
        followup_count_since_last_reply: 3, // past threshold of 2
      },
      penaltyConfig,
      daysFromNow(T0, 10) // 5 days past grace
    );
    // 5 days × (3 × 1.5 = 4.5/day) = 22.5
    expect(penalty).toBe(22.5);
  });

  it('does not accelerate below follow-up threshold', () => {
    const penalty = computeSilencePenalty(
      T0,
      {
        last_prospect_contact_at: null,
        last_team_contact_at: daysFromNow(T0, 8),
        followup_count_since_last_reply: 1, // below threshold of 2
      },
      penaltyConfig,
      daysFromNow(T0, 10) // 5 days past grace
    );
    // 5 days × 3/day = 15 (no acceleration)
    expect(penalty).toBe(15);
  });

  it('no penalty if not sent', () => {
    const penalty = computeSilencePenalty(
      null,
      NO_COMMS,
      penaltyConfig,
      T0
    );
    expect(penalty).toBe(0);
  });
});


// ============================================================
// 6. Multi-Invite Bonus
// ============================================================

describe('Multi-Invite Bonus', () => {
  it('no bonus for single invite', () => {
    const bonus = computeMultiInviteBonus(
      { total_invites: 1, opened_count: 1, accounts_created_count: 1, viewed_count: 1 },
      DEFAULT_CONFIG
    );
    expect(bonus).toBe(0);
  });

  it('no bonus when not all invitees opened', () => {
    const bonus = computeMultiInviteBonus(
      { total_invites: 3, opened_count: 2, accounts_created_count: 1, viewed_count: 1 },
      DEFAULT_CONFIG
    );
    expect(bonus).toBe(0);
  });

  it('all_opened_bonus (3) when all invitees opened email', () => {
    const bonus = computeMultiInviteBonus(
      { total_invites: 3, opened_count: 3, accounts_created_count: 1, viewed_count: 0 },
      DEFAULT_CONFIG
    );
    expect(bonus).toBe(3);
  });

  it('all_viewed_bonus (5) when all invitees viewed proposal', () => {
    const bonus = computeMultiInviteBonus(
      { total_invites: 3, opened_count: 2, accounts_created_count: 1, viewed_count: 3 },
      DEFAULT_CONFIG
    );
    // Only viewed bonus (not all opened)
    expect(bonus).toBe(5);
  });

  it('both bonuses (3+5=8) when all invitees opened AND viewed', () => {
    const bonus = computeMultiInviteBonus(
      { total_invites: 3, opened_count: 3, accounts_created_count: 3, viewed_count: 3 },
      DEFAULT_CONFIG
    );
    expect(bonus).toBe(8);
  });

  it('no bonus with zero invites', () => {
    const bonus = computeMultiInviteBonus(
      { total_invites: 0, opened_count: 0, accounts_created_count: 0, viewed_count: 0 },
      DEFAULT_CONFIG
    );
    expect(bonus).toBe(0);
  });
});


// ============================================================
// 7. Full Scoring: Integration Scenarios
// ============================================================

describe('Full Scoring: Integration', () => {
  it('perfect deal just sent = score 100', () => {
    const result = computePipelineScore(makeInput());
    expect(result.confidence_score).toBe(100);
    expect(result.confidence_percent).toBe(1);
    expect(result.weighted_monthly).toBe(500);
    expect(result.weighted_onetime).toBe(1000);
    expect(result.total_penalties).toBe(0);
  });

  it('perfect call, all milestones hit, no communication, 10 days later', () => {
    const result = computePipelineScore(
      makeInput({
        communications: NO_COMMS,
        now: daysFromNow(T0, 10), // 5 days past silence grace
      })
    );
    // Base: 100
    // Email: 0 (opened)
    // View: 0 (viewed)
    // Silence: 5 days past grace × 3/day = 15
    // Final: 100 - 15 = 85
    expect(result.confidence_score).toBe(85);
    expect(result.penalty_breakdown.silence).toBe(15);
    expect(result.weighted_monthly).toBe(425);
  });

  it('mediocre call, no milestones, 7 days after sent', () => {
    const result = computePipelineScore(
      makeInput({
        call_scores: MEDIOCRE_CALL,
        milestones: NO_MILESTONES,
        invite_stats: SINGLE_INVITE_NONE,
        communications: NO_COMMS,
        now: daysFromNow(T0, 7),
      })
    );
    // Base: 54.25
    // Email: (7 days = 168h, grace = 24h, 144h past = 6 days) × 2.5 = 15
    // View: 0 (no email opened yet, so this penalty doesn't apply)
    // Silence: 2 days past grace × 3/day = 6
    // Final: 54.25 - 15 - 6 = 33.25 → rounded = 33
    expect(result.base_score).toBe(54);
    expect(result.penalty_breakdown.email_not_opened).toBe(15);
    expect(result.penalty_breakdown.proposal_not_viewed).toBe(0); // correctly skipped
    expect(result.penalty_breakdown.silence).toBe(6);
    expect(result.confidence_score).toBe(33);
  });

  it('terrible call, nothing happening, 14 days = very low score', () => {
    const result = computePipelineScore(
      makeInput({
        call_scores: TERRIBLE_CALL,
        milestones: NO_MILESTONES,
        invite_stats: SINGLE_INVITE_NONE,
        communications: NO_COMMS,
        now: daysFromNow(T0, 14),
      })
    );
    // Base: 6.75
    // Email: (14 days = 336h, grace=24h, 312h past = 13 days) × 2.5 = 32.5
    // View: 0 (email not opened)
    // Silence: 9 days past grace × 3/day = 27
    // Raw: 6.75 - 32.5 - 27 = -52.75 → clamped to 0
    expect(result.confidence_score).toBe(0);
    expect(result.weighted_monthly).toBe(0);
    expect(result.weighted_onetime).toBe(0);
  });

  it('no call scores uses default base score of 50', () => {
    const result = computePipelineScore(
      makeInput({
        call_scores: null,
        now: hoursFromNow(T0, 1),
      })
    );
    // Base: 50 (default), no penalties (just sent 1 hour ago)
    expect(result.base_score).toBe(50);
    expect(result.confidence_score).toBe(50);
    expect(result.weighted_monthly).toBe(250);
  });

  it('multi-invite bonus offsets penalties', () => {
    const result = computePipelineScore(
      makeInput({
        invite_stats: {
          total_invites: 3,
          opened_count: 3,
          accounts_created_count: 3,
          viewed_count: 3,
        },
        communications: NO_COMMS,
        now: daysFromNow(T0, 10), // silence penalty applies
      })
    );
    // Base: 100
    // Silence: 5 days past grace × 3 = 15
    // Bonus: 3 (all opened) + 5 (all viewed) = 8
    // Final: 100 - 15 + 8 = 93
    expect(result.confidence_score).toBe(93);
    expect(result.total_bonus).toBe(8);
    expect(result.penalty_breakdown.multi_invite_bonus).toBe(8);
  });

  it('email opened but proposal not viewed, 5 days after email open', () => {
    const emailOpenedAt = hoursFromNow(T0, 12);
    const result = computePipelineScore(
      makeInput({
        milestones: {
          first_email_opened_at: emailOpenedAt,
          first_account_created_at: null,
          first_proposal_viewed_at: null,
        },
        invite_stats: { total_invites: 1, opened_count: 1, accounts_created_count: 0, viewed_count: 0 },
        communications: { last_prospect_contact_at: emailOpenedAt, last_team_contact_at: null, followup_count_since_last_reply: 0 },
        now: daysFromNow(emailOpenedAt, 5),
      })
    );
    // Base: 100
    // Email: 0 (opened)
    // View: (5 days = 120h, grace = 48h, 72h past = 3 days) × 2 = 6
    // Silence: from last contact (emailOpenedAt), 5 days since, so 0 (at grace boundary)
    expect(result.penalty_breakdown.email_not_opened).toBe(0);
    expect(result.penalty_breakdown.proposal_not_viewed).toBe(6);
  });

  it('accelerated silence: 3 follow-ups no reply, 15 days after sent', () => {
    const result = computePipelineScore(
      makeInput({
        communications: {
          last_prospect_contact_at: null,
          last_team_contact_at: daysFromNow(T0, 12),
          followup_count_since_last_reply: 3,
        },
        now: daysFromNow(T0, 15),
      })
    );
    // Base: 100
    // Email: 0 (opened)
    // View: 0 (viewed)
    // Silence: 10 days past grace × (3 × 1.5 = 4.5/day) = 45
    // Final: 100 - 45 = 55
    expect(result.penalty_breakdown.silence).toBe(45);
    expect(result.confidence_score).toBe(55);
  });

  it('weighted values scale linearly with confidence', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ predicted_monthly: 1000, predicted_onetime: 2000 }),
        communications: NO_COMMS,
        now: daysFromNow(T0, 10),
      })
    );
    // Score 85 → 0.85
    expect(result.confidence_percent).toBe(0.85);
    expect(result.weighted_monthly).toBe(850);
    expect(result.weighted_onetime).toBe(1700);
  });
});


// ============================================================
// 8. Status-Specific Behavior
// ============================================================

describe('Status Handling', () => {
  it('closed_lost = immediate zero regardless of call scores', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ status: 'closed_lost' }),
      })
    );
    expect(result.confidence_score).toBe(0);
    expect(result.confidence_percent).toBe(0);
    expect(result.weighted_monthly).toBe(0);
    expect(result.weighted_onetime).toBe(0);
    expect(result.base_score).toBe(0);
  });

  it('accepted = 100% confidence (deal is won)', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ status: 'accepted' }),
      })
    );
    expect(result.confidence_score).toBe(100);
    expect(result.confidence_percent).toBe(1);
    expect(result.weighted_monthly).toBe(500);
    expect(result.weighted_onetime).toBe(1000);
  });

  it('draft = base score only, no penalties', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ status: 'draft', sent_at: null }),
        milestones: NO_MILESTONES,
        invite_stats: SINGLE_INVITE_NONE,
        communications: NO_COMMS,
        now: daysFromNow(T0, 30),
      })
    );
    // Perfect call = 100 base, no penalties
    expect(result.confidence_score).toBe(100);
    expect(result.total_penalties).toBe(0);
  });

  it('draft with no call scores = default base score', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ status: 'draft', sent_at: null }),
        call_scores: null,
        now: T0,
      })
    );
    expect(result.confidence_score).toBe(50);
    expect(result.base_score).toBe(50);
  });

  it('declined still accumulates penalties (deal is alive but risky)', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ status: 'declined' }),
        milestones: NO_MILESTONES,
        invite_stats: SINGLE_INVITE_NONE,
        communications: NO_COMMS,
        now: daysFromNow(T0, 14),
      })
    );
    // Declined deals still go through penalty logic
    expect(result.total_penalties).toBeGreaterThan(0);
    expect(result.confidence_score).toBeLessThan(100);
  });
});


// ============================================================
// 9. Edge Cases
// ============================================================

describe('Edge Cases', () => {
  it('score never goes below 0', () => {
    const result = computePipelineScore(
      makeInput({
        call_scores: TERRIBLE_CALL,
        milestones: NO_MILESTONES,
        invite_stats: SINGLE_INVITE_NONE,
        communications: {
          last_prospect_contact_at: null,
          last_team_contact_at: daysFromNow(T0, 50),
          followup_count_since_last_reply: 10,
        },
        now: daysFromNow(T0, 90),
      })
    );
    expect(result.confidence_score).toBe(0);
    expect(result.confidence_percent).toBe(0);
    expect(result.weighted_monthly).toBe(0);
    expect(result.weighted_onetime).toBe(0);
  });

  it('score never exceeds 100 even with huge bonus', () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      multi_invite_bonus: {
        all_opened_bonus: 50,
        all_viewed_bonus: 50,
      },
    };
    const result = computePipelineScore(
      makeInput({
        config: customConfig,
        invite_stats: {
          total_invites: 3,
          opened_count: 3,
          accounts_created_count: 3,
          viewed_count: 3,
        },
      })
    );
    // Base 100 + 100 bonus = 200, clamped to 100
    expect(result.confidence_score).toBe(100);
  });

  it('zero predicted pricing = zero weighted values regardless of score', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ predicted_monthly: 0, predicted_onetime: 0 }),
      })
    );
    expect(result.confidence_score).toBe(100);
    expect(result.weighted_monthly).toBe(0);
    expect(result.weighted_onetime).toBe(0);
  });

  it('handles future email_opened_at (time skew)', () => {
    const result = computePipelineScore(
      makeInput({
        milestones: {
          first_email_opened_at: daysFromNow(T0, 30), // opened "in the future"
          first_account_created_at: null,
          first_proposal_viewed_at: null,
        },
        now: hoursFromNow(T0, 1),
      })
    );
    // Should still count as "opened" — no email penalty
    expect(result.penalty_breakdown.email_not_opened).toBe(0);
  });

  it('all three penalties stack but respect individual caps', () => {
    // Set up a deal where all three penalties are maxed
    const emailOpenedAt = hoursFromNow(T0, 36); // opened after 36h
    const result = computePipelineScore(
      makeInput({
        milestones: {
          first_email_opened_at: emailOpenedAt,
          first_account_created_at: null,
          first_proposal_viewed_at: null,
        },
        invite_stats: { total_invites: 1, opened_count: 1, accounts_created_count: 0, viewed_count: 0 },
        communications: NO_COMMS,
        now: daysFromNow(T0, 60), // 60 days later
      })
    );
    // Email: 0 (was opened)
    // View: capped at 25
    // Silence: capped at 80
    // Total penalties should be 25 + 80 = 105
    expect(result.penalty_breakdown.email_not_opened).toBe(0);
    expect(result.penalty_breakdown.proposal_not_viewed).toBe(25);
    expect(result.penalty_breakdown.silence).toBe(80);
    expect(result.total_penalties).toBe(105);
    // Base 100 - 105 = -5, clamped to 0
    expect(result.confidence_score).toBe(0);
  });

  it('large deal: $5000/mo, $25000 one-time, 72% confidence', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ predicted_monthly: 5000, predicted_onetime: 25000 }),
        communications: NO_COMMS,
        now: daysFromNow(T0, 14), // silence penalty: 9 days past grace × 3 = 27
        // but email and view are fine (all milestones hit)
      })
    );
    // Base 100, silence 27, no other penalties → 73
    expect(result.confidence_score).toBe(73);
    expect(result.weighted_monthly).toBe(3650); // 5000 × 0.73
    expect(result.weighted_onetime).toBe(18250); // 25000 × 0.73
  });
});


// ============================================================
// 10. Custom Configuration
// ============================================================

describe('Custom Configuration', () => {
  it('respects custom call weights', () => {
    const customConfig: ScoringConfig = {
      ...DEFAULT_CONFIG,
      call_weights: {
        budget_clarity: 50,
        competition: 0,
        engagement: 50,
        plan_fit: 0,
      },
    };
    const score = computeBaseScore(PERFECT_CALL, customConfig);
    // clear(1.0×50) + none(1.0×0) + high(1.0×50) + strong(1.0×0) = 100
    expect(score).toBe(100);

    const score2 = computeBaseScore(
      { ...PERFECT_CALL, budget_clarity: 'vague' },
      customConfig
    );
    // vague(0.5×50) + none(1.0×0) + high(1.0×50) + strong(1.0×0) = 75
    expect(score2).toBe(75);
  });

  it('respects custom penalty config', () => {
    const customConfig: ScoringConfig = {
      ...DEFAULT_CONFIG,
      penalties: {
        ...DEFAULT_CONFIG.penalties,
        email_not_opened: {
          grace_period_hours: 48,
          daily_penalty: 5,
          max_penalty: 50,
        },
      },
    };
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      customConfig.penalties.email_not_opened,
      hoursFromNow(T0, 72) // 24h past custom 48h grace
    );
    // 1 day × 5/day = 5
    expect(penalty).toBe(5);
  });

  it('respects custom default base score', () => {
    const customConfig: ScoringConfig = {
      ...DEFAULT_CONFIG,
      default_base_score: 75,
    };
    const result = computePipelineScore(
      makeInput({
        call_scores: null,
        config: customConfig,
        now: hoursFromNow(T0, 1),
      })
    );
    expect(result.base_score).toBe(75);
    expect(result.confidence_score).toBe(75);
  });
});


// ============================================================
// 11. Penalty Breakdown Reporting
// ============================================================

describe('Penalty Breakdown', () => {
  it('includes all penalty categories in breakdown', () => {
    const result = computePipelineScore(makeInput());
    expect(result.penalty_breakdown).toHaveProperty('email_not_opened');
    expect(result.penalty_breakdown).toHaveProperty('proposal_not_viewed');
    expect(result.penalty_breakdown).toHaveProperty('silence');
    expect(result.penalty_breakdown).toHaveProperty('multi_invite_bonus');
  });

  it('breakdown sums match total_penalties', () => {
    const result = computePipelineScore(
      makeInput({
        milestones: NO_MILESTONES,
        invite_stats: SINGLE_INVITE_NONE,
        communications: NO_COMMS,
        now: daysFromNow(T0, 10),
      })
    );
    const { email_not_opened, proposal_not_viewed, silence } =
      result.penalty_breakdown;
    expect(result.total_penalties).toBeCloseTo(
      email_not_opened + proposal_not_viewed + silence,
      2
    );
  });

  it('score = base - penalties + bonus (verified)', () => {
    const result = computePipelineScore(
      makeInput({
        call_scores: MEDIOCRE_CALL,
        invite_stats: {
          total_invites: 3,
          opened_count: 3,
          accounts_created_count: 3,
          viewed_count: 3,
        },
        communications: NO_COMMS,
        now: daysFromNow(T0, 10),
      })
    );
    const expected = clamp(
      result.base_score - result.total_penalties + result.total_bonus,
      0,
      100
    );
    expect(result.confidence_score).toBe(Math.round(expected));
  });
});

// Local helper re-export for test use
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
