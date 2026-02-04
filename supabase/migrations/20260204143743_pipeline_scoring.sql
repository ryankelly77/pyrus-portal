-- ============================================================
-- Pipeline Scoring: Confidence Score & Weighted Pipeline Values
-- Phase 1 Migration
-- ============================================================
-- 
-- This migration adds:
--   1. Expanded status constraint on recommendations (adds closed_lost)
--   2. Pipeline scoring columns on recommendations
--   3. Email/account tracking columns on recommendation_invites
--   4. New table: recommendation_call_scores (rep's post-call inputs)
--   5. New table: recommendation_communications (HighLevel sync + manual logs)
--   6. Indexes for pipeline queries
--   7. Default scoring configuration in settings
--   8. RLS policies for new tables
--   9. pipeline_reps view (encapsulates "who counts as a sales rep")
--
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================


-- ============================================================
-- 1. Expand recommendations.status to include closed_lost
-- ============================================================

ALTER TABLE public.recommendations 
  DROP CONSTRAINT IF EXISTS recommendations_status_check;

ALTER TABLE public.recommendations 
  ADD CONSTRAINT recommendations_status_check 
  CHECK (status = ANY (ARRAY[
    'draft'::text, 
    'sent'::text, 
    'accepted'::text, 
    'declined'::text, 
    'closed_lost'::text
  ]));


-- ============================================================
-- 2. Add pipeline scoring columns to recommendations
-- ============================================================

-- Which tier the rep predicts the prospect will choose
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS predicted_tier text 
    CHECK (predicted_tier = ANY (ARRAY['good'::text, 'better'::text, 'best'::text]));

-- Cached pricing for the predicted tier (snapshotted for consistent pipeline math)
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS predicted_monthly numeric DEFAULT 0;

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS predicted_onetime numeric DEFAULT 0;

-- Confidence score (0-100) and derived percent (0-1)
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS confidence_score integer;

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS confidence_percent numeric;

-- Weighted pipeline values (predicted price × confidence percent)
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS weighted_monthly numeric;

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS weighted_onetime numeric;

-- When the score was last computed (for debugging/audit)
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS last_scored_at timestamp with time zone;

-- NOTE: created_by on recommendations serves as the sales rep identifier.
-- No separate sales_rep_id column needed — anyone with user access
-- (sales rep, super admin, etc.) can create recommendations.

-- Closed lost tracking
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS closed_lost_at timestamp with time zone;

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS closed_lost_reason text;


-- ============================================================
-- 3. Add tracking columns to recommendation_invites
-- ============================================================
-- 
-- Existing columns and their meaning:
--   sent_at     → when the invite email was sent
--   viewed_at   → when the invitee first views the recommendation page (to be wired up)
--   responded_at → when the invitee accepts/declines
--
-- New columns:
--   email_opened_at    → when this invite's email was opened (tracking pixel/provider)
--   account_created_at → when this invitee created their portal account
--

ALTER TABLE public.recommendation_invites
  ADD COLUMN IF NOT EXISTS email_opened_at timestamp with time zone;

ALTER TABLE public.recommendation_invites
  ADD COLUMN IF NOT EXISTS account_created_at timestamp with time zone;


-- ============================================================
-- 4. Create recommendation_call_scores table
-- ============================================================
-- 
-- Stores the rep's subjective inputs from the sales call.
-- One record per recommendation (UNIQUE constraint).
-- We store the raw selection values, NOT computed points,
-- so scores can be recomputed if weights change.
--

CREATE TABLE IF NOT EXISTS public.recommendation_call_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL,
  
  -- The four call factors (standardized selections)
  budget_clarity text NOT NULL 
    CHECK (budget_clarity = ANY (ARRAY['clear'::text, 'vague'::text, 'none'::text, 'no_budget'::text])),
  competition text NOT NULL 
    CHECK (competition = ANY (ARRAY['none'::text, 'some'::text, 'many'::text])),
  engagement text NOT NULL 
    CHECK (engagement = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  plan_fit text NOT NULL 
    CHECK (plan_fit = ANY (ARRAY['strong'::text, 'medium'::text, 'weak'::text, 'poor'::text])),
  
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT recommendation_call_scores_pkey PRIMARY KEY (id),
  CONSTRAINT recommendation_call_scores_recommendation_id_key UNIQUE (recommendation_id),
  CONSTRAINT recommendation_call_scores_recommendation_id_fkey 
    FOREIGN KEY (recommendation_id) REFERENCES public.recommendations(id) ON DELETE CASCADE,
  CONSTRAINT recommendation_call_scores_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);


-- ============================================================
-- 5. Create recommendation_communications table
-- ============================================================
-- 
-- Logs communication events relevant to a deal/recommendation.
-- Populated from HighLevel webhooks, manual rep entries, or system events.
-- 
-- The scoring engine uses:
--   MAX(contact_at) WHERE direction = 'inbound'   → silence anchor
--   COUNT(*) WHERE direction = 'outbound' 
--     AND contact_at > last_inbound               → follow-up count
--

CREATE TABLE IF NOT EXISTS public.recommendation_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL,
  
  -- Who initiated: inbound = prospect, outbound = your team
  direction text NOT NULL 
    CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text])),
  
  -- Communication channel
  channel text NOT NULL 
    CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'chat'::text, 'call'::text, 'other'::text])),
  
  -- When the communication happened
  contact_at timestamp with time zone NOT NULL,
  
  -- How this record was created
  source text DEFAULT 'manual'::text 
    CHECK (source = ANY (ARRAY['highlevel_webhook'::text, 'manual'::text, 'system'::text])),
  
  -- External reference for deduplication
  highlevel_message_id text,
  
  -- Optional notes (for manual entries like "spoke on phone")
  notes text,
  
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT recommendation_communications_pkey PRIMARY KEY (id),
  CONSTRAINT recommendation_communications_recommendation_id_fkey 
    FOREIGN KEY (recommendation_id) REFERENCES public.recommendations(id) ON DELETE CASCADE
);


