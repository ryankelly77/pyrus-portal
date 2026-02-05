-- Add score breakdown columns to recommendations table
-- These store the detailed scoring breakdown for display in the pipeline UI

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS base_score INTEGER,
  ADD COLUMN IF NOT EXISTS total_penalties NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS total_bonus NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS penalty_email_not_opened NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS penalty_proposal_not_viewed NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS penalty_silence NUMERIC(5,2);

-- Add comments for documentation
COMMENT ON COLUMN recommendations.base_score IS 'Base score from call factors or default (0-100)';
COMMENT ON COLUMN recommendations.total_penalties IS 'Total penalty points deducted';
COMMENT ON COLUMN recommendations.total_bonus IS 'Total bonus points added';
COMMENT ON COLUMN recommendations.penalty_email_not_opened IS 'Penalty for email not being opened';
COMMENT ON COLUMN recommendations.penalty_proposal_not_viewed IS 'Penalty for proposal not being viewed';
COMMENT ON COLUMN recommendations.penalty_silence IS 'Penalty for no prospect response';
