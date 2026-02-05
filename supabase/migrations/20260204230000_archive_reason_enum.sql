-- ============================================================
-- Archive Reason Enum Migration
-- ============================================================
--
-- Converts archive_reason from free text to an enum type
-- with predefined options, plus optional notes field.
-- ============================================================

-- Create enum type (safe for re-runs)
DO $$ BEGIN
  CREATE TYPE archive_reason_enum AS ENUM (
    'went_dark',
    'budget',
    'timing',
    'chose_competitor',
    'handling_in_house',
    'not_a_fit',
    'key_contact_left',
    'business_closed',
    'duplicate',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Convert recommendations table
-- Drop old text column and add enum + notes columns
ALTER TABLE recommendations
  DROP COLUMN IF EXISTS archive_reason;

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS archive_reason archive_reason_enum,
  ADD COLUMN IF NOT EXISTS archive_notes text;

-- Convert pipeline_archive_history table
ALTER TABLE pipeline_archive_history
  DROP COLUMN IF EXISTS reason;

ALTER TABLE pipeline_archive_history
  ADD COLUMN IF NOT EXISTS reason archive_reason_enum,
  ADD COLUMN IF NOT EXISTS notes text;

-- Add comments for documentation
COMMENT ON COLUMN recommendations.archive_reason IS 'Enum reason for archiving: went_dark, budget, timing, chose_competitor, handling_in_house, not_a_fit, key_contact_left, business_closed, duplicate, other';
COMMENT ON COLUMN recommendations.archive_notes IS 'Optional notes, required when archive_reason is other';
COMMENT ON COLUMN pipeline_archive_history.reason IS 'Enum reason for the archive action';
COMMENT ON COLUMN pipeline_archive_history.notes IS 'Optional notes accompanying the archive action';
