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
} from '../scoring-engine';
import { DEFAULT_CONFIG } from '../default-config';
import type {
  ScoringInput,
  CallScoreInputs,
  InviteMilestones,
  InviteStats,
  CommunicationData,
  DealData,
  ScoringConfig,
} from '../types';

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
    // vague(0.5×25) + some(0.5×20) + medium(0.70×25) + medium(0.65×30)
    // = 12.5 + 10 + 17.5 + 19.5 = 59.5
    expect(score).toBeCloseTo(59.5, 2);
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

  it('no penalty within 48-hour grace period', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      hoursFromNow(T0, 47) // 47 hours after sent
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

  it('penalty starts after 48 hours', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      hoursFromNow(T0, 72) // 72 hours after sent = 1 day past grace
    );
    // 1 day past grace × 0.5/day = 0.5
    expect(penalty).toBe(0.5);
  });

  it('accumulates daily', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      daysFromNow(T0, 12) // 12 days after sent = 10 days past grace
    );
    // 10 days past grace × 0.5/day = 5
    expect(penalty).toBe(5);
  });

  it('caps at max_penalty (25)', () => {
    const penalty = computeEmailNotOpenedPenalty(
      T0,
      NO_MILESTONES,
      penaltyConfig,
      daysFromNow(T0, 100) // 100 days — way past max
    );
    expect(penalty).toBe(25);
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
      hoursFromNow(T0, 48) // exactly at 48h boundary
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

  it('no penalty within 120-hour (5-day) grace period after email open', () => {
    const emailOpenedAt = hoursFromNow(T0, 12);
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: emailOpenedAt,
        first_account_created_at: null,
        first_proposal_viewed_at: null,
      },
      penaltyConfig,
      hoursFromNow(emailOpenedAt, 119) // within 120h grace
    );
    expect(penalty).toBe(0);
  });

  it('penalty starts after 120 hours (5 days) post email open', () => {
    const emailOpenedAt = hoursFromNow(T0, 12);
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: emailOpenedAt,
        first_account_created_at: null,
        first_proposal_viewed_at: null,
      },
      penaltyConfig,
      hoursFromNow(emailOpenedAt, 144) // 24h past 120h grace = 1 day
    );
    // 1 day past grace × 0.5/day = 0.5
    expect(penalty).toBe(0.5);
  });

  it('caps at max_penalty (20)', () => {
    const emailOpenedAt = hoursFromNow(T0, 12);
    const penalty = computeProposalNotViewedPenalty(
      {
        first_email_opened_at: emailOpenedAt,
        first_account_created_at: null,
        first_proposal_viewed_at: null,
      },
      penaltyConfig,
      daysFromNow(emailOpenedAt, 100) // way past max
    );
    expect(penalty).toBe(20);
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
      hoursFromNow(accountCreatedAt, 144) // 24h past 120h grace
    );
    // 1 day past grace × 0.5/day = 0.5
    expect(penalty).toBe(0.5);
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
      hoursFromNow(emailOpenedAt, 144) // 24h past 120h grace from EARLIER anchor
    );
    // Should use emailOpenedAt as anchor (earlier)
    // 1 day past grace × 0.5/day = 0.5
    expect(penalty).toBe(0.5);
  });
});


// ============================================================
// 5. Silence / Inactivity Penalty
// ============================================================

