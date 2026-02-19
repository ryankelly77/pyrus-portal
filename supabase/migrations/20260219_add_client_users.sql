-- Migration: Add client_users join table for many-to-many user-client relationships
-- This enables:
--   1. Users linked to multiple clients (consultants, franchise owners)
--   2. Clients with multiple users
--   3. Per-relationship settings (receives_alerts, role)
--   4. Client switcher in UI for multi-client users

-- Create the join table
CREATE TABLE IF NOT EXISTS client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role within this client relationship
  role VARCHAR(50) DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'

  -- Is this the primary contact for this client?
  is_primary BOOLEAN DEFAULT false,

  -- Should this user receive result alerts and notifications for this client?
  receives_alerts BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only be linked to a client once
  UNIQUE(client_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_receives_alerts ON client_users(client_id, receives_alerts) WHERE receives_alerts = true;

-- Migrate existing profiles.client_id relationships to the new table
-- These users become 'member' role with receives_alerts = true
INSERT INTO client_users (client_id, user_id, role, is_primary, receives_alerts)
SELECT
  p.client_id,
  p.id as user_id,
  'member' as role,
  false as is_primary,
  true as receives_alerts
FROM profiles p
WHERE p.client_id IS NOT NULL
ON CONFLICT (client_id, user_id) DO NOTHING;

-- Add active_client_id to profiles for storing the user's currently selected client
-- This is used for the client switcher when a user has multiple clients
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS active_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Set active_client_id to match existing client_id for migrated users
UPDATE profiles
SET active_client_id = client_id
WHERE client_id IS NOT NULL AND active_client_id IS NULL;

-- Create index for active_client_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_active_client_id ON profiles(active_client_id);

-- RLS Policies for client_users table
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Admins can see all client_users
CREATE POLICY "Admins can view all client_users" ON client_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can manage client_users
CREATE POLICY "Admins can manage client_users" ON client_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Users can see their own client_users records
CREATE POLICY "Users can view own client_users" ON client_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Comment explaining the migration
COMMENT ON TABLE client_users IS 'Join table for many-to-many relationship between clients and users. Replaces the single profiles.client_id FK to support users with multiple clients.';
COMMENT ON COLUMN client_users.role IS 'User role within this client: owner, admin, member, viewer';
COMMENT ON COLUMN client_users.is_primary IS 'Whether this user is the primary contact for this client';
COMMENT ON COLUMN client_users.receives_alerts IS 'Whether this user receives result alerts and notifications for this client';
COMMENT ON COLUMN profiles.active_client_id IS 'The currently selected client for users with multiple clients (client switcher)';
