-- Client Announcements System
-- Admin-created announcements displayed to clients as popups/interstitials

-- Main announcements table
CREATE TABLE client_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  announcement_type VARCHAR(50) NOT NULL DEFAULT 'general',
  -- 'general', 'billing', 'platform_update', 'offer', 'maintenance'

  -- Display rules
  display_pages JSONB DEFAULT '["all"]',
  -- ["all"] or specific pages: ["dashboard", "results", "content", etc.]
  display_frequency VARCHAR(50) DEFAULT 'once_per_session',
  -- 'once_per_session', 'every_page_load', 'once_per_day'

  -- Persistence rules
  persistence_type VARCHAR(50) DEFAULT 'dismissable',
  -- 'dismissable', 'show_for_duration', 'required_action'
  show_duration_days INT,
  allow_permanent_dismiss BOOLEAN DEFAULT true,

  -- Targeting
  target_all_clients BOOLEAN DEFAULT true,
  target_client_ids JSONB DEFAULT '[]',

  -- Scheduling
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Extended content (for "read more" page)
  has_detail_page BOOLEAN DEFAULT false,
  detail_html TEXT,
  cta_button_text VARCHAR(100),
  cta_button_url VARCHAR(500),

  -- Status & metadata
  status VARCHAR(20) DEFAULT 'draft',
  -- 'draft', 'active', 'expired', 'archived'
  priority INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track announcement dismissals per client
CREATE TABLE announcement_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES client_announcements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  user_id UUID,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  is_permanent BOOLEAN DEFAULT false,
  first_viewed_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  UNIQUE(announcement_id, client_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_announcements_status ON client_announcements(status);
CREATE INDEX idx_announcements_dates ON client_announcements(start_date, end_date);
CREATE INDEX idx_announcements_priority ON client_announcements(priority DESC);
CREATE INDEX idx_dismissals_announcement ON announcement_dismissals(announcement_id);
CREATE INDEX idx_dismissals_client ON announcement_dismissals(client_id);

-- RLS policies
ALTER TABLE client_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- Admins can manage all announcements
CREATE POLICY "admin_all_announcements" ON client_announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Clients can read active announcements that target them
CREATE POLICY "client_read_announcements" ON client_announcements FOR SELECT USING (
  status = 'active'
  AND (start_date IS NULL OR start_date <= NOW())
  AND (end_date IS NULL OR end_date >= NOW())
  AND (
    target_all_clients = true
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.client_id::text = ANY(
        SELECT jsonb_array_elements_text(target_client_ids)
      )
    )
  )
);

-- Admins can manage all dismissals
CREATE POLICY "admin_all_dismissals" ON announcement_dismissals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Clients can view and create their own dismissals
CREATE POLICY "client_own_dismissals" ON announcement_dismissals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.client_id = announcement_dismissals.client_id
  )
);

CREATE POLICY "client_create_dismissals" ON announcement_dismissals FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.client_id = announcement_dismissals.client_id
  )
);

CREATE POLICY "client_update_dismissals" ON announcement_dismissals FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.client_id = announcement_dismissals.client_id
  )
);
