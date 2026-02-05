// ============================================================
// Default Scoring Config (mirrors the settings table seed)
// ============================================================
//
// Updated 2026-02-04: Less aggressive scoring
// - Bumped medium call score mappings (engagement 0.55→0.70, plan_fit 0.60→0.65)
// - Slower penalty degradation (~60 days to zero instead of ~12 days)
// - Longer grace periods before penalties start
//
// To update the live database config, run the SQL in:
// supabase/migrations/20260204200000_update_scoring_config.sql
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
      medium: 0.70,  // was 0.55
      low: 0.15,
    },
    plan_fit: {
      strong: 1.0,
      medium: 0.65,  // was 0.60
      weak: 0.25,
      poor: 0,
    },
  },
  penalties: {
    email_not_opened: {
      grace_period_hours: 48,    // was 24
      daily_penalty: 0.5,        // was 2.5
      max_penalty: 25,           // was 35
    },
    proposal_not_viewed: {
      grace_period_hours: 120,   // was 48 (now 5 days)
      daily_penalty: 0.5,        // was 2
      max_penalty: 20,           // was 25
    },
    silence: {
      grace_period_days: 10,     // was 5
      daily_penalty: 1.2,        // was 3
      max_penalty: 60,           // was 80
      followup_acceleration_threshold: 3,  // was 2
      followup_acceleration_multiplier: 1.5,
    },
  },
  multi_invite_bonus: {
    all_opened_bonus: 3,
    all_viewed_bonus: 5,
  },
  default_base_score: 50,
};
