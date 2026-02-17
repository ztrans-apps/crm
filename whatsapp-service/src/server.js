import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import authRoutes from './routes/auth.js'
import messageRoutes from './routes/messages.js'
import mediaRoutes from './routes/media.js'
import locationRoutes from './routes/location.js'
import sessionsRoutes from './routes/sessions.js'
import healthRoutes from './routes/health.js'
import whatsappService from './services/whatsapp.js'
import { supabase } from './config/supabase.js'
import { startSessionStatusSync } from './jobs/sync-session-status.js'
import healthMonitor from './services/healthMonitor.js'
import deliveryTracker from './services/deliveryTracker.js'
import circuitBreaker from './services/circuitBreaker.js'
import messageDeduplicator from './services/messageDeduplicator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}))
app.use(express.json())

// Make io available globally
global.io = io
app.set('io', io)

// Make whatsappService available to routes
app.set('whatsappService', whatsappService)

// Make services available globally
global.healthMonitor = healthMonitor
global.deliveryTracker = deliveryTracker
global.circuitBreaker = circuitBreaker
global.messageDeduplicator = messageDeduplicator

// Routes
app.use('/api/whatsapp', authRoutes)
app.use('/api/whatsapp', messageRoutes)
app.use('/api/whatsapp', mediaRoutes)
app.use('/api/whatsapp', locationRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/health', healthRoutes)

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    service: 'whatsapp-service',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/whatsapp/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

// Socket.IO connection
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
  })
})

const PORT = process.env.PORT || 3001
const STATUS_SYNC_INTERVAL = parseInt(process.env.STATUS_SYNC_INTERVAL || '30000') // 30 seconds
const serviceUrl = process.env.WHATSAPP_SERVICE_URL || `http://localhost:${PORT}`

