-- Add portal_slug field to products for checkout/subscription system integration
ALTER TABLE products ADD COLUMN IF NOT EXISTS portal_slug TEXT;

-- Create unique index on portal_slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_portal_slug ON products(portal_slug) WHERE portal_slug IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN products.portal_slug IS 'Unique slug used by the portal checkout system (e.g., content-writing, ai-creative-assets)';
