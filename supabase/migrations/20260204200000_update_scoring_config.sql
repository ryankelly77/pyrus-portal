-- ============================================================
-- Update Pipeline Scoring Config
-- ============================================================
--
-- Changes:
-- - Less aggressive medium call score mappings
--   - engagement.medium: 0.55 → 0.70
--   - plan_fit.medium: 0.60 → 0.65
-- - Slower penalty degradation (~60 days to zero instead of ~12)
--   - email_not_opened: grace 24h→48h, penalty 2.5→0.5/day, max 35→25
--   - proposal_not_viewed: grace 48h→120h (5 days), penalty 2→0.5/day, max 25→20
--   - silence: grace 5→10 days, penalty 3→1.2/day, max 80→60, threshold 2→3
--
-- Expected behavior after changes:
-- A deal with Budget=Clear, Competition=None, Engagement=Medium, Plan Fit=Medium
-- should produce a base score of ~82 (was 77).
--
-- A deal with base score 82 and no prospect engagement degrades:
-- - Day 10: ~78
-- - Day 20: ~61
-- - Day 30: ~44
-- - Day 40: ~27
-- - Day 50: ~10
-- - Day 60: ~0
-- ============================================================

-- Update call_score_mappings (engagement and plan_fit medium values)
UPDATE settings
SET value = jsonb_set(
  jsonb_set(
    value::jsonb,
    '{call_score_mappings,engagement,medium}',
    '0.70'
  ),
  '{call_score_mappings,plan_fit,medium}',
  '0.65'
)
WHERE key = 'pipeline_scoring_config';

-- Update email_not_opened penalty
UPDATE settings
SET value = jsonb_set(
  value::jsonb,
  '{penalties,email_not_opened}',
  '{"grace_period_hours": 48, "daily_penalty": 0.5, "max_penalty": 25}'
)
WHERE key = 'pipeline_scoring_config';

-- Update proposal_not_viewed penalty
UPDATE settings
SET value = jsonb_set(
  value::jsonb,
  '{penalties,proposal_not_viewed}',
  '{"grace_period_hours": 120, "daily_penalty": 0.5, "max_penalty": 20}'
)
WHERE key = 'pipeline_scoring_config';

-- Update silence penalty
UPDATE settings
SET value = jsonb_set(
  value::jsonb,
  '{penalties,silence}',
  '{"grace_period_days": 10, "daily_penalty": 1.2, "max_penalty": 60, "followup_acceleration_threshold": 3, "followup_acceleration_multiplier": 1.5}'
)
WHERE key = 'pipeline_scoring_config';

-- Verify the update
DO $$
DECLARE
  config_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM settings WHERE key = 'pipeline_scoring_config') INTO config_exists;
  IF NOT config_exists THEN
    RAISE NOTICE 'No pipeline_scoring_config found in settings table. The default-config.ts fallback will be used.';
  ELSE
    RAISE NOTICE 'pipeline_scoring_config updated successfully.';
  END IF;
END $$;