// Auto-sync message status (integrated with delivery tracker)
async function autoSyncMessageStatus() {
  if (!supabase) return

  try {
    healthMonitor.recordOperation('message_sync', true)
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id, 
        whatsapp_message_id, 
        status, 
        content,
        conversation_id,
        conversations!inner(whatsapp_session_id)
      `)
      .eq('is_from_me', true)
      .in('status', ['sent', 'delivered'])
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !messages || messages.length === 0) return

    let updated = 0

    for (const message of messages) {
      if (!message.whatsapp_message_id) continue

      try {
        const sessionId = message.conversations?.whatsapp_session_id
        if (!sessionId) continue

        const statusInfo = await whatsappService.getMessageInfo(sessionId, message.whatsapp_message_id)
        if (!statusInfo.found || statusInfo.status === message.status) continue

        const { error: updateError } = await supabase
          .from('messages')
          .update({ status: statusInfo.status })
          .eq('id', message.id)

        if (!updateError) {
          updated++
          
          // Track delivery status
          deliveryTracker.trackDelivery(message.whatsapp_message_id, statusInfo.status)
          
          if (io) {
            io.emit('message_status', {
              sessionId,
              messageId: message.whatsapp_message_id,
              status: statusInfo.status
            })
          }
        }

        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        healthMonitor.recordOperation('message_sync', false)
      }
    }
  } catch (error) {
    healthMonitor.recordOperation('message_sync', false)
  }
}

// Auto-load and reconnect active sessions on startup
async function loadActiveSessions() {
  if (!supabase) {
    console.log('⚠️ Supabase not configured, skipping session load')
    return
  }

  try {
    console.log('🔄 Loading sessions from database...')
    
    // Load ALL sessions that have credentials (not just active/connected)
    // This allows auto-reconnect even if status was not properly updated
    const { data: sessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('id, session_name, phone_number, status, tenant_id')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('❌ Error loading sessions:', error)
      return
    }

    if (!sessions || sessions.length === 0) {
      console.log('ℹ️ No sessions found in database')
      return
    }

    console.log(`📱 Found ${sessions.length} session(s) in database, checking for valid credentials...`)

    let reconnected = 0
    let failed = 0
    let skipped = 0

    for (const session of sessions) {
      try {
        // Get auth path from whatsappService (it knows the correct path)
        const authPath = path.join(whatsappService.authDir, session.id)
        const credsPath = path.join(authPath, 'creds.json')
        
        if (!fs.existsSync(credsPath)) {
          console.log(`⚠️ No credentials file for session ${session.id}, skipping`)
          skipped++
          continue
        }
        
        // Read and validate credentials
        let hasValidCreds = false
        try {
          const credsContent = fs.readFileSync(credsPath, 'utf8')
          const creds = JSON.parse(credsContent)
          // registrationId can be 0, so check for undefined/null explicitly
          hasValidCreds = !!(creds.me?.id && creds.registrationId !== undefined && creds.registrationId !== null)
          
          if (hasValidCreds) {
            console.log(`✅ Valid credentials found for session ${session.id} (${session.session_name})`)
            console.log(`   Phone: ${creds.me?.id?.split(':')[0] || 'unknown'}`)
            console.log(`   Registration ID: ${creds.registrationId}`)
          } else {
            console.log(`⚠️ Invalid credentials for session ${session.id}, skipping`)
            skipped++
            continue
          }
        } catch (parseError) {
          console.log(`⚠️ Failed to parse credentials for session ${session.id}:`, parseError.message)
          skipped++
          continue
        }
        
        console.log(`🔌 Auto-reconnecting session: ${session.id} (${session.session_name})`)
        
        // Try to initialize the client (will auto-reconnect if credentials are valid)
        await whatsappService.initializeClient(session.id, false, session.tenant_id)
        
        // Wait a bit to see if connection succeeds
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        healthMonitor.recordSessionStatus(session.id, 'connected')
        console.log(`✅ Session ${session.id} reconnection initiated`)
        reconnected++
      } catch (error) {
        console.error(`❌ Failed to reconnect session ${session.id}:`, error.message)
        healthMonitor.recordSessionStatus(session.id, 'disconnected')
        failed++
      }
    }
    
    console.log(`✅ Session loading complete: ${reconnected} reconnected, ${failed} failed, ${skipped} skipped`)
    
    // Auto-assign orphaned conversations to active sessions
    if (reconnected > 0) {
      await autoAssignOrphanedConversations()
    }
  } catch (error) {
    console.error('❌ Error in loadActiveSessions:', error)
  }
}

// Auto-assign conversations that don't have a valid session
async function autoAssignOrphanedConversations() {
  if (!supabase) return
  
  try {
    console.log('🔄 Checking for orphaned conversations...')
    
    // Get all active sessions
    const { data: activeSessions } = await supabase
      .from('whatsapp_sessions')
      .select('id, session_name')
      .eq('status', 'active')
    
    if (!activeSessions || activeSessions.length === 0) {
      console.log('ℹ️ No active sessions to assign conversations to')
      return
    }
    
    console.log(`📱 Found ${activeSessions.length} active session(s)`)
    
    // Get orphaned conversations (no session or inactive session)
    const { data: allConvs, error } = await supabase
      .from('conversations')
      .select('id, contact_phone, whatsapp_session_id')
      .eq('status', 'open')
    
    if (error) {
      console.error('❌ Error finding conversations:', error)
      return
    }
    
    // Filter orphaned conversations (null or not in active sessions)
    const activeSessionIds = activeSessions.map(s => s.id)
    const orphaned = allConvs?.filter(conv => 
      !conv.whatsapp_session_id || !activeSessionIds.includes(conv.whatsapp_session_id)
    ) || []
    
    if (orphaned.length === 0) {
      console.log('✅ No orphaned conversations found')
      return
    }
    
    console.log(`📌 Found ${orphaned.length} orphaned conversation(s) to reassign`)
    orphaned.forEach(conv => {
      console.log(`  - Conversation ${conv.id}: session ${conv.whatsapp_session_id || 'NULL'} (inactive)`)
    })
    
    // Get conversation count per session for load balancing
    const { data: sessionLoads } = await supabase
      .from('conversations')
      .select('whatsapp_session_id')
      .eq('status', 'open')
      .in('whatsapp_session_id', activeSessionIds)
    
    // Count conversations per session
    const loadMap = {}
    activeSessions.forEach(session => {
      loadMap[session.id] = 0
    })
    
    sessionLoads?.forEach(conv => {
      if (conv.whatsapp_session_id && loadMap[conv.whatsapp_session_id] !== undefined) {
        loadMap[conv.whatsapp_session_id]++
      }
    })
    
    console.log('📊 Current session loads:', loadMap)
    
    // Assign orphaned conversations using round-robin load balancing
    let assignmentCount = 0
    for (const conv of orphaned) {
      // Find session with lowest load
      let targetSession = activeSessions[0].id
      let minLoad = loadMap[targetSession]
      
      for (const session of activeSessions) {
        if (loadMap[session.id] < minLoad) {
          minLoad = loadMap[session.id]
          targetSession = session.id
        }
      }
      
      // Assign conversation to target session
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ whatsapp_session_id: targetSession })
        .eq('id', conv.id)
      
      if (!updateError) {
        loadMap[targetSession]++ // Increment load
        assignmentCount++
        console.log(`  ✅ Assigned conversation ${conv.id} to session ${targetSession}`)
      } else {
        console.error(`  ❌ Failed to assign conversation ${conv.id}:`, updateError)
      }
    }
    
    console.log(`✅ Successfully assigned ${assignmentCount}/${orphaned.length} conversation(s)`)
    console.log('📊 New session loads:', loadMap)
  } catch (error) {
    console.error('❌ Error in autoAssignOrphanedConversations:', error)
  }
}

httpServer.listen(PORT, async () => {
  console.log(`🚀 WhatsApp Service running on ${serviceUrl}`)
  console.log(`📱 Ready to handle WhatsApp messages`)
  console.log(`🏥 Health monitoring enabled`)
  console.log(`🔄 Circuit breaker protection active`)
  console.log(`📊 Delivery tracking enabled`)
  console.log(`🔒 Message deduplication active`)
  
  // Initialize health monitor
  healthMonitor.recordOperation('server_start', true)
  
  // Load active sessions after server starts (increased delay for stability)
  setTimeout(async () => {
    console.log('⏰ Starting session auto-reconnect...')
    await loadActiveSessions()
  }, 3000) // Wait 3 seconds for server to be fully ready
  
  // Start session status sync job
  setTimeout(() => {
    console.log('🔄 Starting session status sync job')
    startSessionStatusSync(whatsappService)
  }, 5000) // Wait 5 seconds for sessions to initialize
  
  // Start auto-sync after sessions are loaded
  setTimeout(() => {
    console.log('✅ Auto-sync message status started')
    // Initial sync
    autoSyncMessageStatus()
    // Periodic sync
    setInterval(autoSyncMessageStatus, STATUS_SYNC_INTERVAL)
  }, 7000) // Wait 7 seconds for sessions to initialize
  
  // Cleanup old delivery tracking data every hour
  setInterval(() => {
    deliveryTracker.cleanup()
  }, 60 * 60 * 1000)
  
  // Cleanup old deduplication data every 30 minutes
  setInterval(() => {
    messageDeduplicator.cleanup()
  }, 30 * 60 * 1000)
})

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  
  // Don't exit on timeout errors - they're recoverable
  if (error.message?.includes('Timed Out') || error.message?.includes('timeout')) {
    console.log('⏱️ Timeout error caught, service will continue running')
    return
  }
  
  // For other critical errors, log but don't exit immediately
  console.error('❌ Critical error, but service will attempt to continue')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  
  // Don't exit on timeout errors
  if (reason?.message?.includes('Timed Out') || reason?.message?.includes('timeout')) {
    console.log('⏱️ Timeout rejection caught, service will continue running')
    return
  }
  
  console.error('❌ Unhandled rejection, but service will attempt to continue')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...')
  
  // Close all WhatsApp sessions WITHOUT logging out
  // This preserves auth credentials for next restart
  for (const [sessionKey, session] of whatsappService.sessions.entries()) {
    try {
      console.log(`📴 Closing session: ${sessionKey}`)
      // Use end() instead of logout() to preserve credentials
      await session.sock.end()
    } catch (error) {
      console.error(`❌ Error closing session ${sessionKey}:`, error.message)
    }
  }
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('✅ HTTP server closed')
    process.exit(0)
  })
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
})

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully...')
  
  // Close all WhatsApp sessions WITHOUT logging out
  // This preserves auth credentials for next restart
  for (const [sessionKey, session] of whatsappService.sessions.entries()) {
    try {
      console.log(`📴 Closing session: ${sessionKey}`)
      // Use end() instead of logout() to preserve credentials
      await session.sock.end()
    } catch (error) {
      console.error(`❌ Error closing session ${sessionKey}:`, error.message)
    }
  }
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('✅ HTTP server closed')
    process.exit(0)
  })
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
})
