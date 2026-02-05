-- ============================================================
-- Pipeline Snooze Feature
-- ============================================================
--
-- Allows reps to "snooze" deals, freezing time-based penalty
-- accumulation until a specified date. When snooze expires,
-- penalties restart from zero as if freshly sent.
-- ============================================================

-- Add snooze columns to recommendations
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS snoozed_at timestamptz,
  ADD COLUMN IF NOT EXISTS snooze_reason text;

-- Track snooze history for audit
CREATE TABLE IF NOT EXISTS pipeline_snooze_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  snoozed_at timestamptz NOT NULL DEFAULT now(),
  snoozed_until timestamptz NOT NULL,
  reason text,
  cancelled_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snooze_history_rec_id
  ON pipeline_snooze_history(recommendation_id, created_at DESC);

ALTER TABLE pipeline_snooze_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage snooze history"
  ON pipeline_snooze_history FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'sales'));

-- Add comment for documentation
COMMENT ON COLUMN recommendations.snoozed_until IS 'When set and in the future, all time-based penalties are frozen. When expired, penalties calculate from this date instead of sent_at.';
COMMENT ON COLUMN recommendations.snoozed_at IS 'When the current snooze was set';
COMMENT ON COLUMN recommendations.snooze_reason IS 'Optional reason for snoozing (e.g., "Prospect tabling for 30 days")';
