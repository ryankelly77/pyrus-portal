-- ============================================================
-- Fix pipeline_score_history RLS policy for server-side queries
-- ============================================================
--
-- The original policy used auth.jwt() ->> 'role' which doesn't work
-- for server-side API queries using dbPool (direct pg connection).
--
-- This migration:
-- 1. Drops the old JWT-based SELECT policy
-- 2. Creates a new policy using profiles table lookup
-- ============================================================

-- Drop the old policy
DROP POLICY IF EXISTS "Admins can read score history" ON pipeline_score_history;

-- Create new policy that works for authenticated users with admin roles
-- Server-side queries using postgres/service_role bypass RLS automatically
CREATE POLICY "Admins can read score history"
  ON pipeline_score_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'sales')
    )
  );
