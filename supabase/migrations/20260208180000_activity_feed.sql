-- ============================================================
-- Activity Feed: Centralized Activity Logging
-- ============================================================
--
-- This migration creates the activity_feed table for logging
-- all significant activities across the portal (content changes,
-- client settings, etc.).
--
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================


-- ============================================================
-- 1. Create activity_feed table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optional client association (null for system-wide activities)
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Who performed the action
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,

  -- Type of activity for filtering
  -- Examples: 'content_status_change', 'content_created', 'client_setting_change', 'user_invited', etc.
  activity_type text NOT NULL,

  -- Human-readable message
  message text NOT NULL,

  -- Structured data for the activity (content_piece_id, from_status, to_status, etc.)
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Icon hint for the UI
  -- Examples: 'edit', 'send', 'check', 'alert-triangle', 'globe', 'settings', 'user', etc.
  icon text DEFAULT 'info',

  created_at timestamptz DEFAULT NOW()
);


-- ============================================================
-- 2. Indexes for efficient querying
-- ============================================================

-- Query by client
CREATE INDEX IF NOT EXISTS idx_activity_feed_client_id
  ON public.activity_feed(client_id);

-- Query by time (most common - dashboards, feeds)
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at
  ON public.activity_feed(created_at DESC);

-- Filter by activity type
CREATE INDEX IF NOT EXISTS idx_activity_feed_type
  ON public.activity_feed(activity_type);

-- Query by user (for user activity history)
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id
  ON public.activity_feed(user_id);

-- Composite index for common dashboard query: recent activities for a client
CREATE INDEX IF NOT EXISTS idx_activity_feed_client_created
  ON public.activity_feed(client_id, created_at DESC);


-- ============================================================
-- 3. RLS Policies
-- ============================================================

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Admin/Pear team: can view all activities
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_feed;
CREATE POLICY "Admins can view all activity"
  ON public.activity_feed
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'sales', 'production_team')
    )
  );

-- Client users: can view activities for their own client
DROP POLICY IF EXISTS "Clients can view own activity" ON public.activity_feed;
CREATE POLICY "Clients can view own activity"
  ON public.activity_feed
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = activity_feed.client_id
    )
  );

-- Insert policy: authenticated users can insert
-- (Server-side code typically uses service role to bypass RLS anyway)
DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.activity_feed;
CREATE POLICY "Authenticated users can insert activity"
  ON public.activity_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin/Pear team: can insert activities (redundant with above but explicit)
DROP POLICY IF EXISTS "Admins can insert activity" ON public.activity_feed;
CREATE POLICY "Admins can insert activity"
  ON public.activity_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'sales', 'production_team')
    )
  );


-- ============================================================
-- 4. Comments for documentation
-- ============================================================

COMMENT ON TABLE public.activity_feed IS
  'Centralized activity log for all significant portal activities';

COMMENT ON COLUMN public.activity_feed.client_id IS
  'Optional client association; null for system-wide activities';

COMMENT ON COLUMN public.activity_feed.activity_type IS
  'Activity category for filtering (content_status_change, content_created, client_setting_change, etc.)';

COMMENT ON COLUMN public.activity_feed.metadata IS
  'Structured data: content_piece_id, from_status, to_status, review_round, note, etc.';

COMMENT ON COLUMN public.activity_feed.icon IS
  'Icon hint for UI rendering (edit, send, check, alert-triangle, globe, settings, etc.)';
