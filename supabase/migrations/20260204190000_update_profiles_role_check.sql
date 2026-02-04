-- Update profiles role check constraint to include all roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['super_admin', 'admin', 'client', 'production_team', 'sales']));
