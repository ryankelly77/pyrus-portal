-- Fix RLS policies for email_automations to prevent infinite recursion
-- when checking profiles table for admin role

-- Drop existing policies that cause recursion via profiles table
DROP POLICY IF EXISTS "admin_all_automations" ON email_automations;
DROP POLICY IF EXISTS "admin_all_steps" ON email_automation_steps;
DROP POLICY IF EXISTS "admin_all_enrollments" ON email_automation_enrollments;
DROP POLICY IF EXISTS "admin_all_logs" ON email_automation_step_logs;

-- Recreate policies using auth.jwt() to check role without hitting profiles table
-- This avoids the infinite recursion when profiles has RLS enabled

CREATE POLICY "admin_all_automations" ON email_automations FOR ALL
  USING (
    (auth.jwt() ->> 'role' = 'service_role') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
  );

CREATE POLICY "admin_all_steps" ON email_automation_steps FOR ALL
  USING (
    (auth.jwt() ->> 'role' = 'service_role') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
  );

CREATE POLICY "admin_all_enrollments" ON email_automation_enrollments FOR ALL
  USING (
    (auth.jwt() ->> 'role' = 'service_role') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
  );

CREATE POLICY "admin_all_logs" ON email_automation_step_logs FOR ALL
  USING (
    (auth.jwt() ->> 'role' = 'service_role') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
  );

-- Also drop the old service_ policies if they exist (they had USING(true) which is too permissive)
DROP POLICY IF EXISTS "service_enrollments" ON email_automation_enrollments;
DROP POLICY IF EXISTS "service_logs" ON email_automation_step_logs;
