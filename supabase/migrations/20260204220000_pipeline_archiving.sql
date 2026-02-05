-- ============================================================
-- Pipeline Archiving Feature
-- ============================================================
--
-- Adds support for archiving deals out of the active pipeline
-- and reviving them with fresh scoring when prospects resurface.
-- ============================================================

-- Add archive/revival columns to recommendations
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS revived_at timestamptz,
  ADD COLUMN IF NOT EXISTS revived_by uuid REFERENCES profiles(id);

-- Track archive/revival history for audit
CREATE TABLE IF NOT EXISTS pipeline_archive_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('archived', 'revived')),
  reason text,
  confidence_score_at_action integer,
  performed_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_archive_history_rec_id
  ON pipeline_archive_history(recommendation_id, created_at DESC);

-- Index for filtering archived deals
CREATE INDEX IF NOT EXISTS idx_recommendations_archived
  ON recommendations(archived_at) WHERE archived_at IS NOT NULL;

-- Index for filtering active deals
CREATE INDEX IF NOT EXISTS idx_recommendations_active
  ON recommendations(status, archived_at) WHERE archived_at IS NULL;

-- Enable RLS on archive history
ALTER TABLE pipeline_archive_history ENABLE ROW LEVEL SECURITY;

-- Policy for admin access
CREATE POLICY "Admins can manage archive history"
  ON pipeline_archive_history FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'sales'));

-- Comments for documentation
COMMENT ON COLUMN recommendations.archived_at IS 'When set, the deal is in the archived section and excluded from active pipeline KPIs';
COMMENT ON COLUMN recommendations.revived_at IS 'When set after archival, used as the new baseline date for time-based penalty calculations instead of sent_at';
COMMENT ON TABLE pipeline_archive_history IS 'Audit log of archive and revival actions';
