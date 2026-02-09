-- ============================================================
-- Content Workflow Expansion: Multi-Step Workflow with Glowing Progress Dots
-- Migration for expanded content approval workflow
-- ============================================================
--
-- This migration adds:
--   1. Client-level content approval settings (content_approval_mode, approval_threshold)
--   2. Expanded content status workflow with new statuses
--   3. Status tracking columns (status_changed_at, status_history, review_round, etc.)
--   4. New table: content_status_transitions (audit log)
--   5. Data migration for existing content rows
--   6. RLS policies for client users
--
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================


-- ============================================================
-- 1. Add content approval columns to clients table
-- ============================================================

-- Mode: 'full_approval' = client reviews all, 'initial_approval' = reviews first N, 'auto' = no client review
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS content_approval_mode text DEFAULT 'full_approval';

-- Add constraint for content_approval_mode values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_content_approval_mode_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_content_approval_mode_check
      CHECK (content_approval_mode IN ('full_approval', 'initial_approval', 'auto'));
  END IF;
END $$;

-- Number of content pieces client reviews before auto mode kicks in (only used for 'initial_approval')
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS approval_threshold integer DEFAULT NULL;


-- ============================================================
-- 2. Add new columns to content table for expanded workflow
-- ============================================================

-- When the status was last changed (for SLA tracking)
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz DEFAULT NOW();

-- Full history of status changes as JSONB array
-- Each entry: { status, changed_at, changed_by_id, changed_by_name, note }
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]'::jsonb;

-- Whether this content piece requires client approval (set at creation based on client mode)
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT true;

-- Tracks how many revision loops have occurred
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS review_round integer DEFAULT 0;

-- Who this content is assigned to (for internal workflow)
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);


-- ============================================================
-- 3. Update status constraint to include all new statuses
-- ============================================================

-- First, drop the old constraint if it exists
ALTER TABLE public.content
  DROP CONSTRAINT IF EXISTS content_status_check;

-- Add new constraint with expanded status values
-- Note: We keep old values temporarily for data migration, then they'll be updated
ALTER TABLE public.content
  ADD CONSTRAINT content_status_check
  CHECK (status = ANY (ARRAY[
    -- Legacy statuses (will be migrated)
    'draft'::text,
    'pending_review'::text,
    'revision'::text,
    'approved'::text,
    'published'::text,
    -- New workflow statuses
    'sent_for_review'::text,
    'client_reviewing'::text,
    'revisions_requested'::text,
    'internal_review'::text,
    'final_optimization'::text,
    'image_selection'::text,
    'scheduled'::text,
    'posted'::text
  ]));


-- ============================================================
-- 4. Create content_status_transitions table (audit log)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.content_status_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  from_status text,  -- null for initial creation
  to_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  note text,  -- used for revision feedback
  created_at timestamptz DEFAULT NOW()
);

-- Index for querying transitions by content
CREATE INDEX IF NOT EXISTS idx_content_status_transitions_content_id
  ON public.content_status_transitions(content_id);

-- Index for querying transitions by user
CREATE INDEX IF NOT EXISTS idx_content_status_transitions_changed_by
  ON public.content_status_transitions(changed_by);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_content_status_transitions_created_at
  ON public.content_status_transitions(created_at DESC);


-- ============================================================
-- 5. Data Migration: Update existing content statuses
-- ============================================================

-- Map old statuses to new ones:
-- 'draft' → 'draft' (no change)
-- 'pending_review' → 'sent_for_review'
-- 'revision' → 'revisions_requested'
-- 'approved' → 'approved' (no change)
-- 'published' → 'posted'

UPDATE public.content
SET status = 'sent_for_review'
WHERE status = 'pending_review';

UPDATE public.content
SET status = 'revisions_requested'
WHERE status = 'revision';

UPDATE public.content
SET status = 'posted'
WHERE status = 'published';


-- ============================================================
-- 6. Backfill status_history for existing rows
-- ============================================================

-- For each existing content row, create a single history entry
-- using its current status and updated_at date
UPDATE public.content
SET
  status_history = jsonb_build_array(
    jsonb_build_object(
      'status', status,
      'changed_at', COALESCE(updated_at, created_at, NOW()),
      'changed_by_id', NULL,
      'changed_by_name', 'System Migration',
      'note', 'Initial status from migration'
    )
  ),
  status_changed_at = COALESCE(updated_at, created_at, NOW())
WHERE status_history = '[]'::jsonb OR status_history IS NULL;


-- ============================================================
-- 7. Create initial transition records for existing content
-- ============================================================

-- Insert transition records for all existing content (null from_status = creation)
INSERT INTO public.content_status_transitions (content_id, from_status, to_status, changed_by, note, created_at)
SELECT
  id,
  NULL,
  status,
  NULL,
  'Migration: Initial status record',
  COALESCE(created_at, NOW())
FROM public.content
ON CONFLICT DO NOTHING;


-- ============================================================
-- 8. Update status constraint to remove legacy values
-- ============================================================

-- Now that data is migrated, update constraint to only allow new values
ALTER TABLE public.content
  DROP CONSTRAINT IF EXISTS content_status_check;

ALTER TABLE public.content
  ADD CONSTRAINT content_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'sent_for_review'::text,
    'client_reviewing'::text,
    'revisions_requested'::text,
    'approved'::text,
    'internal_review'::text,
    'final_optimization'::text,
    'image_selection'::text,
    'scheduled'::text,
    'posted'::text
  ]));


-- ============================================================
-- 9. Add indexes for common queries
-- ============================================================

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_content_status
  ON public.content(status);

