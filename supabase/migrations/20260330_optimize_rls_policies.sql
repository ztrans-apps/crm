-- Comprehensive RLS Policy Optimization
-- This migration ensures all tables have proper RLS policies
-- and RBAC tables allow authenticated users to query their own permissions

-- ============================================================
-- 1. RBAC TABLES - Allow authenticated users to read their own permissions
-- ============================================================

-- Drop existing policies on RBAC tables
DROP POLICY IF EXISTS "Users can view all roles" ON roles;
DROP POLICY IF EXISTS "Users can view all permissions" ON permissions;
DROP POLICY IF EXISTS "Users can view their own user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON roles;
DROP POLICY IF EXISTS "Allow authenticated users to read permissions" ON permissions;
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read role_permissions" ON role_permissions;

-- Enable RLS on RBAC tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for RBAC tables
-- These allow ALL authenticated users to read RBAC data (needed for permission checks)
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

-- Admin write policies for RBAC tables
CREATE POLICY "admin_manage_roles" ON roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_key = 'owner'
    )
  );

CREATE POLICY "admin_manage_permissions" ON permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_key = 'owner'
    )
  );

CREATE POLICY "admin_manage_user_roles" ON user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_key = 'owner'
    )
  );

CREATE POLICY "admin_manage_role_permissions" ON role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_key = 'owner'
    )
  );

-- ============================================================
-- 2. PROFILES TABLE - Users can read all profiles, update own
-- ============================================================

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "service_role_manage_profiles" ON profiles
  FOR ALL TO service_role
  USING (true);

-- ============================================================
-- 3. CONTACTS TABLE - Authenticated users can manage contacts
-- ============================================================

DROP POLICY IF EXISTS "Users can view contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Service role can manage contacts" ON contacts;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_contacts" ON contacts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_create_contacts" ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_contacts" ON contacts
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "service_role_manage_contacts" ON contacts
  FOR ALL TO service_role
  USING (true);

-- ============================================================
-- 4. CONVERSATIONS TABLE - Authenticated users can manage conversations
-- ============================================================

DROP POLICY IF EXISTS "Users can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON conversations;
DROP POLICY IF EXISTS "Service role can manage conversations" ON conversations;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_conversations" ON conversations
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_create_conversations" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_conversations" ON conversations
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "service_role_manage_conversations" ON conversations
  FOR ALL TO service_role
  USING (true);

-- ============================================================
-- 5. MESSAGES TABLE - Authenticated users can manage messages
-- ============================================================

DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Service role can manage messages" ON messages;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_messages" ON messages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_create_messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_messages" ON messages
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "service_role_manage_messages" ON messages
  FOR ALL TO service_role
  USING (true);

-- ============================================================
-- 6. OTHER TABLES - Basic authenticated access
-- ============================================================

-- Conversation Notes
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_notes') THEN
    ALTER TABLE conversation_notes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_notes" ON conversation_notes;
    CREATE POLICY "authenticated_manage_notes" ON conversation_notes
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Labels
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'labels') THEN
    ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_labels" ON labels;
    CREATE POLICY "authenticated_manage_labels" ON labels
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Conversation Labels
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_labels') THEN
    ALTER TABLE conversation_labels ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_conversation_labels" ON conversation_labels;
    CREATE POLICY "authenticated_manage_conversation_labels" ON conversation_labels
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Quick Replies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quick_replies') THEN
    ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_quick_replies" ON quick_replies;
    CREATE POLICY "authenticated_manage_quick_replies" ON quick_replies
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Chatbots
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chatbots') THEN
    ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_chatbots" ON chatbots;
    CREATE POLICY "authenticated_manage_chatbots" ON chatbots
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Broadcasts
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'broadcasts') THEN
    ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_broadcasts" ON broadcasts;
    CREATE POLICY "authenticated_manage_broadcasts" ON broadcasts
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Broadcast Recipients
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'broadcast_recipients') THEN
    ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_broadcast_recipients" ON broadcast_recipients;
    CREATE POLICY "authenticated_manage_broadcast_recipients" ON broadcast_recipients
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- WhatsApp Sessions
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_sessions') THEN
    ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_whatsapp_sessions" ON whatsapp_sessions;
    CREATE POLICY "authenticated_manage_whatsapp_sessions" ON whatsapp_sessions
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Agent Status (skip if table doesn't exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_status') THEN
    ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_agent_status" ON agent_status;
    CREATE POLICY "authenticated_manage_agent_status" ON agent_status
      FOR ALL TO authenticated
      USING (true);
  END IF;
END $$;

-- API Keys
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_keys') THEN
    ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_manage_api_keys" ON api_keys;
    CREATE POLICY "authenticated_manage_api_keys" ON api_keys
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Audit Logs
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_read_audit_logs" ON audit_logs;
    CREATE POLICY "authenticated_read_audit_logs" ON audit_logs
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- 7. GRANT USAGE ON SCHEMA
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check RLS status on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies on RBAC tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('roles', 'permissions', 'user_roles', 'role_permissions')
ORDER BY tablename, policyname;