describe('Penalty: Silence [SILENCE]', () => {
  const penaltyConfig = DEFAULT_CONFIG.penalties.silence;

  it('no penalty within 10-day grace period', () => {
    const penalty = computeSilencePenalty(
      T0,
      NO_COMMS,
      penaltyConfig,
      daysFromNow(T0, 9)
    );
    expect(penalty).toBe(0);
  });

  it('penalty starts after 10-day grace period', () => {
    const penalty = computeSilencePenalty(
      T0,
      NO_COMMS,
      penaltyConfig,
      daysFromNow(T0, 15) // 5 days past grace
    );
    // 5 days × 1.2/day = 6
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
      daysFromNow(lastContact, 8) // 8 days since last contact, within 10-day grace
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
      daysFromNow(lastContact, 15) // 5 days past grace
    );
    // 5 days × 1.2/day = 6
    expect(penalty).toBe(6);
  });

  it('caps at max_penalty (60)', () => {
    const penalty = computeSilencePenalty(
      T0,
      NO_COMMS,
      penaltyConfig,
      daysFromNow(T0, 100) // extreme silence
    );
    expect(penalty).toBe(60);
  });

  it('accelerates penalty after 3+ follow-ups with no reply', () => {
    const penalty = computeSilencePenalty(
      T0,
      {
        last_prospect_contact_at: null,
        last_team_contact_at: daysFromNow(T0, 8),
        followup_count_since_last_reply: 4, // past threshold of 3
      },
      penaltyConfig,
      daysFromNow(T0, 20) // 10 days past grace
    );
    // 10 days × (1.2 × 1.5 = 1.8/day) = 18
    expect(penalty).toBe(18);
  });

  it('does not accelerate below follow-up threshold', () => {
    const penalty = computeSilencePenalty(
      T0,
      {
        last_prospect_contact_at: null,
        last_team_contact_at: daysFromNow(T0, 8),
        followup_count_since_last_reply: 2, // below threshold of 3
      },
      penaltyConfig,
      daysFromNow(T0, 20) // 10 days past grace
    );
    // 10 days × 1.2/day = 12 (no acceleration)
    expect(penalty).toBe(12);
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

  it('perfect call, all milestones hit, no communication, 20 days later', () => {
    const result = computePipelineScore(
      makeInput({
        communications: NO_COMMS,
        now: daysFromNow(T0, 20), // 10 days past silence grace
      })
    );
    // Base: 100
    // Email: 0 (opened)
    // View: 0 (viewed)
    // Silence: 10 days past grace × 1.2/day = 12
    // Final: 100 - 12 = 88
    expect(result.confidence_score).toBe(88);
    expect(result.penalty_breakdown.silence).toBe(12);
    expect(result.weighted_monthly).toBe(440);
  });

  it('mediocre call, no milestones, 14 days after sent', () => {
    const result = computePipelineScore(
      makeInput({
        call_scores: MEDIOCRE_CALL,
        milestones: NO_MILESTONES,
        invite_stats: SINGLE_INVITE_NONE,
        communications: NO_COMMS,
        now: daysFromNow(T0, 14),
      })
    );
    // Base: 59.5 → 60 rounded
    // Email: (14 days = 336h, grace = 48h, 288h past = 12 days) × 0.5 = 6
    // View: 0 (no email opened yet, so this penalty doesn't apply)
    // Silence: 4 days past 10-day grace × 1.2/day = 4.8
    // Final: 59.5 - 6 - 4.8 = 48.7 → rounded = 49
    expect(result.base_score).toBe(60);
    expect(result.penalty_breakdown.email_not_opened).toBe(6);
    expect(result.penalty_breakdown.proposal_not_viewed).toBe(0); // correctly skipped
    expect(result.penalty_breakdown.silence).toBeCloseTo(4.8, 1);
    expect(result.confidence_score).toBe(49);
  });

  it('terrible call, nothing happening, 30 days = very low score', () => {
    const result = computePipelineScore(
      makeInput({
        call_scores: TERRIBLE_CALL,
        milestones: NO_MILESTONES,
        invite_stats: SINGLE_INVITE_NONE,
        communications: NO_COMMS,
        now: daysFromNow(T0, 30),
      })
    );
    // Base: 6.75
    // Email: (30 days = 720h, grace=48h, 672h = 28 days) × 0.5 = 14, but max 25
    // View: 0 (email not opened)
    // Silence: 20 days past 10-day grace × 1.2/day = 24
    // Raw: 6.75 - 14 - 24 = -31.25 → clamped to 0
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
        now: daysFromNow(T0, 20), // silence penalty applies (10 days past grace)
      })
    );
    // Base: 100
    // Silence: 10 days past grace × 1.2 = 12
    // Bonus: 3 (all opened) + 5 (all viewed) = 8
    // Final: 100 - 12 + 8 = 96
    expect(result.confidence_score).toBe(96);
    expect(result.total_bonus).toBe(8);
    expect(result.penalty_breakdown.multi_invite_bonus).toBe(8);
  });

  it('email opened but proposal not viewed, 10 days after email open', () => {
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
        now: daysFromNow(emailOpenedAt, 10),
      })
    );
    // Base: 100
    // Email: 0 (opened)
    // View: (10 days = 240h, grace = 120h, 120h past = 5 days) × 0.5 = 2.5
    // Silence: from last contact (emailOpenedAt), 10 days since, so 0 (at grace boundary)
    expect(result.penalty_breakdown.email_not_opened).toBe(0);
    expect(result.penalty_breakdown.proposal_not_viewed).toBe(2.5);
  });

  it('accelerated silence: 4 follow-ups no reply, 30 days after sent', () => {
    const result = computePipelineScore(
      makeInput({
        communications: {
          last_prospect_contact_at: null,
          last_team_contact_at: daysFromNow(T0, 20),
          followup_count_since_last_reply: 4,
        },
        now: daysFromNow(T0, 30),
      })
    );
    // Base: 100
    // Email: 0 (opened)
    // View: 0 (viewed)
    // Silence: 20 days past grace × (1.2 × 1.5 = 1.8/day) = 36
    // Final: 100 - 36 = 64
    expect(result.penalty_breakdown.silence).toBe(36);
    expect(result.confidence_score).toBe(64);
  });

  it('weighted values scale linearly with confidence', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ predicted_monthly: 1000, predicted_onetime: 2000 }),
        communications: NO_COMMS,
        now: daysFromNow(T0, 20), // 10 days past silence grace
      })
    );
    // Score 88 → 0.88
    expect(result.confidence_percent).toBe(0.88);
    expect(result.weighted_monthly).toBe(880);
    expect(result.weighted_onetime).toBe(1760);
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
    const emailOpenedAt = hoursFromNow(T0, 60); // opened after 60h (within 48h grace = no email penalty)
    const result = computePipelineScore(
      makeInput({
        milestones: {
          first_email_opened_at: emailOpenedAt,
          first_account_created_at: null,
          first_proposal_viewed_at: null,
        },
        invite_stats: { total_invites: 1, opened_count: 1, accounts_created_count: 0, viewed_count: 0 },
        communications: NO_COMMS,
        now: daysFromNow(T0, 100), // 100 days later
      })
    );
    // Email: 0 (was opened)
    // View: capped at 20
    // Silence: capped at 60
    // Total penalties should be 20 + 60 = 80
    expect(result.penalty_breakdown.email_not_opened).toBe(0);
    expect(result.penalty_breakdown.proposal_not_viewed).toBe(20);
    expect(result.penalty_breakdown.silence).toBe(60);
    expect(result.total_penalties).toBe(80);
    // Base 100 - 80 = 20
    expect(result.confidence_score).toBe(20);
  });

  it('large deal: $5000/mo, $25000 one-time at 76% confidence', () => {
    const result = computePipelineScore(
      makeInput({
        deal: makeDeal({ predicted_monthly: 5000, predicted_onetime: 25000 }),
        communications: NO_COMMS,
        now: daysFromNow(T0, 30), // silence penalty: 20 days past 10-day grace × 1.2 = 24
        // but email and view are fine (all milestones hit)
      })
    );
    // Base 100, silence 24, no other penalties → 76
    expect(result.confidence_score).toBe(76);
    expect(result.weighted_monthly).toBe(3800); // 5000 × 0.76
    expect(result.weighted_onetime).toBe(19000); // 25000 × 0.76
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
