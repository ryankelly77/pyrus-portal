-- Pipeline Score History table for tracking confidence scores over time
CREATE TABLE IF NOT EXISTS pipeline_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  confidence_score integer NOT NULL,
  confidence_percent numeric(5,2) NOT NULL,
  weighted_monthly numeric(10,2) NOT NULL,
  weighted_onetime numeric(10,2) NOT NULL,
  trigger_source text NOT NULL DEFAULT 'unknown',
  scored_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient querying by recommendation
CREATE INDEX IF NOT EXISTS idx_score_history_rec_id
  ON pipeline_score_history(recommendation_id, scored_at DESC);

-- RLS
ALTER TABLE pipeline_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read score history"
  ON pipeline_score_history FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'sales'));

CREATE POLICY "System can insert score history"
  ON pipeline_score_history FOR INSERT
  WITH CHECK (true);

-- Comment explaining trigger_source values
COMMENT ON COLUMN pipeline_score_history.trigger_source IS
  'What caused the recalculation: invite_sent, call_score_updated, status_changed, communication_logged, highlevel_sync, email_opened, proposal_viewed, account_created, tracking_event, daily_cron, manual_refresh, unknown';
