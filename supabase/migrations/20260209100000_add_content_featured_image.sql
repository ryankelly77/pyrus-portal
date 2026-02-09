-- Add featured_image column to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS featured_image TEXT;

-- Add comment
COMMENT ON COLUMN content.featured_image IS 'URL to the featured image for this content';

-- Create storage bucket for content images (if using Supabase storage)
-- Note: Storage bucket creation is typically done via Supabase Dashboard or CLI
-- The bucket 'content-images' should be created with the following settings:
-- - Public bucket: true (for public URL access)
-- - File size limit: 5MB
-- - Allowed MIME types: image/*

-- If bucket already exists, these policies can be applied:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('content-images', 'content-images', true)
-- ON CONFLICT (id) DO NOTHING;
