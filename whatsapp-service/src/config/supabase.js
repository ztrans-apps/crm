import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from whatsapp-service directory
dotenv.config({ path: path.join(__dirname, '../../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not found. Database features will be disabled.')
  console.warn('    Required: SUPABASE_URL and SUPABASE_SERVICE_KEY')
  console.warn('    Current SUPABASE_URL:', supabaseUrl)
  console.warn('    Current SUPABASE_SERVICE_KEY:', supabaseKey ? '[SET]' : '[NOT SET]')
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null
