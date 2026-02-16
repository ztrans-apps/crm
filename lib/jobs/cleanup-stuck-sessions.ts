/**
 * Cleanup Stuck Sessions Job
 * Automatically reset sessions that are stuck in 'connecting' or 'reconnecting' status
 */

import { createClient } from '@supabase/supabase-js'

export async function cleanupStuckSessions() {
  try {
    console.log('[Cleanup] Checking for stuck sessions...')

    // Check if Supabase credentials are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Cleanup] Supabase credentials not found')
      return { 
        success: false, 
        error: 'Supabase credentials not configured',
        cleaned: 0
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Find sessions stuck in connecting/reconnecting for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: stuckSessions, error: fetchError } = await supabase
      .from('whatsapp_sessions')
      .select('id, phone_number, status, created_at')
      .in('status', ['connecting', 'reconnecting'])
      .lt('created_at', fiveMinutesAgo)

    if (fetchError) {
      console.error('[Cleanup] Error fetching stuck sessions:', fetchError)
      return { success: false, error: fetchError.message, cleaned: 0 }
    }

    if (!stuckSessions || stuckSessions.length === 0) {
      console.log('[Cleanup] No stuck sessions found')
      return { success: true, cleaned: 0, sessions: [] }
    }

    console.log(`[Cleanup] Found ${stuckSessions.length} stuck sessions`)

    // Reset stuck sessions to disconnected (without metadata column)
    const { error: updateError } = await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .in('status', ['connecting', 'reconnecting'])
      .lt('created_at', fiveMinutesAgo)

    if (updateError) {
      console.error('[Cleanup] Error updating stuck sessions:', updateError)
      return { success: false, error: updateError.message, cleaned: 0 }
    }

    console.log(`[Cleanup] Successfully cleaned ${stuckSessions.length} stuck sessions`)

    return {
      success: true,
      cleaned: stuckSessions.length,
      sessions: stuckSessions.map(s => ({
        id: s.id,
        phone_number: s.phone_number,
        status: s.status
      }))
    }
  } catch (error: any) {
    console.error('[Cleanup] Unexpected error:', error)
    return { success: false, error: error.message, cleaned: 0 }
  }
}

// Run cleanup every 5 minutes
export function startCleanupJob() {
  console.log('[Cleanup] Starting automatic cleanup job (every 5 minutes)')
  
  // Run immediately on start
  cleanupStuckSessions()
  
  // Then run every 5 minutes
  setInterval(() => {
    cleanupStuckSessions()
  }, 5 * 60 * 1000) // 5 minutes
}
