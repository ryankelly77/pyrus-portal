-- Add social_platforms JSONB column to content table
-- Stores which social networks content should be posted to
ALTER TABLE content ADD COLUMN IF NOT EXISTS social_platforms JSONB DEFAULT '{"facebook": true, "instagram": true, "linkedin": false, "x": false}'::jsonb;

-- Add comment
COMMENT ON COLUMN content.social_platforms IS 'JSON object indicating which social platforms to post to (facebook, instagram, linkedin, x)';
