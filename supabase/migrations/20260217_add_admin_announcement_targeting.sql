-- Add admin targeting to announcements

-- Add target_audience column to specify who sees the announcement
ALTER TABLE client_announcements
ADD COLUMN target_audience VARCHAR(20) DEFAULT 'clients';
-- 'clients', 'admin', 'both'

-- Add target_admin_roles to specify which admin roles see the announcement
ALTER TABLE client_announcements
ADD COLUMN target_admin_roles JSONB DEFAULT '[]';
-- e.g., ["super_admin", "admin", "production_team", "sales"]

-- Update announcement_dismissals to support admin user dismissals (user_id based instead of client_id)
-- For admin users, client_id will be NULL and user_id will be set
ALTER TABLE announcement_dismissals
ALTER COLUMN client_id DROP NOT NULL;

-- Add unique constraint for admin dismissals (by user_id)
CREATE UNIQUE INDEX idx_dismissals_user ON announcement_dismissals(announcement_id, user_id)
WHERE user_id IS NOT NULL AND client_id IS NULL;

-- RLS policy for admin users to read announcements targeting them
CREATE POLICY "admin_read_targeted_announcements" ON client_announcements FOR SELECT USING (
  status = 'active'
  AND (start_date IS NULL OR start_date <= NOW())
  AND (end_date IS NULL OR end_date >= NOW())
  AND target_audience IN ('admin', 'both')
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('super_admin', 'admin', 'production_team', 'sales')
    AND (
      target_admin_roles = '[]'::jsonb
      OR p.role = ANY(SELECT jsonb_array_elements_text(target_admin_roles))
    )
  )
);

-- RLS policy for admin users to manage their own dismissals
CREATE POLICY "admin_own_dismissals" ON announcement_dismissals FOR ALL USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('super_admin', 'admin', 'production_team', 'sales')
  )
);
