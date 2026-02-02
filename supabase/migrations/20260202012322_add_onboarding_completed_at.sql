-- Add onboarding completion timestamp to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_clients_onboarding_completed
ON clients(onboarding_completed_at)
WHERE onboarding_completed_at IS NOT NULL;

-- Backfill: Mark existing clients older than 30 days as "completed"
-- Uses start_date (original Stripe signup) where available, falls back to created_at
-- This prevents all existing clients from suddenly seeing onboarding again
UPDATE clients
SET onboarding_completed_at = COALESCE(start_date, created_at) + INTERVAL '30 days'
WHERE COALESCE(start_date, created_at) < NOW() - INTERVAL '30 days'
  AND onboarding_completed_at IS NULL;

COMMENT ON COLUMN clients.onboarding_completed_at IS 'Timestamp when client completed onboarding (checklist 100% or 30+ days), NULL if still onboarding';
