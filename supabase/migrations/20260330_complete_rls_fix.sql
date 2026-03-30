-- COMPLETE RLS FIX - Allow authenticated users to access all necessary tables
-- This fixes both permission loading and tenant loading issues

-- ============================================================
-- 1. RBAC TABLES - Critical for permission system
-- ============================================================

-- Drop ALL existing policies on RBAC tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('roles', 'permissions', 'user_roles', 'role_permissions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive READ policies
CREATE POLICY "allow_read_roles" ON roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "allow_read_permissions" ON permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "allow_read_user_roles" ON user_roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "allow_read_role_permissions" ON role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 2. PROFILES TABLE - Users need to read profiles
-- ============================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    END LOOP;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "allow_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- 3. TENANTS TABLE - Critical for tenant context
-- ============================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants') THEN
    -- Drop existing policies
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON tenants', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'tenants'
    );
    
    -- Enable RLS
    ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
    
    -- Allow all authenticated users to read tenants
    CREATE POLICY "allow_read_tenants" ON tenants
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================
-- 4. ORGANIZATIONS TABLE - For tenant context
-- ============================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations') THEN
    -- Drop existing policies
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON organizations', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'organizations'
    );
    
    -- Enable RLS
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    
    -- Allow all authenticated users to read organizations
    CREATE POLICY "allow_read_organizations" ON organizations
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================
-- 5. WORKSPACES TABLE - For tenant context
-- ============================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspaces') THEN
    -- Drop existing policies
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON workspaces', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'workspaces'
    );
    
    -- Enable RLS
    ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
    
    -- Allow all authenticated users to read workspaces
    CREATE POLICY "allow_read_workspaces" ON workspaces
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================
-- 6. CONTACTS, CONVERSATIONS, MESSAGES - Core CRM tables
-- ============================================================

DO $$ 
BEGIN
  -- Contacts
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contacts') THEN
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON contacts', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'contacts'
    );
    
    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "allow_all_contacts" ON contacts
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
      
    CREATE POLICY "service_role_contacts" ON contacts
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Conversations
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON conversations', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'conversations'
    );
    
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "allow_all_conversations" ON conversations
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
      
    CREATE POLICY "service_role_conversations" ON conversations
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Messages
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON messages', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'messages'
    );
    
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "allow_all_messages" ON messages
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
      
    CREATE POLICY "service_role_messages" ON messages
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check RLS status
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('roles', 'permissions', 'user_roles', 'role_permissions', 'profiles', 'tenants', 'contacts', 'conversations', 'messages')
ORDER BY tablename;

-- Check policies
SELECT 
  'Policies Created' as check_type,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('roles', 'permissions', 'user_roles', 'role_permissions', 'profiles', 'tenants')
ORDER BY tablename, policyname;
