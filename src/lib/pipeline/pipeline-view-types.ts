// ============================================================
// Pipeline Dashboard: View Types
// ============================================================

// --- Archive Reason Enum ---

export type ArchiveReason =
  | 'went_dark'
  | 'budget'
  | 'timing'
  | 'chose_competitor'
  | 'handling_in_house'
  | 'not_a_fit'
  | 'key_contact_left'
  | 'business_closed'
  | 'duplicate'
  | 'other';

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  went_dark: 'Went Dark',
  budget: 'Budget',
  timing: 'Timing',
  chose_competitor: 'Chose Competitor',
  handling_in_house: 'In-House',
  not_a_fit: 'Not a Fit',
  key_contact_left: 'Contact Left',
  business_closed: 'Business Closed',
  duplicate: 'Duplicate',
  other: 'Other',
};

export const ARCHIVE_REASON_OPTIONS: Array<{ value: ArchiveReason; label: string; description: string }> = [
  { value: 'went_dark', label: 'Went Dark', description: 'Stopped responding' },
  { value: 'budget', label: 'Budget', description: "Can't afford it or budget cut" },
  { value: 'timing', label: 'Timing', description: 'Not now, no specific date' },
  { value: 'chose_competitor', label: 'Chose Competitor', description: 'Went with another vendor' },
  { value: 'handling_in_house', label: 'Handling In-House', description: 'Doing it internally' },
  { value: 'not_a_fit', label: 'Not a Fit', description: "Services don't match needs" },
  { value: 'key_contact_left', label: 'Key Contact Left', description: 'Champion left or changed roles' },
  { value: 'business_closed', label: 'Business Closed/Changed', description: 'Shut down or pivoted' },
  { value: 'duplicate', label: 'Duplicate', description: 'Already exists elsewhere' },
  { value: 'other', label: 'Other', description: 'Specify in notes' },
];

// --- Pipeline Deal (single row in the pipeline table) ---

export interface PipelineDeal {
  id: string;
  client_name: string;
  client_id: string;
  client_email: string | null;
  client_avatar_color: string | null;
  rep_full_name: string | null;
  rep_avatar_url: string | null;
  rep_id: string | null;
  status: string;
  sent_at: string | null;
  predicted_tier: 'good' | 'better' | 'best' | null;
  predicted_monthly: number;
  predicted_onetime: number;
  // Tier pricing totals
  good_monthly: number | null;
  better_monthly: number | null;
  best_monthly: number | null;
  confidence_score: number | null;
  confidence_percent: number | null;
  weighted_monthly: number | null;
  weighted_onetime: number | null;
  last_scored_at: string | null;
  last_communication_at: string | null;
  last_inbound_at: string | null;
  age_days: number | null;
  created_at: string;
  // Score breakdown details
  base_score: number | null;
  total_penalties: number | null;
  total_bonus: number | null;
  penalty_email_not_opened: number | null;
  penalty_proposal_not_viewed: number | null;
  penalty_silence: number | null;
  // Call score factors
  call_budget_clarity: 'clear' | 'vague' | 'none' | 'no_budget' | null;
  call_competition: 'none' | 'some' | 'many' | null;
  call_engagement: 'high' | 'medium' | 'low' | null;
  call_plan_fit: 'strong' | 'medium' | 'weak' | 'poor' | null;
  // Milestones
  first_email_opened_at: string | null;
  first_account_created_at: string | null;
  first_proposal_viewed_at: string | null;
  // Communication stats
  followup_count_since_last_reply: number;
  // Snooze status
  snoozed_until: string | null;
  snooze_reason: string | null;
  // Archive status
  archived_at: string | null;
  archive_reason: ArchiveReason | null;
  archive_notes: string | null;
  revived_at: string | null;
}

// --- Pipeline Aggregates (summary stats) ---

export interface PipelineAggregates {
  /** Sum of weighted_monthly for all filtered deals */
  total_weighted_mrr: number;
  /** Sum of predicted_monthly (before confidence weighting) */
  total_raw_mrr: number;
  /** Sum of weighted_onetime for all filtered deals */
  total_weighted_onetime: number;
  /** Sum of predicted_onetime */
  total_raw_onetime: number;
  /** Number of active deals */
  deal_count: number;
  /** Average confidence score across all deals */
  avg_confidence: number;
  /** weighted MRR / raw MRR as percentage (0-100) */
  pipeline_confidence_pct: number;
}

// --- Pipeline Filters ---

export interface PipelineFilters {
  /** Filter by sales rep ID */
  rep_id?: string;
  /** Filter by predicted tier */
  predicted_tier?: 'good' | 'better' | 'best';
  /** Filter by sent_at >= this date */
  sent_after?: string;
  /** Filter by sent_at <= this date */
  sent_before?: string;
  /** Filter by archived status: 'active' (default), 'archived', or 'all' */
  archived?: 'active' | 'archived' | 'all';
}

// --- Pipeline Rep (from pipeline_reps view) ---

export interface PipelineRep {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
}

// --- API Response ---

export interface PipelineDataResponse {
  deals: PipelineDeal[];
  aggregates: PipelineAggregates;
  reps: PipelineRep[];
}

// --- Deal Detail (expanded view) ---

export interface DealScoreBreakdown {
  base_score: number;
  email_not_opened_penalty: number;
  proposal_not_viewed_penalty: number;
  silence_penalty: number;
  multi_invite_bonus: number;
  total_penalties: number;
  final_score: number;
}

export interface CallScoreFactors {
  budget_clarity: 'clear' | 'vague' | 'none' | 'no_budget' | null;
  competition: 'none' | 'some' | 'many' | null;
  engagement: 'high' | 'medium' | 'low' | null;
  plan_fit: 'strong' | 'medium' | 'weak' | 'poor' | null;
}

export interface InviteMilestoneStatus {
  invite_id: string;
  email: string;
  sent_at: string | null;
  email_opened_at: string | null;
  account_created_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
}

export interface CommunicationEntry {
  id: string;
  direction: 'inbound' | 'outbound';
  channel: 'email' | 'sms' | 'chat' | 'call' | 'other';
  contact_at: string;
  notes: string | null;
}

export interface DealDetail {
  deal: PipelineDeal;
  score_breakdown: DealScoreBreakdown | null;
  call_scores: CallScoreFactors | null;
  invites: InviteMilestoneStatus[];
  recent_communications: CommunicationEntry[];
}

// --- Archive Analytics ---

export interface ReasonBreakdown {
  reason: ArchiveReason;
  count: number;
  mrr_lost: number;
  onetime_lost: number;
  percentage: number;
}

export interface ArchiveAnalytics {
  total_archived: number;
  lost_mrr: number;
  lost_onetime: number;
  avg_days_to_archive: number;
  top_reason: ArchiveReason | null;
  top_reason_percentage: number;
  reasons_breakdown: ReasonBreakdown[];
}

export const ARCHIVE_REASON_COLORS: Record<ArchiveReason, string> = {
  went_dark: '#64748B',     // slate
  budget: '#DC2626',        // red
  timing: '#D97706',        // amber
  chose_competitor: '#EA580C', // orange
  handling_in_house: '#2563EB', // blue
  not_a_fit: '#7C3AED',     // purple
  key_contact_left: '#DB2777', // pink
  business_closed: '#374151', // dark gray
  duplicate: '#9CA3AF',     // light gray
  other: '#0D9488',         // teal
};
