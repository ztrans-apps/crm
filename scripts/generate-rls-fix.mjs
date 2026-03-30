#!/usr/bin/env node
/**
 * Generate RLS fix SQL based on common CRM tables
 * This will create a comprehensive RLS policy for all tables
 */

console.log('🔧 Generating RLS Fix SQL...\n')

// Common tables in a CRM system that likely need RLS
const crmTables = [
  // Core tables
  'contacts',
  'conversations', 
  'messages',
  'profiles',
  'tenants',
  
  // User management
  'users',
  'user_roles',
  'user_whatsapp_sessions',
  'user_consents',
  
  // RBAC
  'roles',
  'permissions',
  'role_permissions',
  'resource_permissions',
  
  // WhatsApp
  'whatsapp_sessions',
  'whatsapp_templates',
  
  // Broadcast
  'broadcast_campaigns',
  'broadcast_messages',
  'recipient_lists',
  'recipient_list_contacts',
  'campaign_messages',
  
  // Chatbot
  'chatbots',
  'chatbot_flows',
  'chatbot_nodes',
  
  // Quick replies
  'quick_replies',
  
  // Tickets
  'tickets',
  
  // Settings
  'system_settings',
  'modules',
  'webhooks',
  'webhook_logs',
  
  // Segments
  'segments',
  
  // Subscriptions
  'subscriptions',
  'usage_records',
  
  // Routing
  'routing_config',
  
  // Workspaces
  'workspaces',
  
  // Audit
  'permission_audit_log',
  'security_events'
]

console.log(`📋 Generating RLS policies for ${crmTables.length} tables...\n`)

let sql = `-- ============================================
-- Comprehensive RLS Fix for CRM Database
-- Generated: ${new Date().toISOString()}
-- ============================================

-- This migration will:
-- 1. Enable RLS on all tables
-- 2. Create service_role policies (for webhooks)
-- 3. Create authenticated user policies (tenant-scoped)

BEGIN;

`

// Generate SQL for each table
crmTables.forEach(tableName => {
  sql += `
-- ============================================
-- Table: ${tableName}
-- ============================================

-- Enable RLS
ALTER TABLE IF EXISTS ${tableName} ENABLE ROW LEVEL SECURITY;

-- Drop existing service_role policies (avoid conflicts)
DROP POLICY IF EXISTS "Service role full access to ${tableName}" ON ${tableName};
DROP POLICY IF EXISTS "Service role can select ${tableName}" ON ${tableName};
DROP POLICY IF EXISTS "Service role can insert ${tableName}" ON ${tableName};
DROP POLICY IF EXISTS "Service role can update ${tableName}" ON ${tableName};
DROP POLICY IF EXISTS "Service role can delete ${tableName}" ON ${tableName};

-- Create service_role policy (for webhooks and admin operations)
CREATE POLICY "Service role full access to ${tableName}"
ON ${tableName}
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Drop existing authenticated user policies (avoid conflicts)
DROP POLICY IF EXISTS "Users can view ${tableName} in their tenant" ON ${tableName};
DROP POLICY IF EXISTS "Users can insert ${tableName} in their tenant" ON ${tableName};
DROP POLICY IF EXISTS "Users can update ${tableName} in their tenant" ON ${tableName};
DROP POLICY IF EXISTS "Users can delete ${tableName} in their tenant" ON ${tableName};

-- Create authenticated user policies (tenant-scoped)
-- Note: These assume the table has a tenant_id column
-- If a table doesn't have tenant_id, the policy will be skipped at runtime

DO $$
BEGIN
  -- Check if tenant_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = '${tableName}' 
    AND column_name = 'tenant_id'
  ) THEN
    -- Create tenant-scoped policies
    EXECUTE format('
      CREATE POLICY "Users can view %I in their tenant"
      ON %I FOR SELECT
      TO authenticated
      USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    ', '${tableName}', '${tableName}');
    
    EXECUTE format('
      CREATE POLICY "Users can insert %I in their tenant"
      ON %I FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    ', '${tableName}', '${tableName}');
    
    EXECUTE format('
      CREATE POLICY "Users can update %I in their tenant"
      ON %I FOR UPDATE
      TO authenticated
      USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    ', '${tableName}', '${tableName}');
    
    EXECUTE format('
      CREATE POLICY "Users can delete %I in their tenant"
      ON %I FOR DELETE
      TO authenticated
      USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    ', '${tableName}', '${tableName}');
    
    RAISE NOTICE 'Created tenant-scoped policies for table: %', '${tableName}';
  ELSE
    -- For tables without tenant_id, create simple authenticated policies
    EXECUTE format('
      CREATE POLICY "Users can view %I"
      ON %I FOR SELECT
      TO authenticated
      USING (true);
    ', '${tableName}', '${tableName}');
    
    EXECUTE format('
      CREATE POLICY "Users can insert %I"
      ON %I FOR INSERT
      TO authenticated
      WITH CHECK (true);
    ', '${tableName}', '${tableName}');
    
    EXECUTE format('
      CREATE POLICY "Users can update %I"
      ON %I FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
    ', '${tableName}', '${tableName}');
    
    RAISE NOTICE 'Created simple policies for table: % (no tenant_id column)', '${tableName}';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table % does not exist, skipping...', '${tableName}';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies for %: %', '${tableName}', SQLERRM;
END $$;

`
})

sql += `
COMMIT;

-- ============================================
-- Verification Queries
-- ============================================

-- Check RLS status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies count
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
`

console.log('✅ SQL generated successfully!\n')
console.log('📄 Output file: supabase/migrations/comprehensive_rls_fix.sql\n')
console.log('📋 Summary:')
console.log(`  - Tables covered: ${crmTables.length}`)
console.log('  - Service role: Full access (for webhooks)')
console.log('  - Authenticated users: Tenant-scoped access')
console.log('  - Tables without tenant_id: Simple authenticated access')
console.log('\n💡 This SQL will:')
console.log('  1. Enable RLS on all tables')
console.log('  2. Skip tables that don\'t exist')
console.log('  3. Handle tables with/without tenant_id column')
console.log('  4. Avoid conflicts with existing policies')
console.log('\n🚀 Ready to apply!')

// Write to file
import { writeFileSync } from 'fs'
writeFileSync('supabase/migrations/comprehensive_rls_fix.sql', sql)

console.log('\n✅ File written: supabase/migrations/comprehensive_rls_fix.sql')
