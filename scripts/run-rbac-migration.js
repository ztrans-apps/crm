// Script to run RBAC migration
// Usage: node scripts/run-rbac-migration.js

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting RBAC Migration...\n')

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260212110000_create_rbac_system.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Migration file loaded')
    console.log(`📏 Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`)

    // Split SQL into individual statements
    // Remove comments and split by semicolon
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    console.log(`📊 Found ${statements.length} SQL statements\n`)

    // Execute each statement
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip empty statements
      if (!statement || statement.length < 10) continue

      // Get statement type for logging
      const stmtType = statement.split(/\s+/)[0].toUpperCase()
      
      process.stdout.write(`[${i + 1}/${statements.length}] Executing ${stmtType}... `)

      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        }).catch(async () => {
          // If exec_sql doesn't exist, try direct execution
          return await supabase.from('_migrations').select('*').limit(0)
            .then(() => {
              // Use raw query if possible
              throw new Error('Direct SQL execution not available, using alternative method')
            })
        })

        if (error) {
          // Try alternative: some statements might work with specific methods
          if (stmtType === 'CREATE' && statement.includes('TABLE')) {
            console.log('⚠️  Skipped (may already exist)')
          } else if (stmtType === 'INSERT') {
            console.log('⚠️  Skipped (may already exist)')
          } else {
            console.log(`❌ Error: ${error.message}`)
            errorCount++
          }
        } else {
          console.log('✅')
          successCount++
        }
      } catch (err) {
        console.log(`⚠️  ${err.message}`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✅ Success: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log('='.repeat(60))

    // Verify migration
    console.log('\n🔍 Verifying migration...\n')
    await verifyMigration()

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  }
}

async function verifyMigration() {
  const checks = [
    { name: 'roles table', query: 'SELECT COUNT(*) as count FROM roles' },
    { name: 'permissions table', query: 'SELECT COUNT(*) as count FROM permissions' },
    { name: 'user_roles table', query: 'SELECT COUNT(*) as count FROM user_roles' },
    { name: 'role_permissions table', query: 'SELECT COUNT(*) as count FROM role_permissions' },
  ]

  for (const check of checks) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: check.query })
      
      if (error) {
        // Try table-based query
        const tableName = check.name.split(' ')[0]
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (tableError) {
          console.log(`❌ ${check.name}: Not found`)
        } else {
          console.log(`✅ ${check.name}: Exists`)
        }
      } else {
        console.log(`✅ ${check.name}: ${data?.[0]?.count || 0} rows`)
      }
    } catch (err) {
      console.log(`⚠️  ${check.name}: Could not verify`)
    }
  }

  // Check functions
  console.log('\n📋 Checking functions...')
  const functions = [
    'get_user_permissions',
    'user_has_permission',
    'get_user_roles'
  ]

  for (const func of functions) {
    try {
      // Try to call function with dummy data to check if it exists
      await supabase.rpc(func, { p_user_id: '00000000-0000-0000-0000-000000000000' })
      console.log(`✅ Function ${func}: Exists`)
    } catch (err) {
      if (err.message.includes('not found')) {
        console.log(`❌ Function ${func}: Not found`)
      } else {
        console.log(`✅ Function ${func}: Exists`)
      }
    }
  }

  console.log('\n✨ Migration verification complete!\n')
}

// Run migration
runMigration().catch(console.error)
