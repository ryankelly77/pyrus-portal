-- ============================================================
-- Add Pipeline Permission to Role Permissions
-- ============================================================
--
-- Grants access to the Pipeline Dashboard for appropriate roles.
-- This runs after the role_permissions table is created.
-- ============================================================

-- Add pipeline permission for super_admin (always full access)
INSERT INTO public.role_permissions (role, menu_key, has_access)
VALUES ('super_admin', 'pipeline', true)
ON CONFLICT (role, menu_key) DO UPDATE SET has_access = EXCLUDED.has_access;

-- Add pipeline permission for admin
INSERT INTO public.role_permissions (role, menu_key, has_access)
VALUES ('admin', 'pipeline', true)
ON CONFLICT (role, menu_key) DO UPDATE SET has_access = EXCLUDED.has_access;

-- Add pipeline permission for production_team
INSERT INTO public.role_permissions (role, menu_key, has_access)
VALUES ('production_team', 'pipeline', true)
ON CONFLICT (role, menu_key) DO UPDATE SET has_access = EXCLUDED.has_access;

-- Add pipeline permission for sales (they should see their own pipeline)
INSERT INTO public.role_permissions (role, menu_key, has_access)
VALUES ('sales', 'pipeline', true)
ON CONFLICT (role, menu_key) DO UPDATE SET has_access = EXCLUDED.has_access;
