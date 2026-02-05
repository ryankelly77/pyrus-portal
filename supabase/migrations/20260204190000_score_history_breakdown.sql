-- Add breakdown JSONB column to pipeline_score_history for full scoring audit
ALTER TABLE pipeline_score_history
  ADD COLUMN IF NOT EXISTS breakdown jsonb;

COMMENT ON COLUMN pipeline_score_history.breakdown IS
  'Full scoring breakdown at time of calculation: base_score, penalties, bonuses, etc.';
