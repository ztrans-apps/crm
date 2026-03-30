-- MINIMAL RBAC FIX
-- This migration ONLY fixes the critical RBAC tables to allow permission checks
-- Run this first, then apply the full migration later if needed

-- ============================================================
-- RBAC TABLES ONLY - Allow authenticated users to read permissions
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all roles" ON roles;
DROP POLICY IF EXISTS "Users can view all permissions" ON permissions;
DROP POLICY IF EXISTS "Users can view their own user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON roles;
DROP POLICY IF EXISTS "Allow authenticated users to read permissions" ON permissions;
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "authenticated_read_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_read_permissions" ON permissions;
DROP POLICY IF EXISTS "authenticated_read_user_roles" ON user_roles;
DROP POLICY IF EXISTS "authenticated_read_role_permissions" ON role_permissions;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Create READ policies for ALL authenticated users
-- This is REQUIRED for the permission system to work
CREATE POLICY "authenticated_read_roles" ON roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_permissions" ON permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_user_roles" ON user_roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_role_permissions" ON role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- Verify the fix
SELECT 
  'RBAC Tables RLS Status' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('roles', 'permissions', 'user_roles', 'role_permissions')
ORDER BY tablename;

SELECT 
  'RBAC Read Policies' as info,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('roles', 'permissions', 'user_roles', 'role_permissions')
AND cmd = 'SELECT'
ORDER BY tablename;
