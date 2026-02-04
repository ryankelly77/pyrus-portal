-- Create user_invites table for user invitation system
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL, -- 'client', 'admin', 'super_admin', 'production_team', 'sales'
  client_ids UUID[] DEFAULT '{}', -- Array of client IDs for client users
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'email_failed'
  invited_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON user_invites(status);