-- ============================================================
-- 6. Indexes for pipeline queries
-- ============================================================

-- Pipeline dashboard: all sent recommendations sorted by confidence
CREATE INDEX IF NOT EXISTS idx_recommendations_pipeline 
  ON public.recommendations (status, confidence_score DESC) 
  WHERE status = 'sent';

-- Filter pipeline by rep (created_by = the user who created/owns the deal)
CREATE INDEX IF NOT EXISTS idx_recommendations_created_by
  ON public.recommendations (created_by) 
  WHERE created_by IS NOT NULL;

-- Filter by predicted tier
CREATE INDEX IF NOT EXISTS idx_recommendations_predicted_tier 
  ON public.recommendations (predicted_tier) 
  WHERE predicted_tier IS NOT NULL;

-- Last scored: find stale scores for daily recalculation
CREATE INDEX IF NOT EXISTS idx_recommendations_last_scored 
  ON public.recommendations (last_scored_at) 
  WHERE status = 'sent';

-- Communications: find last inbound/outbound per recommendation
CREATE INDEX IF NOT EXISTS idx_rec_comms_recommendation_direction 
  ON public.recommendation_communications (recommendation_id, direction, contact_at DESC);

-- Communications: dedup HighLevel messages
CREATE INDEX IF NOT EXISTS idx_rec_comms_highlevel_id 
  ON public.recommendation_communications (highlevel_message_id) 
  WHERE highlevel_message_id IS NOT NULL;

-- Call scores: lookup by recommendation
CREATE INDEX IF NOT EXISTS idx_rec_call_scores_recommendation 
  ON public.recommendation_call_scores (recommendation_id);

-- Invites: find milestone timestamps across invites for a recommendation
CREATE INDEX IF NOT EXISTS idx_rec_invites_recommendation_milestones 
  ON public.recommendation_invites (recommendation_id, email_opened_at, account_created_at, viewed_at);


-- ============================================================
-- 7. Seed default pipeline scoring configuration
-- ============================================================

INSERT INTO public.settings (key, value)
VALUES (
  'pipeline_scoring_config',
  '{
    "call_weights": {
      "budget_clarity": 25,
      "competition": 20,
      "engagement": 25,
      "plan_fit": 30
    },
    "call_score_mappings": {
      "budget_clarity": {
        "clear": 1.0,
        "vague": 0.5,
        "none": 0.2,
        "no_budget": 0
      },
      "competition": {
        "none": 1.0,
        "some": 0.5,
        "many": 0.15
      },
      "engagement": {
        "high": 1.0,
        "medium": 0.55,
        "low": 0.15
      },
      "plan_fit": {
        "strong": 1.0,
        "medium": 0.6,
        "weak": 0.25,
        "poor": 0
      }
    },
    "penalties": {
      "email_not_opened": {
        "grace_period_hours": 24,
        "daily_penalty": 2.5,
        "max_penalty": 35
      },
      "proposal_not_viewed": {
        "grace_period_hours": 48,
        "daily_penalty": 2,
        "max_penalty": 25
      },
      "silence": {
        "grace_period_days": 5,
        "daily_penalty": 3,
        "max_penalty": 80,
        "followup_acceleration_threshold": 2,
        "followup_acceleration_multiplier": 1.5
      }
    },
    "multi_invite_bonus": {
      "all_opened_bonus": 3,
      "all_viewed_bonus": 5
    },
    "default_base_score": 50
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE 
  SET value = EXCLUDED.value, updated_at = now();


-- ============================================================
-- 8. RLS policies for new tables
-- ============================================================

ALTER TABLE public.recommendation_call_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_communications ENABLE ROW LEVEL SECURITY;

-- Admins/super_admins: full access to call scores
CREATE POLICY "Admins can manage call scores" 
  ON public.recommendation_call_scores
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Admins/super_admins: full access to communications
CREATE POLICY "Admins can manage communications" 
  ON public.recommendation_communications
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Clients: read-only access to their own recommendation communications
CREATE POLICY "Clients can view own recommendation communications" 
  ON public.recommendation_communications
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.recommendations r
      JOIN public.clients c ON c.id = r.client_id
      JOIN public.profiles p ON p.client_id = c.id
      WHERE r.id = recommendation_communications.recommendation_id 
        AND p.id = auth.uid()
    )
  );


-- ============================================================
-- 9. Pipeline reps view
-- ============================================================
-- 
-- A "pipeline rep" is any user who can own deals. Qualification:
--   • role = 'sales' (explicit sales users), OR
--   • role has access to BOTH 'recommendations' AND 'users' pages
--     (catches admins, super_admins, and any future hybrid roles)
--
-- Usage:  JOIN pipeline_reps pr ON pr.id = r.created_by
-- One place to change if the definition ever shifts.
--

CREATE OR REPLACE VIEW public.pipeline_reps AS
SELECT DISTINCT
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.role,
  p.avatar_url
FROM public.profiles p
WHERE p.role = 'sales'
   OR (
     EXISTS (
       SELECT 1 FROM public.role_permissions rp 
       WHERE rp.role = p.role 
         AND rp.menu_key = 'recommendations' 
         AND rp.has_access = true
     )
     AND 
     EXISTS (
       SELECT 1 FROM public.role_permissions rp 
       WHERE rp.role = p.role 
         AND rp.menu_key = 'users' 
         AND rp.has_access = true
     )
   );
