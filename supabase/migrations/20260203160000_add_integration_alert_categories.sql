-- Add integration alert categories to system_alerts
-- email_error, crm_error, basecamp_error, uptime_error, storage_error

ALTER TABLE system_alerts DROP CONSTRAINT IF EXISTS system_alerts_category_check;

ALTER TABLE system_alerts ADD CONSTRAINT system_alerts_category_check
  CHECK (category IN (
    'subscription_safeguard',
    'state_reset_blocked',
    'sync_failure',
    'api_error',
    'stripe_error',
    'auth_error',
    'data_integrity',
    'checkout_error',
    'billing_sync_failure',
    'email_error',
    'crm_error',
    'basecamp_error',
    'uptime_error',
    'storage_error'
  ));
