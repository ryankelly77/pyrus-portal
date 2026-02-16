-- ============================================================
-- Add sort_order column to email_templates table
-- ============================================================
--
-- This migration adds a sort_order column to allow reordering
-- of email templates within their categories via drag-and-drop.
-- ============================================================

-- Add sort_order column with default value of 0
ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_email_templates_sort_order
  ON public.email_templates(category_id, sort_order);

-- Initialize sort_order values based on current name ordering within each category
-- This ensures existing templates get sequential sort_order values
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY category_id
      ORDER BY name ASC
    ) * 10 AS new_sort_order
  FROM public.email_templates
)
UPDATE public.email_templates t
SET sort_order = r.new_sort_order
FROM ranked r
WHERE t.id = r.id;

-- Comment for documentation
COMMENT ON COLUMN public.email_templates.sort_order IS
  'Display ordering within category. Lower values appear first.';
