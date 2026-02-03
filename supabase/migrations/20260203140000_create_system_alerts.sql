-- Create system_alerts table for production monitoring
CREATE TABLE system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  category TEXT NOT NULL CHECK (category IN (
    'subscription_safeguard',
    'state_reset_blocked',
    'sync_failure',
    'api_error',
    'stripe_error',
    'auth_error',
    'data_integrity'
  )),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  source_file TEXT,
  client_id UUID REFERENCES clients(id),
  user_id UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_category ON system_alerts(category);
CREATE INDEX idx_system_alerts_created ON system_alerts(created_at DESC);
CREATE INDEX idx_system_alerts_unresolved ON system_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_system_alerts_client ON system_alerts(client_id) WHERE client_id IS NOT NULL;

-- RLS policies
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API writes)
CREATE POLICY "Service role full access" ON system_alerts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated admins to read alerts
CREATE POLICY "Admins can read alerts" ON system_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );
