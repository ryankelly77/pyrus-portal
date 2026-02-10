-- Add video_url column to content table for optional video content
ALTER TABLE content ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comment
COMMENT ON COLUMN content.video_url IS 'URL to video content (YouTube, Vimeo embed, or direct file URL)';
