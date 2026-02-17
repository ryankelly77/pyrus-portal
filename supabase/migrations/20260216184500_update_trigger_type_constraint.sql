-- Update trigger_type check constraint to include all supported trigger types

-- Drop the old constraint
ALTER TABLE email_automations DROP CONSTRAINT IF EXISTS email_automations_trigger_type_check;

-- Add new constraint with all trigger types
ALTER TABLE email_automations ADD CONSTRAINT email_automations_trigger_type_check
  CHECK (trigger_type IN (
    -- Recommendation triggers
    'recommendation_sent',
    'recommendation_email_opened',
    'recommendation_email_clicked',
    'recommendation_viewed',
    'proposal_sent',
    -- Client triggers
    'client_created',
    'client_login',
    -- Content triggers
    'content_approved',
    -- Page view triggers
    'page_view_dashboard',
    'page_view_results',
    'page_view_recommendations',
    -- Billing triggers
    'invoice_sent',
    'payment_received',
    'subscription_started',
    -- Other
    'manual'
  ));
