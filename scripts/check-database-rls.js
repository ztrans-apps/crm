/**
 * Check all tables and their RLS status in Supabase
 * Run: node scripts/check-database-rls.js
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lauhwtpbknlakysdmpju.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdWh3dHBia25sYWt5c2RtcGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUzMTkwMCwiZXhwIjoyMDg2MTA3OTAwfQ.jVxakbfNbhKWMpem-6Wz6al-paQb-Ve-jjKbw9yufH8'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkDatabaseRLS() {
  console.log('🔍 Checking database tables and RLS status...\n')

  try {
    // Query to get all tables in public schema with RLS status
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    })

    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError)
      
      // Fallback: Try direct query
      console.log('\n📋 Trying alternative method...\n')
      
      const { data: altTables, error: altError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
      
      if (altError) {
        console.error('❌ Alternative method also failed:', altError)
        console.log('\n💡 Please run this SQL directly in Supabase SQL Editor:')
        console.log(`
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
        `)
        return
      }
      
      console.log('📊 Tables found (RLS status unknown):')
      altTables?.forEach(table => {
        console.log(`  - ${table.table_name}`)
      })
      return
    }

    console.log('📊 Tables and RLS Status:\n')
    console.log('┌─────────────────────────────────┬─────────────┐')
    console.log('│ Table Name                      │ RLS Enabled │')
    console.log('├─────────────────────────────────┼─────────────┤')
    
    tables?.forEach(table => {
      const tableName = table.tablename.padEnd(31)
      const rlsStatus = table.rls_enabled ? '✅ Yes' : '❌ No'
      console.log(`│ ${tableName} │ ${rlsStatus.padEnd(11)} │`)
    })
    
    console.log('└─────────────────────────────────┴─────────────┘')

    // Get RLS policies for each table
    console.log('\n📜 Checking RLS Policies...\n')
    
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `
    })

    if (policiesError) {
      console.log('⚠️  Could not fetch policies automatically')
      console.log('💡 Run this SQL in Supabase SQL Editor to see policies:')
      console.log(`
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
      `)
    } else {
      if (policies && policies.length > 0) {
        console.log('📋 Existing RLS Policies:\n')
        
        let currentTable = ''
        policies.forEach(policy => {
          if (policy.tablename !== currentTable) {
            if (currentTable !== '') console.log('')
            console.log(`📌 ${policy.tablename}:`)
            currentTable = policy.tablename
          }
          console.log(`  - ${policy.policyname}`)
          console.log(`    Command: ${policy.cmd}`)
          console.log(`    Roles: ${policy.roles.join(', ')}`)
        })
      } else {
        console.log('⚠️  No RLS policies found!')
      }
    }

    // Check specific tables needed for webhook
    console.log('\n\n🎯 Webhook Required Tables:\n')
    const requiredTables = ['contacts', 'conversations', 'messages']
    
    requiredTables.forEach(tableName => {
      const table = tables?.find(t => t.tablename === tableName)
      if (table) {
        const status = table.rls_enabled ? '✅ RLS Enabled' : '❌ RLS Disabled (UNRESTRICTED)'
        console.log(`  ${tableName}: ${status}`)
      } else {
        console.log(`  ${tableName}: ⚠️  Table not found`)
      }
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Manual Check Required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Run the following queries:')
    console.log('\n-- Check tables and RLS status:')
    console.log(`
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
    `)
    console.log('\n-- Check existing policies:')
    console.log(`
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
    `)
  }
}

checkDatabaseRLS()
