// ============================================================
// Pipeline Scoring: Type Definitions
// ============================================================

// --- Call Score Inputs (rep's subjective assessment) ---

export type BudgetClarity = 'clear' | 'vague' | 'none' | 'no_budget';
export type Competition = 'none' | 'some' | 'many';
export type Engagement = 'high' | 'medium' | 'low';
export type PlanFit = 'strong' | 'medium' | 'weak' | 'poor';

export interface CallScoreInputs {
  budget_clarity: BudgetClarity;
  competition: Competition;
  engagement: Engagement;
  plan_fit: PlanFit;
}

// --- Deal State (assembled from database) ---

export type DealStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'closed_lost';

export interface InviteMilestones {
  /** Earliest email_opened_at across all invites for this recommendation */
  first_email_opened_at: string | null;
  /** Earliest account_created_at across all invites */
  first_account_created_at: string | null;
  /** Earliest viewed_at across all invites (recommendation page viewed) */
  first_proposal_viewed_at: string | null;
}

export interface InviteStats {
  /** Total invites sent for this recommendation */
  total_invites: number;
  /** How many invitees opened the email */
  opened_count: number;
  /** How many invitees created an account */
  accounts_created_count: number;
  /** How many invitees viewed the recommendation page */
  viewed_count: number;
}

export interface CommunicationData {
  /** Most recent inbound (from prospect) contact timestamp */
  last_prospect_contact_at: string | null;
  /** Most recent outbound (from your team) contact timestamp */
  last_team_contact_at: string | null;
  /** Number of outbound follow-ups since last inbound response */
  followup_count_since_last_reply: number;
}

export interface DealData {
  status: DealStatus;
  /** When the recommendation was sent (recommendations.sent_at) */
  sent_at: string | null;
  /** Predicted tier pricing (cached on recommendations) */
  predicted_monthly: number;
  predicted_onetime: number;
  /** When snoozed, penalties are frozen until this date. After expiry, penalties calculate from this date. */
  snoozed_until?: string | null;
  /** When set after revival from archive, used as the new baseline date for time-based penalty calculations. */
  revived_at?: string | null;
}

// --- Scoring Configuration (from settings table) ---

export interface CallWeights {
  budget_clarity: number;
  competition: number;
  engagement: number;
  plan_fit: number;
}

export interface CallScoreMappings {
  budget_clarity: Record<BudgetClarity, number>;
  competition: Record<Competition, number>;
  engagement: Record<Engagement, number>;
  plan_fit: Record<PlanFit, number>;
}

export interface PenaltyConfig {
  /** Hours/days before penalty starts accumulating */
  grace_period_hours?: number;
  grace_period_days?: number;
  /** Points deducted per day after grace period */
  daily_penalty: number;
  /** Maximum total penalty from this category */
  max_penalty: number;
  /** How many follow-ups before acceleration kicks in (silence only) */
  followup_acceleration_threshold?: number;
  /** Multiplier for daily_penalty after threshold reached (silence only) */
  followup_acceleration_multiplier?: number;
}

export interface MultiInviteBonus {
  /** Bonus points if all invitees opened email */
  all_opened_bonus: number;
  /** Bonus points if all invitees viewed proposal */
  all_viewed_bonus: number;
}

export interface ScoringConfig {
  call_weights: CallWeights;
  call_score_mappings: CallScoreMappings;
  penalties: {
    email_not_opened: PenaltyConfig;
    proposal_not_viewed: PenaltyConfig;
    silence: PenaltyConfig;
  };
  multi_invite_bonus: MultiInviteBonus;
  /** Score used when no call scores have been entered yet */
  default_base_score: number;
}

// --- Scoring Function Input (everything assembled) ---

export interface ScoringInput {
  deal: DealData;
  /** null if rep hasn't filled out the call scoring form yet */
  call_scores: CallScoreInputs | null;
  milestones: InviteMilestones;
  invite_stats: InviteStats;
  communications: CommunicationData;
  config: ScoringConfig;
  /** Current timestamp — passed in for deterministic testing */
  now: string;
}

// --- Scoring Function Output ---

export interface PenaltyBreakdown {
  email_not_opened: number;
  proposal_not_viewed: number;
  silence: number;
  /** Bonus applied (negative number = points added back) */
  multi_invite_bonus: number;
}

export interface ScoringResult {
  /** Raw confidence score 0-100 */
  confidence_score: number;
  /** Derived: confidence_score / 100 */
  confidence_percent: number;
  /** predicted_monthly × confidence_percent */
  weighted_monthly: number;
  /** predicted_onetime × confidence_percent */
  weighted_onetime: number;
  /** The base score before penalties (from call factors or default) */
  base_score: number;
  /** Total penalty points applied */
  total_penalties: number;
  /** Total bonus points applied */
  total_bonus: number;
  /** Individual penalty/bonus amounts for debugging and UI */
  penalty_breakdown: PenaltyBreakdown;
}

// --- Pipeline Rep (from pipeline_reps view) ---

export interface PipelineRep {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
}
