/**
 * Load Environment Variables
 * Loads from .env.local for Next.js compatibility
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load from .env.local first (Next.js convention)
const envLocalPath = resolve(process.cwd(), '.env.local');
config({ path: envLocalPath });

// Fallback to .env
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

// Validate required variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease check your .env.local or .env file');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
