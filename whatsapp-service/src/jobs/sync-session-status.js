/**
 * Sync Session Status Job
 * Periodically sync session status from SessionManager to database
 * This handles cases where connection.update event is missed
 */

import { supabase } from '../config/supabase.js'
import sessionManager from '../services/session-manager.js'

let syncInterval = null

export function startSessionStatusSync(whatsappService) {
  if (syncInterval) {
    console.log('⚠️  Session status sync already running')
    return
  }

  console.log('🔄 Starting session status sync job (every 10 seconds)')

  syncInterval = setInterval(async () => {
    try {
      if (!supabase) return

      // Get all sessions from SessionManager (returns Array)
      const allSessions = sessionManager.getAllSessions()
      
      if (!allSessions || allSessions.length === 0) {
        console.log('🔄 No sessions to sync')
        return
      }

      console.log(`🔄 Syncing ${allSessions.length} session(s)`)

      // Iterate through each session
      for (let i = 0; i < allSessions.length; i++) {
        const sessionData = allSessions[i]
        const { sessionId, tenantId, status: sessionStatus, phoneNumber, sock } = sessionData
        
        if (!sessionId || !tenantId) continue

        console.log(`🔄 Checking session ${sessionId}: SessionManager=${sessionStatus}`)

        // Get status from database
        const { data: dbSession, error } = await supabase
          .from('whatsapp_sessions')
          .select('status, phone_number')
          .eq('id', sessionId)
          .eq('tenant_id', tenantId)
          .single()

        if (error || !dbSession) {
          console.log(`⚠️  Session ${sessionId} not found in database`)
          continue
        }

        console.log(`🔄 Session ${sessionId}: DB=${dbSession.status}, Manager=${sessionStatus}`)

        // If SessionManager says active but DB says connecting, update DB
        if (sessionStatus === 'active' && dbSession.status === 'connecting') {
          console.log(`🔄 Syncing status for session ${sessionId}: connecting → connected`)
          
          // Get phone number from session if not in DB
          let phone = dbSession.phone_number
          if (!phone && phoneNumber) {
            phone = phoneNumber
          }
          
          // Try to get phone from Baileys sock if available
          if (!phone && sock && sock.user && sock.user.id) {
            const phoneFromSock = sock.user.id.split(':')[0]
            phone = phoneFromSock ? `+${phoneFromSock}` : null
            console.log(`📱 Got phone from Baileys: ${phone}`)
          }

          // Update database
          const { error: updateError } = await supabase
            .from('whatsapp_sessions')
            .update({
              status: 'connected',
              phone_number: phone,
              metadata: { 
                lastConnected: new Date().toISOString(),
                syncedBy: 'status-sync-job'
              }
            })
            .eq('id', sessionId)
            .eq('tenant_id', tenantId)

          if (updateError) {
            console.error(`❌ Failed to sync status for ${sessionId}:`, updateError)
          } else {
            console.log(`✅ Status synced for ${sessionId}: connected${phone ? ` (${phone})` : ''}`)
          }
        }

        // If SessionManager says inactive but DB says connected, update DB
        if (sessionStatus === 'inactive' && dbSession.status === 'connected') {
          console.log(`🔄 Syncing status for session ${sessionId}: connected → disconnected`)
          
          const { error: updateError } = await supabase
            .from('whatsapp_sessions')
            .update({
              status: 'disconnected',
              metadata: { 
                lastDisconnected: new Date().toISOString(),
                syncedBy: 'status-sync-job'
              }
            })
            .eq('id', sessionId)
            .eq('tenant_id', tenantId)

          if (updateError) {
            console.error(`❌ Failed to sync status for ${sessionId}:`, updateError)
          } else {
            console.log(`✅ Status synced for ${sessionId}: disconnected`)
          }
        }
      }
    } catch (error) {
      console.error('❌ Session status sync error:', error)
    }
  }, 10000) // Every 10 seconds
}

export function stopSessionStatusSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('🛑 Session status sync stopped')
  }
}
