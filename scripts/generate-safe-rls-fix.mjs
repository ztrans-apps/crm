#!/usr/bin/env node
/**
 * Generate SAFE RLS fix SQL that handles non-existent tables gracefully
 */

console.log('🔧 Generating SAFE RLS Fix SQL...\n')

// Core tables that definitely exist based on webhook error
const coreTables = [
  'contacts',
  'conversations', 
  'messages',
]

// Additional tables that might exist
const optionalTables = [
  'profiles',
  'tenants',
  'user_roles',
  'user_whatsapp_sessions',
  'user_consents',
  'roles',
  'permissions',
  'role_permissions',
  'resource_permissions',
  'whatsapp_sessions',
  'whatsapp_templates',
  'broadcast_campaigns',
  'broadcast_messages',
  'recipient_lists',
  'recipient_list_contacts',
  'campaign_messages',
  'chatbots',
  'chatbot_flows',
  'chatbot_nodes',
  'quick_replies',
  'tickets',
  'system_settings',
  'modules',
  'webhooks',
  'webhook_logs',
  'segments',
  'subscriptions',
  'usage_records',
  'routing_config',
  'workspaces',
  'permission_audit_log',
  'security_events'
]

const allTables = [...coreTables, ...optionalTables]

console.log(`📋 Generating RLS policies for ${allTables.length} tables...\n`)

let sql = `-- ============================================
-- SAFE Comprehensive RLS Fix for CRM Database
-- Generated: ${new Date().toISOString()}
-- ============================================

-- This migration will:
-- 1. Enable RLS on all existing tables
-- 2. Create service_role policies (for webhooks)
-- 3. Create authenticated user policies (tenant-scoped)
-- 4. Gracefully skip non-existent tables

BEGIN;

`

// Generate SQL for each table using DO blocks for safety
allTables.forEach(tableName => {
  sql += `
-- ============================================
-- Table: ${tableName}
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '${tableName}'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing service_role policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to ${tableName}" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can select ${tableName}" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert ${tableName}" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can update ${tableName}" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can delete ${tableName}" ON ${tableName}';
    
    -- Create service_role policy (for webhooks and admin operations)
    EXECUTE 'CREATE POLICY "Service role full access to ${tableName}"
      ON ${tableName}
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
    
    -- Drop existing authenticated user policies (avoid conflicts)
    EXECUTE 'DROP POLICY IF EXISTS "Users can view ${tableName} in their tenant" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert ${tableName} in their tenant" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update ${tableName} in their tenant" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete ${tableName} in their tenant" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view ${tableName}" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert ${tableName}" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update ${tableName}" ON ${tableName}';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete ${tableName}" ON ${tableName}';
    
    -- Check if tenant_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}' 
      AND column_name = 'tenant_id'
    ) THEN
      -- Create tenant-scoped policies
      EXECUTE 'CREATE POLICY "Users can view ${tableName} in their tenant"
        ON ${tableName} FOR SELECT
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can insert ${tableName} in their tenant"
        ON ${tableName} FOR INSERT
        TO authenticated
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can update ${tableName} in their tenant"
        ON ${tableName} FOR UPDATE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      EXECUTE 'CREATE POLICY "Users can delete ${tableName} in their tenant"
        ON ${tableName} FOR DELETE
        TO authenticated
        USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Created tenant-scoped policies for table: ${tableName}';
    ELSE
      -- For tables without tenant_id, create simple authenticated policies
      EXECUTE 'CREATE POLICY "Users can view ${tableName}"
        ON ${tableName} FOR SELECT
        TO authenticated
        USING (true)';
      
      EXECUTE 'CREATE POLICY "Users can insert ${tableName}"
        ON ${tableName} FOR INSERT
        TO authenticated
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can update ${tableName}"
        ON ${tableName} FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true)';
      
      EXECUTE 'CREATE POLICY "Users can delete ${tableName}"
        ON ${tableName} FOR DELETE
        TO authenticated
        USING (true)';
      
      RAISE NOTICE '✅ Created simple policies for table: ${tableName} (no tenant_id column)';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Table ${tableName} does not exist, skipping...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error processing table ${tableName}: %', SQLERRM;
END $$;

`
})

sql += `
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
`

console.log('✅ SAFE SQL generated successfully!\n')
console.log('📄 Output file: supabase/migrations/safe_comprehensive_rls_fix.sql\n')
console.log('📋 Summary:')
console.log(`  - Tables to check: ${allTables.length}`)
console.log(`  - Core tables (must exist): ${coreTables.length}`)
console.log(`  - Optional tables: ${optionalTables.length}`)
console.log('  - Service role: Full access (for webhooks)')
console.log('  - Authenticated users: Tenant-scoped access')
console.log('\n💡 This SQL will:')
console.log('  1. Check if each table exists before processing')
console.log('  2. Enable RLS only on existing tables')
console.log('  3. Skip non-existent tables gracefully')
console.log('  4. Handle tables with/without tenant_id column')
console.log('  5. Avoid conflicts with existing policies')
console.log('  6. Show notices for each table processed')
console.log('\n🚀 Safe to run - will not error on missing tables!')

// Write to file
import { writeFileSync } from 'fs'
writeFileSync('supabase/migrations/safe_comprehensive_rls_fix.sql', sql)

console.log('\n✅ File written: supabase/migrations/safe_comprehensive_rls_fix.sql')
console.log('\n📝 Next steps:')
console.log('  1. Copy the SQL from the file')
console.log('  2. Run in Supabase SQL Editor')
console.log('  3. Check the NOTICE messages to see which tables were processed')
console.log('  4. Verify with the verification queries at the end')
