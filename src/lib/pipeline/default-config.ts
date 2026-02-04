// ============================================================
// Default Scoring Config (mirrors the settings table seed)
// ============================================================

import type { ScoringConfig } from './types';

export const DEFAULT_CONFIG: ScoringConfig = {
  call_weights: {
    budget_clarity: 25,
    competition: 20,
    engagement: 25,
    plan_fit: 30,
  },
  call_score_mappings: {
    budget_clarity: {
      clear: 1.0,
      vague: 0.5,
      none: 0.2,
      no_budget: 0,
    },
    competition: {
      none: 1.0,
      some: 0.5,
      many: 0.15,
    },
    engagement: {
      high: 1.0,
      medium: 0.55,
      low: 0.15,
    },
    plan_fit: {
      strong: 1.0,
      medium: 0.6,
      weak: 0.25,
      poor: 0,
    },
  },
  penalties: {
    email_not_opened: {
      grace_period_hours: 24,
      daily_penalty: 2.5,
      max_penalty: 35,
    },
    proposal_not_viewed: {
      grace_period_hours: 48,
      daily_penalty: 2,
      max_penalty: 25,
    },
    silence: {
      grace_period_days: 5,
      daily_penalty: 3,
      max_penalty: 80,
      followup_acceleration_threshold: 2,
      followup_acceleration_multiplier: 1.5,
    },
  },
  multi_invite_bonus: {
    all_opened_bonus: 3,
    all_viewed_bonus: 5,
  },
  default_base_score: 50,
};
