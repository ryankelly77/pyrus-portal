-- ============================================================
-- Add Email Templates Permission to Role Permissions
-- ============================================================
--
-- Grants access to the Email Templates management page.
-- Only super_admin and admin have access by default.
-- ============================================================

-- Add emails permission for super_admin (always full access)
INSERT INTO public.role_permissions (role, menu_key, has_access)
VALUES ('super_admin', 'emails', true)
ON CONFLICT (role, menu_key) DO UPDATE SET has_access = EXCLUDED.has_access;

-- Add emails permission for admin
INSERT INTO public.role_permissions (role, menu_key, has_access)
VALUES ('admin', 'emails', true)
ON CONFLICT (role, menu_key) DO UPDATE SET has_access = EXCLUDED.has_access;

-- No access for production_team by default
INSERT INTO public.role_permissions (role, menu_key, has_access)
VALUES ('production_team', 'emails', false)
ON CONFLICT (role, menu_key) DO UPDATE SET has_access = EXCLUDED.has_access;

-- No access for sales by default
INSERT INTO public.role_permissions (role, menu_key, has_access)
VALUES ('sales', 'emails', false)
ON CONFLICT (role, menu_key) DO UPDATE SET has_access = EXCLUDED.has_access;