-- Index for filtering by assigned_to
CREATE INDEX IF NOT EXISTS idx_content_assigned_to
  ON public.content(assigned_to);

-- Index for status change time (SLA queries)
CREATE INDEX IF NOT EXISTS idx_content_status_changed_at
  ON public.content(status_changed_at DESC);


-- ============================================================
-- 10. RLS Policies
-- ============================================================

-- Enable RLS on content_status_transitions if not already enabled
ALTER TABLE public.content_status_transitions ENABLE ROW LEVEL SECURITY;

-- Admin/Pear team: full read/write on content_status_transitions
DROP POLICY IF EXISTS "Admin full access to content_status_transitions" ON public.content_status_transitions;
CREATE POLICY "Admin full access to content_status_transitions"
  ON public.content_status_transitions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'sales', 'production_team')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'sales', 'production_team')
    )
  );

-- Client users: can read transitions for their content
DROP POLICY IF EXISTS "Clients can read their content transitions" ON public.content_status_transitions;
CREATE POLICY "Clients can read their content transitions"
  ON public.content_status_transitions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.content c
      JOIN public.profiles p ON p.client_id = c.client_id
      WHERE c.id = content_status_transitions.content_id
      AND p.id = auth.uid()
    )
  );

-- Client users: can insert transitions only for allowed status changes
DROP POLICY IF EXISTS "Clients can insert allowed transitions" ON public.content_status_transitions;
CREATE POLICY "Clients can insert allowed transitions"
  ON public.content_status_transitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be a client user with matching client_id
    EXISTS (
      SELECT 1 FROM public.content c
      JOIN public.profiles p ON p.client_id = c.client_id
      WHERE c.id = content_status_transitions.content_id
      AND p.id = auth.uid()
    )
    -- Only allowed transitions for clients
    AND (
      (from_status = 'sent_for_review' AND to_status = 'client_reviewing')
      OR (from_status = 'client_reviewing' AND to_status = 'approved')
      OR (from_status = 'client_reviewing' AND to_status = 'revisions_requested')
    )
  );


-- ============================================================
-- 11. RLS for content table: Client access
-- ============================================================

-- Check if RLS is enabled on content table
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

-- Admin/Pear team: full access to all content
DROP POLICY IF EXISTS "Admin full access to content" ON public.content;
CREATE POLICY "Admin full access to content"
  ON public.content
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'sales', 'production_team')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'sales', 'production_team')
    )
  );

-- Client users: can read content for their client
DROP POLICY IF EXISTS "Clients can read their content" ON public.content;
CREATE POLICY "Clients can read their content"
  ON public.content
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = content.client_id
    )
  );

-- Client users: can update status only for allowed transitions
DROP POLICY IF EXISTS "Clients can update content status for allowed transitions" ON public.content;
CREATE POLICY "Clients can update content status for allowed transitions"
  ON public.content
  FOR UPDATE
  TO authenticated
  USING (
    -- Must be a client user with matching client_id
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = content.client_id
    )
  )
  WITH CHECK (
    -- Must be a client user with matching client_id
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = content.client_id
    )
    -- Note: Additional status transition validation should be done at the API level
    -- since RLS cannot easily access the "old" value for comparison
  );


-- ============================================================
-- 12. Helper function for status transitions (optional)
-- ============================================================

CREATE OR REPLACE FUNCTION public.content_transition_status(
  p_content_id uuid,
  p_new_status text,
  p_changed_by uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status text;
  v_changed_by_name text;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status FROM public.content WHERE id = p_content_id;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Content not found: %', p_content_id;
  END IF;

  -- Get user name
  SELECT full_name INTO v_changed_by_name FROM public.profiles WHERE id = p_changed_by;

  -- Update content status and history
  UPDATE public.content
  SET
    status = p_new_status,
    status_changed_at = NOW(),
    status_history = status_history || jsonb_build_array(
      jsonb_build_object(
        'status', p_new_status,
        'changed_at', NOW(),
        'changed_by_id', p_changed_by,
        'changed_by_name', COALESCE(v_changed_by_name, 'Unknown'),
        'note', p_note
      )
    ),
    review_round = CASE
      WHEN p_new_status = 'revisions_requested' THEN COALESCE(review_round, 0) + 1
      ELSE review_round
    END
  WHERE id = p_content_id;

  -- Insert transition record
  INSERT INTO public.content_status_transitions (content_id, from_status, to_status, changed_by, note)
  VALUES (p_content_id, v_old_status, p_new_status, p_changed_by, p_note);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.content_transition_status TO authenticated;


-- ============================================================
-- 13. Comments for documentation
-- ============================================================

COMMENT ON COLUMN public.clients.content_approval_mode IS
  'How client reviews content: full_approval (reviews all), initial_approval (reviews first N), auto (no review)';

COMMENT ON COLUMN public.clients.approval_threshold IS
  'Number of content pieces client reviews before auto mode (only for initial_approval mode)';

COMMENT ON COLUMN public.content.status_changed_at IS
  'When the status was last changed (for SLA tracking)';

COMMENT ON COLUMN public.content.status_history IS
  'JSONB array of status changes: [{status, changed_at, changed_by_id, changed_by_name, note}]';

COMMENT ON COLUMN public.content.approval_required IS
  'Whether this content requires client approval (set at creation based on client mode)';

COMMENT ON COLUMN public.content.review_round IS
  'Number of revision loops that have occurred';

COMMENT ON COLUMN public.content.assigned_to IS
  'User assigned to work on this content';

COMMENT ON TABLE public.content_status_transitions IS
  'Audit log of all content status changes';

COMMENT ON FUNCTION public.content_transition_status IS
  'Helper function to transition content status with full history tracking';
