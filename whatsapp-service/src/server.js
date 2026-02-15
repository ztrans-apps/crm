import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import messageRoutes from './routes/messages.js'
import mediaRoutes from './routes/media.js'
import locationRoutes from './routes/location.js'
import sessionsRoutes from './routes/sessions.js'
import whatsappService from './services/whatsapp.js'
import { supabase } from './config/supabase.js'
import { startSessionStatusSync } from './jobs/sync-session-status.js'

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

// Routes
app.use('/api/whatsapp', authRoutes)
app.use('/api/whatsapp', messageRoutes)
app.use('/api/whatsapp', mediaRoutes)
app.use('/api/whatsapp', locationRoutes)
app.use('/api/sessions', sessionsRoutes)

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

// Auto-sync message status (integrated)
async function autoSyncMessageStatus() {
  if (!supabase) return

  try {
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
        // Silent fail
      }
    }
  } catch (error) {
    // Silent fail
  }
}

// Auto-load and reconnect active sessions on startup
async function loadActiveSessions() {
  if (!supabase) {
    return
  }

  try {
    const { data: sessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('id, session_name, phone_number, status')
      .in('status', ['active', 'connected']) // Accept both statuses

    if (error) {
      console.error('Error loading sessions:', error)
      return
    }

    if (!sessions || sessions.length === 0) {
      return
    }

    for (const session of sessions) {
      try {
        await whatsappService.initializeClient(session.id)
      } catch (error) {
        console.error(`Failed to reconnect session ${session.id}:`, error.message)
      }
    }
  } catch (error) {
    console.error('Error in loadActiveSessions:', error)
  }
}

httpServer.listen(PORT, async () => {
  console.log(`🚀 WhatsApp Service running on ${serviceUrl}`)
  console.log(`📱 Ready to handle WhatsApp messages`)
  
  // Load active sessions after server starts
  setTimeout(loadActiveSessions, 2000) // Wait 2 seconds for server to be fully ready
  
  // Start session status sync job
  setTimeout(() => {
    console.log('🔄 Starting session status sync job')
    startSessionStatusSync(whatsappService)
  }, 3000) // Wait 3 seconds for sessions to initialize
  
  // Start auto-sync after sessions are loaded
  setTimeout(() => {
    console.log('✅ Auto-sync message status started')
    // Initial sync
    autoSyncMessageStatus()
    // Periodic sync
    setInterval(autoSyncMessageStatus, STATUS_SYNC_INTERVAL)
  }, 5000) // Wait 5 seconds for sessions to initialize
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
  
  // Close all WhatsApp sessions
  for (const [sessionKey, session] of whatsappService.sessions.entries()) {
    try {
      console.log(`📴 Closing session: ${sessionKey}`)
      await session.sock.logout()
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
  
  // Close all WhatsApp sessions
  for (const [sessionKey, session] of whatsappService.sessions.entries()) {
    try {
      console.log(`📴 Closing session: ${sessionKey}`)
      await session.sock.logout()
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
