-- Bug Reports table for users to report issues to super admins

CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES clients(id),

  -- Context
  page_url TEXT NOT NULL,
  page_title TEXT,
  user_agent TEXT,
  screen_size TEXT,

  -- Report
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,

  -- Optional browser console errors (last 20 lines)
  console_logs TEXT,

  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_bug_reports_status ON bug_reports(status);
CREATE INDEX idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own reports
CREATE POLICY "users_create_own" ON bug_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "users_view_own" ON bug_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Super admins can do everything
CREATE POLICY "superadmin_all" ON bug_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
