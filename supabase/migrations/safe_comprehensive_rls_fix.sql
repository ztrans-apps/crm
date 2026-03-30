-- ============================================
-- SAFE Comprehensive RLS Fix for CRM Database
-- Generated: 2026-03-30T09:39:02.848Z
-- ============================================

-- This migration will:
-- 1. Enable RLS on all existing tables
-- 2. Create service_role policies (for webhooks)
-- 3. Create authenticated user policies (tenant-scoped)
-- 4. Gracefully skip non-existent tables

BEGIN;


-- ============================================
-- Table: contacts
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE contacts ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to contacts" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select contacts" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert contacts" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update contacts" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete contacts" ON contacts';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to contacts"
      ON contacts
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert contacts in their tenant" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view contacts" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert contacts" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update contacts" ON contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete contacts" ON contacts';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contacts' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view contacts in their tenant"
        ON contacts FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert contacts in their tenant"
        ON contacts FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update contacts in their tenant"
        ON contacts FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete contacts in their tenant"
        ON contacts FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: contacts';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view contacts"
        ON contacts FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert contacts"
        ON contacts FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update contacts"
        ON contacts FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete contacts"
        ON contacts FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: contacts (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table contacts does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table contacts: %', SQLERRM;
END $$;


-- ============================================
-- Table: conversations
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE conversations ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to conversations" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select conversations" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert conversations" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update conversations" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete conversations" ON conversations';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to conversations"
      ON conversations
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view conversations in their tenant" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert conversations in their tenant" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update conversations in their tenant" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete conversations in their tenant" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view conversations" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert conversations" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update conversations" ON conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete conversations" ON conversations';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view conversations in their tenant"
        ON conversations FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert conversations in their tenant"
        ON conversations FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update conversations in their tenant"
        ON conversations FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete conversations in their tenant"
        ON conversations FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: conversations';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view conversations"
        ON conversations FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert conversations"
        ON conversations FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update conversations"
        ON conversations FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete conversations"
        ON conversations FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: conversations (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table conversations does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table conversations: %', SQLERRM;
END $$;


-- ============================================
-- Table: messages
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE messages ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete messages" ON messages';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to messages"
      ON messages
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view messages in their tenant" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert messages in their tenant" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update messages in their tenant" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete messages in their tenant" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update messages" ON messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete messages" ON messages';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view messages in their tenant"
        ON messages FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert messages in their tenant"
        ON messages FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update messages in their tenant"
        ON messages FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete messages in their tenant"
        ON messages FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: messages';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view messages"
        ON messages FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert messages"
        ON messages FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update messages"
        ON messages FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete messages"
        ON messages FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: messages (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table messages does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table messages: %', SQLERRM;
END $$;


-- ============================================
-- Table: profiles
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select profiles" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update profiles" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete profiles" ON profiles';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to profiles"
      ON profiles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert profiles in their tenant" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update profiles in their tenant" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete profiles in their tenant" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view profiles" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert profiles" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update profiles" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete profiles" ON profiles';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view profiles in their tenant"
        ON profiles FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert profiles in their tenant"
        ON profiles FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update profiles in their tenant"
        ON profiles FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete profiles in their tenant"
        ON profiles FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: profiles';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view profiles"
        ON profiles FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert profiles"
        ON profiles FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update profiles"
        ON profiles FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete profiles"
        ON profiles FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: profiles (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table profiles does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table profiles: %', SQLERRM;
END $$;


-- ============================================
-- Table: tenants
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE tenants ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete tenants" ON tenants';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to tenants"
      ON tenants
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view tenants in their tenant" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert tenants in their tenant" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update tenants in their tenant" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete tenants in their tenant" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete tenants" ON tenants';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tenants' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view tenants in their tenant"
        ON tenants FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert tenants in their tenant"
        ON tenants FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update tenants in their tenant"
        ON tenants FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete tenants in their tenant"
        ON tenants FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: tenants';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view tenants"
        ON tenants FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert tenants"
        ON tenants FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update tenants"
        ON tenants FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete tenants"
        ON tenants FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: tenants (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table tenants does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table tenants: %', SQLERRM;
END $$;


-- ============================================
-- Table: user_roles
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to user_roles" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select user_roles" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert user_roles" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update user_roles" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete user_roles" ON user_roles';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to user_roles"
      ON user_roles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view user_roles in their tenant" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert user_roles in their tenant" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update user_roles in their tenant" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete user_roles in their tenant" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view user_roles" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert user_roles" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update user_roles" ON user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete user_roles" ON user_roles';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_roles' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view user_roles in their tenant"
        ON user_roles FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert user_roles in their tenant"
        ON user_roles FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update user_roles in their tenant"
        ON user_roles FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete user_roles in their tenant"
        ON user_roles FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: user_roles';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view user_roles"
        ON user_roles FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert user_roles"
        ON user_roles FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update user_roles"
        ON user_roles FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete user_roles"
        ON user_roles FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: user_roles (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table user_roles does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table user_roles: %', SQLERRM;
END $$;


-- ============================================
-- Table: user_whatsapp_sessions
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_whatsapp_sessions'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE user_whatsapp_sessions ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to user_whatsapp_sessions" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select user_whatsapp_sessions" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert user_whatsapp_sessions" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update user_whatsapp_sessions" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete user_whatsapp_sessions" ON user_whatsapp_sessions';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to user_whatsapp_sessions"
      ON user_whatsapp_sessions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view user_whatsapp_sessions in their tenant" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert user_whatsapp_sessions in their tenant" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update user_whatsapp_sessions in their tenant" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete user_whatsapp_sessions in their tenant" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view user_whatsapp_sessions" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert user_whatsapp_sessions" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update user_whatsapp_sessions" ON user_whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete user_whatsapp_sessions" ON user_whatsapp_sessions';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_whatsapp_sessions' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view user_whatsapp_sessions in their tenant"
        ON user_whatsapp_sessions FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert user_whatsapp_sessions in their tenant"
        ON user_whatsapp_sessions FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update user_whatsapp_sessions in their tenant"
        ON user_whatsapp_sessions FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete user_whatsapp_sessions in their tenant"
        ON user_whatsapp_sessions FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: user_whatsapp_sessions';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view user_whatsapp_sessions"
        ON user_whatsapp_sessions FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert user_whatsapp_sessions"
        ON user_whatsapp_sessions FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update user_whatsapp_sessions"
        ON user_whatsapp_sessions FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete user_whatsapp_sessions"
        ON user_whatsapp_sessions FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: user_whatsapp_sessions (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table user_whatsapp_sessions does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table user_whatsapp_sessions: %', SQLERRM;
END $$;


-- ============================================
-- Table: user_consents
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_consents'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to user_consents" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select user_consents" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert user_consents" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update user_consents" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete user_consents" ON user_consents';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to user_consents"
      ON user_consents
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view user_consents in their tenant" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert user_consents in their tenant" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update user_consents in their tenant" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete user_consents in their tenant" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view user_consents" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert user_consents" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update user_consents" ON user_consents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete user_consents" ON user_consents';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_consents' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view user_consents in their tenant"
        ON user_consents FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert user_consents in their tenant"
        ON user_consents FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update user_consents in their tenant"
        ON user_consents FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete user_consents in their tenant"
        ON user_consents FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: user_consents';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view user_consents"
        ON user_consents FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert user_consents"
        ON user_consents FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update user_consents"
        ON user_consents FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete user_consents"
        ON user_consents FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: user_consents (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table user_consents does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table user_consents: %', SQLERRM;
END $$;


-- ============================================
-- Table: roles
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'roles'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE roles ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to roles" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select roles" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert roles" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update roles" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete roles" ON roles';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to roles"
      ON roles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view roles in their tenant" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert roles in their tenant" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update roles in their tenant" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete roles in their tenant" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view roles" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert roles" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update roles" ON roles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete roles" ON roles';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'roles' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view roles in their tenant"
        ON roles FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert roles in their tenant"
        ON roles FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update roles in their tenant"
        ON roles FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete roles in their tenant"
        ON roles FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: roles';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view roles"
        ON roles FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert roles"
        ON roles FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update roles"
        ON roles FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete roles"
        ON roles FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: roles (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table roles does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table roles: %', SQLERRM;
END $$;


-- ============================================
-- Table: permissions
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'permissions'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE permissions ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to permissions" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select permissions" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert permissions" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update permissions" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete permissions" ON permissions';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to permissions"
      ON permissions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view permissions in their tenant" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert permissions in their tenant" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update permissions in their tenant" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete permissions in their tenant" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view permissions" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert permissions" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update permissions" ON permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete permissions" ON permissions';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'permissions' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view permissions in their tenant"
        ON permissions FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert permissions in their tenant"
        ON permissions FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update permissions in their tenant"
        ON permissions FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete permissions in their tenant"
        ON permissions FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: permissions';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view permissions"
        ON permissions FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert permissions"
        ON permissions FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update permissions"
        ON permissions FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete permissions"
        ON permissions FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: permissions (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table permissions does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table permissions: %', SQLERRM;
END $$;


-- ============================================
-- Table: role_permissions
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'role_permissions'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to role_permissions" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select role_permissions" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert role_permissions" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update role_permissions" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete role_permissions" ON role_permissions';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to role_permissions"
      ON role_permissions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view role_permissions in their tenant" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert role_permissions in their tenant" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update role_permissions in their tenant" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete role_permissions in their tenant" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view role_permissions" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert role_permissions" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update role_permissions" ON role_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete role_permissions" ON role_permissions';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'role_permissions' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view role_permissions in their tenant"
        ON role_permissions FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert role_permissions in their tenant"
        ON role_permissions FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update role_permissions in their tenant"
        ON role_permissions FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete role_permissions in their tenant"
        ON role_permissions FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: role_permissions';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view role_permissions"
        ON role_permissions FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert role_permissions"
        ON role_permissions FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update role_permissions"
        ON role_permissions FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete role_permissions"
        ON role_permissions FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: role_permissions (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table role_permissions does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table role_permissions: %', SQLERRM;
END $$;


-- ============================================
-- Table: resource_permissions
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'resource_permissions'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE resource_permissions ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to resource_permissions" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select resource_permissions" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert resource_permissions" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update resource_permissions" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete resource_permissions" ON resource_permissions';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to resource_permissions"
      ON resource_permissions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view resource_permissions in their tenant" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert resource_permissions in their tenant" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update resource_permissions in their tenant" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete resource_permissions in their tenant" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view resource_permissions" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert resource_permissions" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update resource_permissions" ON resource_permissions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete resource_permissions" ON resource_permissions';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'resource_permissions' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view resource_permissions in their tenant"
        ON resource_permissions FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert resource_permissions in their tenant"
        ON resource_permissions FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update resource_permissions in their tenant"
        ON resource_permissions FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete resource_permissions in their tenant"
        ON resource_permissions FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: resource_permissions';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view resource_permissions"
        ON resource_permissions FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert resource_permissions"
        ON resource_permissions FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update resource_permissions"
        ON resource_permissions FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete resource_permissions"
        ON resource_permissions FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: resource_permissions (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table resource_permissions does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table resource_permissions: %', SQLERRM;
END $$;


-- ============================================
-- Table: whatsapp_sessions
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_sessions'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to whatsapp_sessions" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select whatsapp_sessions" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert whatsapp_sessions" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update whatsapp_sessions" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete whatsapp_sessions" ON whatsapp_sessions';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to whatsapp_sessions"
      ON whatsapp_sessions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view whatsapp_sessions in their tenant" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert whatsapp_sessions in their tenant" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update whatsapp_sessions in their tenant" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete whatsapp_sessions in their tenant" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view whatsapp_sessions" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert whatsapp_sessions" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update whatsapp_sessions" ON whatsapp_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete whatsapp_sessions" ON whatsapp_sessions';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_sessions' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view whatsapp_sessions in their tenant"
        ON whatsapp_sessions FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert whatsapp_sessions in their tenant"
        ON whatsapp_sessions FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update whatsapp_sessions in their tenant"
        ON whatsapp_sessions FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete whatsapp_sessions in their tenant"
        ON whatsapp_sessions FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: whatsapp_sessions';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view whatsapp_sessions"
        ON whatsapp_sessions FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert whatsapp_sessions"
        ON whatsapp_sessions FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update whatsapp_sessions"
        ON whatsapp_sessions FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete whatsapp_sessions"
        ON whatsapp_sessions FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: whatsapp_sessions (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table whatsapp_sessions does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table whatsapp_sessions: %', SQLERRM;
END $$;


-- ============================================
-- Table: whatsapp_templates
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_templates'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to whatsapp_templates" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select whatsapp_templates" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert whatsapp_templates" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update whatsapp_templates" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete whatsapp_templates" ON whatsapp_templates';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to whatsapp_templates"
      ON whatsapp_templates
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view whatsapp_templates in their tenant" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert whatsapp_templates in their tenant" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update whatsapp_templates in their tenant" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete whatsapp_templates in their tenant" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view whatsapp_templates" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert whatsapp_templates" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update whatsapp_templates" ON whatsapp_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete whatsapp_templates" ON whatsapp_templates';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_templates' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view whatsapp_templates in their tenant"
        ON whatsapp_templates FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert whatsapp_templates in their tenant"
        ON whatsapp_templates FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update whatsapp_templates in their tenant"
        ON whatsapp_templates FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete whatsapp_templates in their tenant"
        ON whatsapp_templates FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: whatsapp_templates';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view whatsapp_templates"
        ON whatsapp_templates FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert whatsapp_templates"
        ON whatsapp_templates FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update whatsapp_templates"
        ON whatsapp_templates FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete whatsapp_templates"
        ON whatsapp_templates FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: whatsapp_templates (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table whatsapp_templates does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table whatsapp_templates: %', SQLERRM;
END $$;


-- ============================================
-- Table: broadcast_campaigns
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'broadcast_campaigns'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE broadcast_campaigns ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to broadcast_campaigns" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select broadcast_campaigns" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert broadcast_campaigns" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update broadcast_campaigns" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete broadcast_campaigns" ON broadcast_campaigns';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to broadcast_campaigns"
      ON broadcast_campaigns
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view broadcast_campaigns in their tenant" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert broadcast_campaigns in their tenant" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update broadcast_campaigns in their tenant" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete broadcast_campaigns in their tenant" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view broadcast_campaigns" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert broadcast_campaigns" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update broadcast_campaigns" ON broadcast_campaigns';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete broadcast_campaigns" ON broadcast_campaigns';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'broadcast_campaigns' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view broadcast_campaigns in their tenant"
        ON broadcast_campaigns FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert broadcast_campaigns in their tenant"
        ON broadcast_campaigns FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update broadcast_campaigns in their tenant"
        ON broadcast_campaigns FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete broadcast_campaigns in their tenant"
        ON broadcast_campaigns FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: broadcast_campaigns';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view broadcast_campaigns"
        ON broadcast_campaigns FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert broadcast_campaigns"
        ON broadcast_campaigns FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update broadcast_campaigns"
        ON broadcast_campaigns FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete broadcast_campaigns"
        ON broadcast_campaigns FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: broadcast_campaigns (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table broadcast_campaigns does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table broadcast_campaigns: %', SQLERRM;
END $$;


-- ============================================
-- Table: broadcast_messages
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'broadcast_messages'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to broadcast_messages" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select broadcast_messages" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert broadcast_messages" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update broadcast_messages" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete broadcast_messages" ON broadcast_messages';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to broadcast_messages"
      ON broadcast_messages
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view broadcast_messages in their tenant" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert broadcast_messages in their tenant" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update broadcast_messages in their tenant" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete broadcast_messages in their tenant" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view broadcast_messages" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert broadcast_messages" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update broadcast_messages" ON broadcast_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete broadcast_messages" ON broadcast_messages';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'broadcast_messages' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view broadcast_messages in their tenant"
        ON broadcast_messages FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert broadcast_messages in their tenant"
        ON broadcast_messages FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update broadcast_messages in their tenant"
        ON broadcast_messages FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete broadcast_messages in their tenant"
        ON broadcast_messages FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: broadcast_messages';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view broadcast_messages"
        ON broadcast_messages FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert broadcast_messages"
        ON broadcast_messages FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update broadcast_messages"
        ON broadcast_messages FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete broadcast_messages"
        ON broadcast_messages FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: broadcast_messages (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table broadcast_messages does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table broadcast_messages: %', SQLERRM;
END $$;


-- ============================================
-- Table: recipient_lists
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'recipient_lists'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE recipient_lists ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to recipient_lists" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select recipient_lists" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert recipient_lists" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update recipient_lists" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete recipient_lists" ON recipient_lists';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to recipient_lists"
      ON recipient_lists
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view recipient_lists in their tenant" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert recipient_lists in their tenant" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update recipient_lists in their tenant" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete recipient_lists in their tenant" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view recipient_lists" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert recipient_lists" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update recipient_lists" ON recipient_lists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete recipient_lists" ON recipient_lists';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'recipient_lists' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view recipient_lists in their tenant"
        ON recipient_lists FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert recipient_lists in their tenant"
        ON recipient_lists FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update recipient_lists in their tenant"
        ON recipient_lists FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete recipient_lists in their tenant"
        ON recipient_lists FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: recipient_lists';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view recipient_lists"
        ON recipient_lists FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert recipient_lists"
        ON recipient_lists FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update recipient_lists"
        ON recipient_lists FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete recipient_lists"
        ON recipient_lists FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: recipient_lists (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table recipient_lists does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table recipient_lists: %', SQLERRM;
END $$;


-- ============================================
-- Table: recipient_list_contacts
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'recipient_list_contacts'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE recipient_list_contacts ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to recipient_list_contacts" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select recipient_list_contacts" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert recipient_list_contacts" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update recipient_list_contacts" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete recipient_list_contacts" ON recipient_list_contacts';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to recipient_list_contacts"
      ON recipient_list_contacts
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view recipient_list_contacts in their tenant" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert recipient_list_contacts in their tenant" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update recipient_list_contacts in their tenant" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete recipient_list_contacts in their tenant" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view recipient_list_contacts" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert recipient_list_contacts" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update recipient_list_contacts" ON recipient_list_contacts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete recipient_list_contacts" ON recipient_list_contacts';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'recipient_list_contacts' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view recipient_list_contacts in their tenant"
        ON recipient_list_contacts FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert recipient_list_contacts in their tenant"
        ON recipient_list_contacts FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update recipient_list_contacts in their tenant"
        ON recipient_list_contacts FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete recipient_list_contacts in their tenant"
        ON recipient_list_contacts FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: recipient_list_contacts';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view recipient_list_contacts"
        ON recipient_list_contacts FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert recipient_list_contacts"
        ON recipient_list_contacts FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update recipient_list_contacts"
        ON recipient_list_contacts FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete recipient_list_contacts"
        ON recipient_list_contacts FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: recipient_list_contacts (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table recipient_list_contacts does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table recipient_list_contacts: %', SQLERRM;
END $$;


-- ============================================
-- Table: campaign_messages
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'campaign_messages'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to campaign_messages" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select campaign_messages" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert campaign_messages" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update campaign_messages" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete campaign_messages" ON campaign_messages';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to campaign_messages"
      ON campaign_messages
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view campaign_messages in their tenant" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert campaign_messages in their tenant" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update campaign_messages in their tenant" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete campaign_messages in their tenant" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view campaign_messages" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert campaign_messages" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update campaign_messages" ON campaign_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete campaign_messages" ON campaign_messages';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'campaign_messages' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view campaign_messages in their tenant"
        ON campaign_messages FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert campaign_messages in their tenant"
        ON campaign_messages FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update campaign_messages in their tenant"
        ON campaign_messages FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete campaign_messages in their tenant"
        ON campaign_messages FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: campaign_messages';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view campaign_messages"
        ON campaign_messages FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert campaign_messages"
        ON campaign_messages FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update campaign_messages"
        ON campaign_messages FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete campaign_messages"
        ON campaign_messages FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: campaign_messages (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table campaign_messages does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table campaign_messages: %', SQLERRM;
END $$;


-- ============================================
-- Table: chatbots
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chatbots'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to chatbots" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select chatbots" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert chatbots" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update chatbots" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete chatbots" ON chatbots';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to chatbots"
      ON chatbots
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view chatbots in their tenant" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert chatbots in their tenant" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update chatbots in their tenant" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete chatbots in their tenant" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view chatbots" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert chatbots" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update chatbots" ON chatbots';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete chatbots" ON chatbots';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chatbots' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view chatbots in their tenant"
        ON chatbots FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert chatbots in their tenant"
        ON chatbots FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update chatbots in their tenant"
        ON chatbots FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete chatbots in their tenant"
        ON chatbots FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: chatbots';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view chatbots"
        ON chatbots FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert chatbots"
        ON chatbots FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update chatbots"
        ON chatbots FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete chatbots"
        ON chatbots FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: chatbots (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table chatbots does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table chatbots: %', SQLERRM;
END $$;


-- ============================================
-- Table: chatbot_flows
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chatbot_flows'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE chatbot_flows ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to chatbot_flows" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select chatbot_flows" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert chatbot_flows" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update chatbot_flows" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete chatbot_flows" ON chatbot_flows';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to chatbot_flows"
      ON chatbot_flows
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view chatbot_flows in their tenant" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert chatbot_flows in their tenant" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update chatbot_flows in their tenant" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete chatbot_flows in their tenant" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view chatbot_flows" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert chatbot_flows" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update chatbot_flows" ON chatbot_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete chatbot_flows" ON chatbot_flows';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chatbot_flows' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view chatbot_flows in their tenant"
        ON chatbot_flows FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert chatbot_flows in their tenant"
        ON chatbot_flows FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update chatbot_flows in their tenant"
        ON chatbot_flows FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete chatbot_flows in their tenant"
        ON chatbot_flows FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: chatbot_flows';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view chatbot_flows"
        ON chatbot_flows FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert chatbot_flows"
        ON chatbot_flows FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update chatbot_flows"
        ON chatbot_flows FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete chatbot_flows"
        ON chatbot_flows FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: chatbot_flows (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table chatbot_flows does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table chatbot_flows: %', SQLERRM;
END $$;


-- ============================================
-- Table: chatbot_nodes
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chatbot_nodes'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE chatbot_nodes ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to chatbot_nodes" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select chatbot_nodes" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert chatbot_nodes" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update chatbot_nodes" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete chatbot_nodes" ON chatbot_nodes';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to chatbot_nodes"
      ON chatbot_nodes
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view chatbot_nodes in their tenant" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert chatbot_nodes in their tenant" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update chatbot_nodes in their tenant" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete chatbot_nodes in their tenant" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view chatbot_nodes" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert chatbot_nodes" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update chatbot_nodes" ON chatbot_nodes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete chatbot_nodes" ON chatbot_nodes';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chatbot_nodes' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view chatbot_nodes in their tenant"
        ON chatbot_nodes FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert chatbot_nodes in their tenant"
        ON chatbot_nodes FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update chatbot_nodes in their tenant"
        ON chatbot_nodes FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete chatbot_nodes in their tenant"
        ON chatbot_nodes FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: chatbot_nodes';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view chatbot_nodes"
        ON chatbot_nodes FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert chatbot_nodes"
        ON chatbot_nodes FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update chatbot_nodes"
        ON chatbot_nodes FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete chatbot_nodes"
        ON chatbot_nodes FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: chatbot_nodes (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table chatbot_nodes does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table chatbot_nodes: %', SQLERRM;
END $$;


-- ============================================
-- Table: quick_replies
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quick_replies'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to quick_replies" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select quick_replies" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert quick_replies" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update quick_replies" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete quick_replies" ON quick_replies';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to quick_replies"
      ON quick_replies
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view quick_replies in their tenant" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert quick_replies in their tenant" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update quick_replies in their tenant" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete quick_replies in their tenant" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view quick_replies" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert quick_replies" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update quick_replies" ON quick_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete quick_replies" ON quick_replies';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'quick_replies' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view quick_replies in their tenant"
        ON quick_replies FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert quick_replies in their tenant"
        ON quick_replies FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update quick_replies in their tenant"
        ON quick_replies FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete quick_replies in their tenant"
        ON quick_replies FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: quick_replies';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view quick_replies"
        ON quick_replies FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert quick_replies"
        ON quick_replies FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update quick_replies"
        ON quick_replies FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete quick_replies"
        ON quick_replies FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: quick_replies (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table quick_replies does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table quick_replies: %', SQLERRM;
END $$;


-- ============================================
-- Table: tickets
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE tickets ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to tickets" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select tickets" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert tickets" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update tickets" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete tickets" ON tickets';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to tickets"
      ON tickets
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view tickets in their tenant" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert tickets in their tenant" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update tickets in their tenant" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete tickets in their tenant" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view tickets" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert tickets" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update tickets" ON tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete tickets" ON tickets';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tickets' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view tickets in their tenant"
        ON tickets FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert tickets in their tenant"
        ON tickets FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update tickets in their tenant"
        ON tickets FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete tickets in their tenant"
        ON tickets FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: tickets';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view tickets"
        ON tickets FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert tickets"
        ON tickets FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update tickets"
        ON tickets FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete tickets"
        ON tickets FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: tickets (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table tickets does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table tickets: %', SQLERRM;
END $$;


-- ============================================
-- Table: system_settings
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'system_settings'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to system_settings" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select system_settings" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert system_settings" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update system_settings" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete system_settings" ON system_settings';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to system_settings"
      ON system_settings
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view system_settings in their tenant" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert system_settings in their tenant" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update system_settings in their tenant" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete system_settings in their tenant" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view system_settings" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert system_settings" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update system_settings" ON system_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete system_settings" ON system_settings';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'system_settings' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view system_settings in their tenant"
        ON system_settings FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert system_settings in their tenant"
        ON system_settings FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update system_settings in their tenant"
        ON system_settings FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete system_settings in their tenant"
        ON system_settings FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: system_settings';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view system_settings"
        ON system_settings FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert system_settings"
        ON system_settings FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update system_settings"
        ON system_settings FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete system_settings"
        ON system_settings FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: system_settings (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table system_settings does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table system_settings: %', SQLERRM;
END $$;


-- ============================================
-- Table: modules
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'modules'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE modules ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to modules" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select modules" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert modules" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update modules" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete modules" ON modules';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to modules"
      ON modules
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view modules in their tenant" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert modules in their tenant" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update modules in their tenant" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete modules in their tenant" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view modules" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert modules" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update modules" ON modules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete modules" ON modules';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'modules' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view modules in their tenant"
        ON modules FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert modules in their tenant"
        ON modules FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update modules in their tenant"
        ON modules FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete modules in their tenant"
        ON modules FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: modules';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view modules"
        ON modules FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert modules"
        ON modules FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update modules"
        ON modules FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete modules"
        ON modules FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: modules (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table modules does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table modules: %', SQLERRM;
END $$;


-- ============================================
-- Table: webhooks
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'webhooks'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to webhooks" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select webhooks" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert webhooks" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update webhooks" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete webhooks" ON webhooks';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to webhooks"
      ON webhooks
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view webhooks in their tenant" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert webhooks in their tenant" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update webhooks in their tenant" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete webhooks in their tenant" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view webhooks" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert webhooks" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update webhooks" ON webhooks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete webhooks" ON webhooks';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'webhooks' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view webhooks in their tenant"
        ON webhooks FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert webhooks in their tenant"
        ON webhooks FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update webhooks in their tenant"
        ON webhooks FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete webhooks in their tenant"
        ON webhooks FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: webhooks';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view webhooks"
        ON webhooks FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert webhooks"
        ON webhooks FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update webhooks"
        ON webhooks FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete webhooks"
        ON webhooks FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: webhooks (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table webhooks does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table webhooks: %', SQLERRM;
END $$;


-- ============================================
-- Table: webhook_logs
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'webhook_logs'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to webhook_logs" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select webhook_logs" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert webhook_logs" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update webhook_logs" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete webhook_logs" ON webhook_logs';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to webhook_logs"
      ON webhook_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view webhook_logs in their tenant" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert webhook_logs in their tenant" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update webhook_logs in their tenant" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete webhook_logs in their tenant" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view webhook_logs" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert webhook_logs" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update webhook_logs" ON webhook_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete webhook_logs" ON webhook_logs';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'webhook_logs' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view webhook_logs in their tenant"
        ON webhook_logs FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert webhook_logs in their tenant"
        ON webhook_logs FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update webhook_logs in their tenant"
        ON webhook_logs FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete webhook_logs in their tenant"
        ON webhook_logs FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: webhook_logs';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view webhook_logs"
        ON webhook_logs FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert webhook_logs"
        ON webhook_logs FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update webhook_logs"
        ON webhook_logs FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete webhook_logs"
        ON webhook_logs FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: webhook_logs (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table webhook_logs does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table webhook_logs: %', SQLERRM;
END $$;


-- ============================================
-- Table: segments
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'segments'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE segments ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to segments" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select segments" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert segments" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update segments" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete segments" ON segments';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to segments"
      ON segments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view segments in their tenant" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert segments in their tenant" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update segments in their tenant" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete segments in their tenant" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view segments" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert segments" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update segments" ON segments';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete segments" ON segments';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'segments' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view segments in their tenant"
        ON segments FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert segments in their tenant"
        ON segments FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update segments in their tenant"
        ON segments FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete segments in their tenant"
        ON segments FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: segments';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view segments"
        ON segments FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert segments"
        ON segments FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update segments"
        ON segments FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete segments"
        ON segments FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: segments (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table segments does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table segments: %', SQLERRM;
END $$;


-- ============================================
-- Table: subscriptions
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to subscriptions" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select subscriptions" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert subscriptions" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update subscriptions" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete subscriptions" ON subscriptions';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to subscriptions"
      ON subscriptions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view subscriptions in their tenant" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert subscriptions in their tenant" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update subscriptions in their tenant" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete subscriptions in their tenant" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view subscriptions" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert subscriptions" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update subscriptions" ON subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete subscriptions" ON subscriptions';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subscriptions' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view subscriptions in their tenant"
        ON subscriptions FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert subscriptions in their tenant"
        ON subscriptions FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update subscriptions in their tenant"
        ON subscriptions FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete subscriptions in their tenant"
        ON subscriptions FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: subscriptions';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view subscriptions"
        ON subscriptions FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert subscriptions"
        ON subscriptions FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update subscriptions"
        ON subscriptions FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete subscriptions"
        ON subscriptions FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: subscriptions (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table subscriptions does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table subscriptions: %', SQLERRM;
END $$;


-- ============================================
-- Table: usage_records
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'usage_records'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to usage_records" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select usage_records" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert usage_records" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update usage_records" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete usage_records" ON usage_records';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to usage_records"
      ON usage_records
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view usage_records in their tenant" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert usage_records in their tenant" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update usage_records in their tenant" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete usage_records in their tenant" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view usage_records" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert usage_records" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update usage_records" ON usage_records';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete usage_records" ON usage_records';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'usage_records' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view usage_records in their tenant"
        ON usage_records FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert usage_records in their tenant"
        ON usage_records FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update usage_records in their tenant"
        ON usage_records FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete usage_records in their tenant"
        ON usage_records FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: usage_records';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view usage_records"
        ON usage_records FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert usage_records"
        ON usage_records FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update usage_records"
        ON usage_records FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete usage_records"
        ON usage_records FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: usage_records (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table usage_records does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table usage_records: %', SQLERRM;
END $$;


-- ============================================
-- Table: routing_config
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'routing_config'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE routing_config ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to routing_config" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select routing_config" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert routing_config" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update routing_config" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete routing_config" ON routing_config';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to routing_config"
      ON routing_config
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view routing_config in their tenant" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert routing_config in their tenant" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update routing_config in their tenant" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete routing_config in their tenant" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view routing_config" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert routing_config" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update routing_config" ON routing_config';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete routing_config" ON routing_config';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'routing_config' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view routing_config in their tenant"
        ON routing_config FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert routing_config in their tenant"
        ON routing_config FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update routing_config in their tenant"
        ON routing_config FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete routing_config in their tenant"
        ON routing_config FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: routing_config';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view routing_config"
        ON routing_config FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert routing_config"
        ON routing_config FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update routing_config"
        ON routing_config FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete routing_config"
        ON routing_config FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: routing_config (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table routing_config does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table routing_config: %', SQLERRM;
END $$;


-- ============================================
-- Table: workspaces
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'workspaces'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to workspaces" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select workspaces" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert workspaces" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update workspaces" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete workspaces" ON workspaces';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to workspaces"
      ON workspaces
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view workspaces in their tenant" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert workspaces in their tenant" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update workspaces in their tenant" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete workspaces in their tenant" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view workspaces" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert workspaces" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update workspaces" ON workspaces';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete workspaces" ON workspaces';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workspaces' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view workspaces in their tenant"
        ON workspaces FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert workspaces in their tenant"
        ON workspaces FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update workspaces in their tenant"
        ON workspaces FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete workspaces in their tenant"
        ON workspaces FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: workspaces';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view workspaces"
        ON workspaces FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert workspaces"
        ON workspaces FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update workspaces"
        ON workspaces FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete workspaces"
        ON workspaces FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: workspaces (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table workspaces does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table workspaces: %', SQLERRM;
END $$;


-- ============================================
-- Table: permission_audit_log
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'permission_audit_log'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to permission_audit_log" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select permission_audit_log" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert permission_audit_log" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update permission_audit_log" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete permission_audit_log" ON permission_audit_log';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to permission_audit_log"
      ON permission_audit_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view permission_audit_log in their tenant" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert permission_audit_log in their tenant" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update permission_audit_log in their tenant" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete permission_audit_log in their tenant" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view permission_audit_log" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert permission_audit_log" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update permission_audit_log" ON permission_audit_log';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete permission_audit_log" ON permission_audit_log';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'permission_audit_log' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view permission_audit_log in their tenant"
        ON permission_audit_log FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert permission_audit_log in their tenant"
        ON permission_audit_log FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update permission_audit_log in their tenant"
        ON permission_audit_log FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete permission_audit_log in their tenant"
        ON permission_audit_log FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: permission_audit_log';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view permission_audit_log"
        ON permission_audit_log FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert permission_audit_log"
        ON permission_audit_log FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update permission_audit_log"
        ON permission_audit_log FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete permission_audit_log"
        ON permission_audit_log FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: permission_audit_log (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table permission_audit_log does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table permission_audit_log: %', SQLERRM;
END $$;


-- ============================================
-- Table: security_events
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'security_events'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE security_events ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to security_events" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select security_events" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert security_events" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update security_events" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete security_events" ON security_events';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to security_events"
      ON security_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view security_events in their tenant" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert security_events in their tenant" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update security_events in their tenant" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete security_events in their tenant" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view security_events" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert security_events" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update security_events" ON security_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete security_events" ON security_events';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'security_events' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view security_events in their tenant"
        ON security_events FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert security_events in their tenant"
        ON security_events FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update security_events in their tenant"
        ON security_events FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete security_events in their tenant"
        ON security_events FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: security_events';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view security_events"
        ON security_events FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert security_events"
        ON security_events FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update security_events"
        ON security_events FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete security_events"
        ON security_events FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: security_events (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table security_events does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table security_events: %', SQLERRM;
END $$;


COMMIT;

-- ============================================
-- Verification Queries
-- ============================================

-- Check RLS status for existing tables
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies count per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Show all policies
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
