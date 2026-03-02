-- Add is_pro_bono field to clients table
-- Pro bono clients skip the recommendation flow and have products manually assigned

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS is_pro_bono BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.is_pro_bono IS 'Pro bono clients skip recommendation flow and have products manually assigned';
