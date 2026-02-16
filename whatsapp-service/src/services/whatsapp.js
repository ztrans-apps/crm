import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import qrcodeTerminal from 'qrcode-terminal'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { supabase } from '../config/supabase.js'
import reconnectManager from './reconnect-manager.js'
import sessionManager from './session-manager.js'
import sessionStateRegistry from './session-state-registry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class BaileysWhatsAppService {
  constructor() {
    this.sessions = new Map() // sessionKey (tenantId:sessionId) -> { sock, store, state, tenantId }
    this.qrCodes = new Map() // sessionKey -> qrCode
    
    // Use dedicated folder for auth sessions
    // Try /var/wa-sessions first, fallback to project root .baileys_auth
    const preferredPath = '/var/wa-sessions'
    // Use __dirname to get whatsapp-service/src/services, then go up 3 levels to project root
    const projectRoot = path.join(__dirname, '..', '..', '..')
    const fallbackPath = path.join(projectRoot, '.baileys_auth')
    
    console.log('🔍 Using auth directory - fallback:', fallbackPath)
    
    try {
      if (!fs.existsSync(preferredPath)) {
        fs.mkdirSync(preferredPath, { recursive: true, mode: 0o755 })
      }
      // Test write permission
      const testFile = path.join(preferredPath, '.test')
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
      this.authDir = preferredPath
      console.log('✅ Using dedicated auth directory:', preferredPath)
    } catch (error) {
      console.warn('⚠️  Cannot use /var/wa-sessions, using fallback:', fallbackPath)
      this.authDir = fallbackPath
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true })
      }
    }
  }

  /**
   * Get session key
   */
  getSessionKey(tenantId, sessionId) {
    return `${tenantId}:${sessionId}`
  }

  /**
   * Initialize a WhatsApp session with tenant support
   */
  async initializeClient(sessionId, forceNew = false, tenantId = null) {
    // Get tenant_id from database if not provided
    if (!tenantId) {
      if (!supabase) {
        console.warn(`⚠️  Supabase not configured, using default tenant_id`)
        tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
      } else {
        try {
          const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('tenant_id')
            .eq('id', sessionId)
            .single()
          
          if (error) {
            console.warn(`⚠️  Failed to get tenant_id from database, using default:`, error.message)
            tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
          } else {
            tenantId = data.tenant_id
          }
        } catch (error) {
          console.warn(`⚠️  Error querying tenant_id, using default:`, error.message)
          tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
        }
      }
    }

    const sessionKey = this.getSessionKey(tenantId, sessionId)

    // If forcing new, delete existing session first
    if (forceNew && this.sessions.has(sessionKey)) {
      console.log(`🗑️ Deleting existing session from memory: ${sessionKey}`)
      const existingSession = this.sessions.get(sessionKey)
      try {
        await existingSession.sock.logout()
      } catch (err) {
        console.log(`⚠️  Logout error (ignoring): ${err.message}`)
      }
      this.sessions.delete(sessionKey)
      this.qrCodes.delete(sessionKey)
      this.qrCodes.delete(sessionId)
    }

    // If session already exists and not forcing new, return it
    if (this.sessions.has(sessionKey) && !forceNew) {
      console.log(`⚠️ Session ${sessionKey} already exists, returning existing session`)
      return this.sessions.get(sessionKey)
    }

    try {
      console.log(`🚀 Initializing ${forceNew ? 'NEW' : ''} session: ${sessionKey}`)
      
      // Create session auth directory
      const authPath = path.join(this.authDir, sessionId)
      
      // If forcing new session, delete old auth files
      if (forceNew && fs.existsSync(authPath)) {
        console.log(`🗑️ Deleting old auth files for: ${sessionId}`)
        fs.rmSync(authPath, { recursive: true, force: true })
      }
      
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true })
        console.log(`📁 Created auth directory: ${authPath}`)
      } else {
        console.log(`📁 Auth directory already exists: ${authPath}`)
      }

      // Load auth state
      const { state, saveCreds } = await useMultiFileAuthState(authPath)

      console.log(`📂 Auth state loaded from: ${authPath}`)
      console.log(`🔐 Has existing credentials: ${!!state.creds}`)
      console.log(`🔍 Debug - state.creds keys:`, Object.keys(state.creds || {}))
      console.log(`🔍 Debug - state.creds.me:`, JSON.stringify(state.creds?.me))
      console.log(`👤 Registered phone: ${state.creds?.me?.id || 'none (will need QR scan)'}`)
      console.log(`🔑 Has registration ID: ${state.creds?.registrationId !== undefined ? state.creds.registrationId : 'none'}`)
      
      // Check if we have valid credentials
      // registrationId can be 0, so check for undefined/null explicitly
      const hasValidCreds = !!(state.creds?.me?.id && state.creds?.registrationId !== undefined && state.creds?.registrationId !== null)
      
      if (hasValidCreds) {
        console.log(`✅ Valid credentials found, will attempt auto-reconnect`)
        
        // Update database status to 'connecting'
        if (supabase) {
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              status: 'connecting',
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
        }
      } else {
        console.log(`⚠️ No valid credentials, will need QR scan`)
        
        // Update database status to 'disconnected'
        if (supabase) {
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              status: 'disconnected',
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
        }
      }

      // Get latest Baileys version
      const { version } = await fetchLatestBaileysVersion()

      // Create socket connection with timeout handling
      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        connectTimeoutMs: 60000, // 60 seconds timeout
        defaultQueryTimeoutMs: 60000, // 60 seconds for queries
        retryRequestDelayMs: 250, // Retry delay
        maxMsgRetryCount: 3, // Max retry for messages
        keepAliveIntervalMs: 30000, // Keep alive every 30s
      })

      console.log(`🔌 Socket created for ${sessionKey}`)

      // Store session with tenant info
      const sessionData = { sock, state, saveCreds, tenantId, sessionId }
      this.sessions.set(sessionKey, sessionData)

      // Register with session manager
      sessionManager.registerSession(tenantId, sessionId, {
        sock,
        phoneNumber: null, // Will be updated on connection
        status: 'initializing'
      })

      console.log(`📡 Attaching event listeners for ${sessionKey}`)

      // Global error handler for socket
      sock.ev.on('error', (error) => {
        console.error(`❌ Socket error for ${sessionKey}:`, error)
        
        // Update state registry on error
        sessionStateRegistry.setState(sessionId, 'ERROR')
        sessionStateRegistry.incrementErrorCount(sessionId)
        
        // Handle timeout errors specifically
        if (error.message?.includes('Timed Out') || error.message?.includes('timeout')) {
          console.log(`⏱️ Timeout detected for ${sessionKey}, will auto-reconnect`)
          // Don't crash, let connection.update handle reconnection
        }
      })

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        console.log(`🔄 Connection update for ${sessionKey}:`, {
          connection,
          hasQR: !!qr,
          hasLastDisconnect: !!lastDisconnect
        })

        // Update state registry based on connection status
        if (connection === 'connecting') {
          sessionStateRegistry.setState(sessionId, 'CONNECTING')
        }

        // Handle QR code
        if (qr) {
          console.log(`📱 QR code generated for session: ${sessionKey}`)
          console.log(`📱 Current time: ${new Date().toISOString()}`)
          console.log(`📱 QR will expire in ~40 seconds`)
          
          // Show in terminal
          qrcodeTerminal.generate(qr, { small: true })
          
          // Convert to base64 for browser
          const qrImage = await QRCode.toDataURL(qr)
          
          // Store with BOTH sessionKey and sessionId for compatibility
          this.qrCodes.set(sessionKey, qrImage)
          this.qrCodes.set(sessionId, qrImage) // Also store with sessionId only
          
          console.log(`✅ QR code stored in memory for session: ${sessionKey}`)
          console.log(`✅ QR code also stored with sessionId: ${sessionId}`)
          console.log(`✅ Total QR codes in memory: ${this.qrCodes.size}`)
          
          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('qr', { sessionId, tenantId, qr: qrImage })
          }
        }

        // Handle connection state
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error instanceof Boom)
            ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            : true

          const statusCode = lastDisconnect?.error instanceof Boom 
            ? lastDisconnect.error.output.statusCode 
            : null

          console.log(`❌ Connection closed for ${sessionKey}, status: ${statusCode}, shouldReconnect: ${shouldReconnect}`)

          // Update state registry based on disconnect reason
          if (statusCode === DisconnectReason.loggedOut) {
            sessionStateRegistry.setState(sessionId, 'LOGGED_OUT')
          } else if (shouldReconnect) {
            sessionStateRegistry.setState(sessionId, 'DISCONNECTED')
          } else {
            sessionStateRegistry.setState(sessionId, 'ERROR')
            sessionStateRegistry.incrementErrorCount(sessionId)
          }

          // Update session manager
          sessionManager.updateStatus(tenantId, sessionId, 'disconnected')

          // Update database
          if (supabase) {
            await supabase
              .from('whatsapp_sessions')
              .update({ 
                status: shouldReconnect ? 'reconnecting' : 'disconnected',
                metadata: { lastDisconnect: statusCode }
              })
              .eq('id', sessionId)
              .eq('tenant_id', tenantId)
          }

          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('disconnected', { sessionId, tenantId, shouldReconnect })
          }

          // Remove from sessions
          this.sessions.delete(sessionKey)
          
          // IMPORTANT: Don't delete QR code on connection close!
          // QR code should persist to allow user to scan even after connection closes
          // QR will be deleted when:
          // 1. User successfully scans and connects
          // 2. User manually cancels
          // 3. Session is force deleted
          console.log(`⏳ Keeping QR code after connection close for: ${sessionKey}`)
          console.log(`⏳ QR codes in memory: ${this.qrCodes.size}`)
          
          sessionManager.unregisterSession(tenantId, sessionId)

          // Reconnect if not logged out
          if (shouldReconnect) {
            console.log(`🔄 Scheduling auto-reconnect for session: ${sessionKey}`)
            
            // Use reconnect manager with exponential backoff
            reconnectManager.scheduleReconnect(
              sessionId,
              async (sid) => {
                try {
                  await this.initializeClient(sid, false, tenantId)
                  return true // Success
                } catch (error) {
                  console.error(`❌ Reconnect attempt failed for ${sid}:`, error)
                  return false // Failed, will retry
                }
              },
              async (sid) => {
                // Max attempts reached
                console.error(`❌ Max reconnect attempts reached for session: ${sid}`)
                
                // Update database
                if (supabase) {
                  await supabase
                    .from('whatsapp_sessions')
                    .update({ 
                      status: 'failed',
                      metadata: { error: 'Max reconnect attempts reached' }
                    })
                    .eq('id', sid)
                    .eq('tenant_id', tenantId)
                }
                
                // Emit via Socket.IO
                const io = global.io
                if (io) {
                  io.emit('reconnect-failed', { sessionId: sid, tenantId })
                }
              }
            )
          } else {
            console.log(`🚫 Not reconnecting session ${sessionKey} (logged out)`)
          }
        } else if (connection === 'open') {
          console.log(`✅ Session connected: ${sessionKey}`)
          console.log(`📊 Updating database for session: ${sessionId}, tenant: ${tenantId}`)
          
          // Update state registry to CONNECTED
          sessionStateRegistry.setState(sessionId, 'CONNECTED')
          sessionStateRegistry.resetErrorCount(sessionId)
          
          // Reset reconnect attempts on successful connection
          reconnectManager.resetAttempts(sessionId)
          
          // Get phone number from Baileys
          const phoneNumber = sock.user?.id?.split(':')[0] || null
          console.log(`📱 Phone number detected: ${phoneNumber}`)
          console.log(`📱 Formatted phone: +${phoneNumber}`)
          
          // IMPORTANT: Update creds.me if not set (for auto-reconnect to work)
          if (sock.user && (!state.creds.me || !state.creds.me.id)) {
            console.log(`🔧 Updating creds.me for future auto-reconnect`)
            state.creds.me = {
              id: sock.user.id,
              name: sock.user.name || sock.user.verifiedName || 'WhatsApp User',
              lid: sock.user.lid || sock.user.id
            }
            // Save credentials immediately
            await saveCreds()
            console.log(`✅ Credentials updated and saved`)
          }
          
          // Update session manager
          sessionManager.updateStatus(tenantId, sessionId, 'active')
          
          // Update database with phone number
          if (supabase) {
            console.log(`💾 Attempting to update database...`)
            const updateResult = await supabase
              .from('whatsapp_sessions')
              .update({ 
                status: 'connected',
                phone_number: phoneNumber ? `+${phoneNumber}` : null,
                metadata: { lastConnected: new Date().toISOString() }
              })
              .eq('id', sessionId)
              .eq('tenant_id', tenantId)
            
            if (updateResult.error) {
              console.error(`❌ Failed to update phone number in database:`, updateResult.error)
              console.error(`❌ Error details:`, JSON.stringify(updateResult.error, null, 2))
            } else {
              console.log(`✅ Phone number updated in database: +${phoneNumber}`)
              console.log(`✅ Status updated to: connected`)
              console.log(`✅ Update result:`, updateResult)
            }
          } else {
            console.warn(`⚠️  Supabase not configured, phone number not saved to database`)
          }
          
          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('connected', { sessionId, tenantId, phoneNumber })
          }
          
          // Clear QR code AFTER updating database
          // This ensures frontend can detect the connection first
          // Increased delay to ensure UI has time to process
          setTimeout(() => {
            this.qrCodes.delete(sessionKey)
            this.qrCodes.delete(sessionId) // Also delete sessionId key
            console.log(`🗑️ QR code cleared for session: ${sessionKey} and ${sessionId}`)
          }, 5000) // Increased from 2s to 5s
        } else if (connection === 'connecting') {
          console.log(`🔄 Session connecting: ${sessionKey}`)
          sessionManager.updateStatus(tenantId, sessionId, 'connecting')
        }
      })

      // Handle credentials update
      sock.ev.on('creds.update', saveCreds)

      // Handle incoming messages
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const msg of messages) {
          // Skip if message is from me or status broadcast
          if (msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') continue

          console.log('📨 New message received:', {
            from: msg.key.remoteJid,
            messageId: msg.key.id,
            hasMessage: !!msg.message,
            messageKeys: msg.message ? Object.keys(msg.message) : []
          })

          // Update session activity
          sessionManager.updateActivity(tenantId, sessionId, 'message')

          // Save to database
          try {
            await this.saveIncomingMessage(sessionId, msg, tenantId)
          } catch (error) {
            console.error('❌ Error processing message:', error)
            sessionManager.updateActivity(tenantId, sessionId, 'error')
          }

          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('message', {
              sessionId,
              tenantId,
              from: msg.key.remoteJid,
              message: msg
            })
          }
        }
      })

      // Handle message updates (read receipts, delivery, etc)
      sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
          if (update.update.status) {
            const status = this.mapBaileysStatus(update.update.status)
            
            // Update in database
            if (supabase) {
              await supabase
                .from('messages')
                .update({ status })
                .eq('whatsapp_message_id', update.key.id)
            }

            // Emit via Socket.IO
            const io = global.io
            if (io) {
              io.emit('message_status', {
                sessionId,
                messageId: update.key.id,
                status
              })
            }
          }
        }
      })

      return this.sessions.get(sessionId)

    } catch (error) {
      console.error('❌ Failed to initialize session:', error)
      this.sessions.delete(sessionId)
      throw error
    }
  }

  /**
   * Send text message
   */
  async sendMessage(sessionId, to, message, quotedMessageId = null, tenantId = null) {
    // Get tenant_id from parameter or database
    if (!tenantId) {
      if (!supabase) {
        console.warn(`⚠️  Supabase not configured, using default tenant_id`)
        tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
      } else {
        try {
          const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('tenant_id')
            .eq('id', sessionId)
            .single()
          
          if (error) {
            console.warn(`⚠️  Failed to get tenant_id from database, using default:`, error.message)
            tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
          } else {
            tenantId = data.tenant_id
          }
        } catch (error) {
          console.warn(`⚠️  Error querying tenant_id, using default:`, error.message)
          tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
        }
      }
    }

    const sessionKey = this.getSessionKey(tenantId, sessionId)
    let session = this.sessions.get(sessionKey)
    
    // If session not found, try to find any active session for this tenant
    if (!session) {
      console.warn(`❌ Session not found: ${sessionKey}`)
      console.log(`📋 Available sessions:`, Array.from(this.sessions.keys()))
      
      // Try to find any active session for this tenant
      const availableSessions = Array.from(this.sessions.keys()).filter(key => key.startsWith(`${tenantId}:`))
      
      if (availableSessions.length > 0) {
        const fallbackSessionKey = availableSessions[0]
        console.log(`🔄 Using fallback session: ${fallbackSessionKey}`)
        session = this.sessions.get(fallbackSessionKey)
        
        // Update conversation in database to use the correct session
        if (supabase) {
          const fallbackSessionId = fallbackSessionKey.split(':')[1]
          try {
            // Find conversation by phone number and update session
            await supabase
              .from('conversations')
              .update({ whatsapp_session_id: fallbackSessionId })
              .eq('contact_id', supabase.rpc('get_contact_id_by_phone', { phone: to }))
              .eq('status', 'open')
            
            console.log(`✅ Updated conversation to use session: ${fallbackSessionId}`)
          } catch (err) {
            console.warn(`⚠️  Failed to update conversation session:`, err.message)
          }
        }
      } else {
        throw new Error('Session not found: ' + sessionId)
      }
    }

    const { sock } = session

    try {
      // Format phone number (remove @c.us if present)
      let phoneNumber = to.replace('@c.us', '').replace(/\D/g, '')
      
      // Validate
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        throw new Error(`Invalid phone number: ${phoneNumber}`)
      }

      // Baileys format: number@s.whatsapp.net
      const jid = `${phoneNumber}@s.whatsapp.net`

      // Prepare message content
      const messageContent = { text: message }

      // Add quoted message if provided
      if (quotedMessageId && supabase) {
        try {
          // Try to get the original message from database
          // Strategy:
          // 1. Try by whatsapp_message_id (for messages from WhatsApp)
          // 2. Try by id (for CRM messages using database ID)
          // 3. Try by raw_message.key.id in metadata (for CRM messages using WhatsApp ID)
          
          let quotedMsg = null
          
          // Try 1: by whatsapp_message_id
          let { data } = await supabase
            .from('messages')
            .select('metadata, content, is_from_me, whatsapp_message_id, message_type, id')
            .eq('whatsapp_message_id', quotedMessageId)
            .maybeSingle()
          
          if (data) {
            quotedMsg = data
          }
          
          // Try 2: by id (if quotedMessageId is a UUID)
          if (!quotedMsg && quotedMessageId.includes('-')) {
            const result = await supabase
              .from('messages')
              .select('metadata, content, is_from_me, whatsapp_message_id, message_type, id')
              .eq('id', quotedMessageId)
              .maybeSingle()
            
            quotedMsg = result.data
          }
          
          // Try 3: by raw_message.key.id in metadata (for CRM messages)
          if (!quotedMsg) {
            // Search in metadata->raw_message->key->id
            const { data: messages } = await supabase
              .from('messages')
              .select('metadata, content, is_from_me, whatsapp_message_id, message_type, id')
              .not('metadata', 'is', null)
              .limit(100) // Limit to avoid performance issues
            
            if (messages) {
              quotedMsg = messages.find(msg => {
                try {
                  return msg.metadata?.raw_message?.key?.id === quotedMessageId
                } catch {
                  return false
                }
              })
            }
          }
          
          if (quotedMsg && quotedMsg.metadata?.raw_message) {
            // Use the stored raw message for proper quoting
            const rawMsg = quotedMsg.metadata.raw_message
            
            // For Baileys, we need to pass the message as contextInfo
            // This is the proper way to quote messages in Baileys
            messageContent.contextInfo = {
              stanzaId: rawMsg.key.id,
              participant: rawMsg.key.fromMe ? undefined : rawMsg.key.remoteJid,
              quotedMessage: rawMsg.message
            }
            
            console.log('  📎 Quoting message with raw_message:', {
              stanzaId: rawMsg.key.id,
              fromMe: rawMsg.key.fromMe,
              hasQuotedMessage: !!rawMsg.message
            })
          } else if (quotedMsg) {
            // Fallback: only use if whatsapp_message_id is a valid WhatsApp ID (not UUID)
            // WhatsApp message IDs are alphanumeric without dashes
            const stanzaId = quotedMsg.whatsapp_message_id
            const isValidWhatsAppId = stanzaId && !stanzaId.includes('-')
            
            if (isValidWhatsAppId) {
              console.log('  📎 Quoting message without raw_message (fallback):', {
                stanzaId,
                hasWhatsappId: !!quotedMsg.whatsapp_message_id
              })
              
              messageContent.contextInfo = {
                stanzaId: stanzaId,
                participant: quotedMsg.is_from_me ? undefined : jid,
                quotedMessage: {
                  conversation: quotedMsg.content || ''
                }
              }
            } else {
              console.log('  ⚠️  Cannot quote message: invalid WhatsApp ID (probably CRM message without raw_message):', stanzaId)
            }
          } else {
            console.log('  ⚠️  Quoted message not found:', quotedMessageId)
          }
        } catch (err) {
          console.error('  ❌ Error getting quoted message:', err)
          // Silent fail - just send without quote if error
        }
      }

      // Send message
      const result = await sock.sendMessage(jid, messageContent)

      return {
        success: true,
        messageId: result.key.id,
        key: result.key // Return full key for metadata storage
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      throw error
    }
  }

  /**
   * Send media message
   */  /**
   * Send media message
   */
  async sendMedia(sessionId, to, mediaBuffer, options = {}, tenantId = null) {
    // Get tenant_id from parameter or database
    if (!tenantId) {
      if (!supabase) {
        console.warn(`⚠️  Supabase not configured, using default tenant_id`)
        tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
      } else {
        try {
          const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('tenant_id')
            .eq('id', sessionId)
            .single()
          
          if (error) {
            console.warn(`⚠️  Failed to get tenant_id from database, using default:`, error.message)
            tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
          } else {
            tenantId = data.tenant_id
          }
        } catch (error) {
          console.warn(`⚠️  Error querying tenant_id, using default:`, error.message)
          tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
        }
      }
    }

    const sessionKey = this.getSessionKey(tenantId, sessionId)
    const session = this.sessions.get(sessionKey)
    
    if (!session) {
      throw new Error('Session not found: ' + sessionId)
    }

    const { sock } = session

    try {
      let phoneNumber = to.replace('@c.us', '').replace(/\D/g, '')
      const jid = `${phoneNumber}@s.whatsapp.net`

      const { mimetype, caption, filename } = options

      let messageContent = {}

      if (mimetype.startsWith('image/')) {
        messageContent = {
          image: mediaBuffer,
          caption: caption || ''
        }
      } else if (mimetype.startsWith('video/')) {
        messageContent = {
          video: mediaBuffer,
          caption: caption || ''
        }
      } else if (mimetype.startsWith('audio/')) {
        messageContent = {
          audio: mediaBuffer,
          mimetype
        }
      } else {
        // For documents, caption is not directly supported by WhatsApp
        // We'll send the document first, then send caption as a separate message if provided
        messageContent = {
          document: mediaBuffer,
          mimetype,
          fileName: filename || 'document'
        }
      }

      const result = await sock.sendMessage(jid, messageContent)

      // If it's a document and has caption, send caption as separate message
      if (!mimetype.startsWith('image/') && 
          !mimetype.startsWith('video/') && 
          !mimetype.startsWith('audio/') && 
          caption && caption.trim()) {
        // Send caption as a separate text message
        await sock.sendMessage(jid, { text: caption })
      }

      return {
        success: true,
        messageId: result.key.id
      }
    } catch (error) {
      console.error('❌ Failed to send media:', error)
      throw error
    }
  }

  /**
   * Send location message
   */
  async sendLocation(sessionId, to, latitude, longitude, options = {}, tenantId = null) {
    // Get tenant_id from parameter or database
    if (!tenantId) {
      if (!supabase) {
        console.warn(`⚠️  Supabase not configured, using default tenant_id`)
        tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
      } else {
        try {
          const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('tenant_id')
            .eq('id', sessionId)
            .single()
          
          if (error) {
            console.warn(`⚠️  Failed to get tenant_id from database, using default:`, error.message)
            tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
          } else {
            tenantId = data.tenant_id
          }
        } catch (error) {
          console.warn(`⚠️  Error querying tenant_id, using default:`, error.message)
          tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
        }
      }
    }

    const sessionKey = this.getSessionKey(tenantId, sessionId)
    const session = this.sessions.get(sessionKey)
    
    if (!session) {
      throw new Error('Session not found: ' + sessionId)
    }

    const { sock } = session

    try {
      let phoneNumber = to.replace('@c.us', '').replace(/\D/g, '')
      const jid = `${phoneNumber}@s.whatsapp.net`

      const { address, name } = options

      const locationMessage = {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude,
          name: name || null,
          address: address || null
        }
      }

      const result = await sock.sendMessage(jid, locationMessage)

      return {
        success: true,
        messageId: result.key.id
      }
    } catch (error) {
      console.error('❌ Failed to send location:', error)
      throw error
    }
  }

  /**
   * Disconnect session
   */
  async disconnectSession(sessionId) {
    // Get tenant_id from database if needed
    let tenantId = null
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .select('tenant_id')
          .eq('id', sessionId)
          .single()
        
        if (!error && data) {
          tenantId = data.tenant_id
        }
      } catch (error) {
        // Ignore error, continue with sessionId only
        console.warn(`⚠️  Could not get tenant_id, continuing anyway:`, error.message)
      }
    }

    const sessionKey = tenantId ? this.getSessionKey(tenantId, sessionId) : sessionId
    const session = this.sessions.get(sessionKey)
    
    if (session) {
      const { sock } = session
      
      // Update database first
      if (supabase) {
        await supabase
          .from('whatsapp_sessions')
          .update({ status: 'disconnected' })
          .eq('id', sessionId)
      }

      // Logout from WhatsApp
      await sock.logout()
      
      // Remove from memory
      this.sessions.delete(sessionId)
      this.qrCodes.delete(sessionId)
    }

    return { success: true }
  }

  /**
   * Force delete session (remove auth files)
   */
  async forceDeleteSession(sessionId) {
    // Get tenant_id from database if needed
    let tenantId = null
    try {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select('tenant_id')
        .eq('id', sessionId)
        .single()
      
      if (!error && data) {
        tenantId = data.tenant_id
      }
    } catch (error) {
      // Ignore error, continue with sessionId only
    }

    const sessionKey = tenantId ? this.getSessionKey(tenantId, sessionId) : sessionId

    // Disconnect if connected
    if (this.sessions.has(sessionKey)) {
      const { sock } = this.sessions.get(sessionKey)
      try {
        await sock.logout()
      } catch (error) {
        console.log('Error during logout:', error.message)
      }
      this.sessions.delete(sessionKey)
    }

    // Delete auth files
    const authPath = path.join(this.authDir, sessionId)
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true })
    }

    // Delete from database
    if (supabase) {
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', sessionId)
    }

    // Delete QR codes (both keys)
    this.qrCodes.delete(sessionKey)
    this.qrCodes.delete(sessionId)
    console.log(`🗑️ QR codes deleted for: ${sessionKey} and ${sessionId}`)

    return { success: true }
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId) {
    // IMPORTANT: Always get status from database first
    // Memory status might be stale or from old session
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .select('status, tenant_id')
          .eq('id', sessionId)
          .single()
        
        if (!error && data) {
          console.log(`📊 Session status from DB: ${data.status}`)
          return data.status
        }
      } catch (error) {
        console.warn(`⚠️  Failed to get status from DB, checking memory`)
      }
    }

    // Fallback: check memory (only if DB query failed)
    let tenantId = null
    try {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select('tenant_id')
        .eq('id', sessionId)
        .single()
      
      if (!error && data) {
        tenantId = data.tenant_id
      }
    } catch (error) {
      // Ignore error
    }

    // Try with sessionKey first
    const sessionKey = tenantId ? this.getSessionKey(tenantId, sessionId) : null
    
    if (sessionKey && this.sessions.has(sessionKey)) {
      return 'connected'
    }
    
    // Fallback: try with sessionId only
    return this.sessions.has(sessionId) ? 'connected' : 'disconnected'
  }

  /**
   * Get QR code for session
   */
  async getQRCode(sessionId) {
    // Try to get tenant_id from database
    let tenantId = null
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .select('tenant_id')
          .eq('id', sessionId)
          .single()
        
        if (!error && data) {
          tenantId = data.tenant_id
        }
      } catch (error) {
        // Ignore error, try with sessionId only
      }
    }

    // Try with sessionKey first, then fallback to sessionId
    const sessionKey = tenantId ? this.getSessionKey(tenantId, sessionId) : null
    
    console.log(`🔍 Looking for QR code:`, {
      sessionId,
      tenantId,
      sessionKey,
      hasQRWithKey: sessionKey ? this.qrCodes.has(sessionKey) : false,
      hasQRWithId: this.qrCodes.has(sessionId),
      totalQRs: this.qrCodes.size,
      allKeys: Array.from(this.qrCodes.keys())
    })
    
    if (sessionKey && this.qrCodes.has(sessionKey)) {
      console.log(`✅ QR code found with sessionKey: ${sessionKey}`)
      return this.qrCodes.get(sessionKey)
    }
    
    // Fallback: try with sessionId only (for backward compatibility)
    if (this.qrCodes.has(sessionId)) {
      console.log(`✅ QR code found with sessionId: ${sessionId}`)
      return this.qrCodes.get(sessionId)
    }
    
    console.log(`❌ No QR code found for session: ${sessionId}`)
    return null
  }

  /**
   * Get all active sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.keys())
  }

  /**
   * Get all stored QR codes (for debugging)
   */
  getAllQRCodes() {
    const qrCodes = {}
    for (const [key, qr] of this.qrCodes.entries()) {
      qrCodes[key] = qr ? 'QR_EXISTS' : 'NULL'
    }
    return qrCodes
  }

  /**
   * Map Baileys message status to our status
   */
  mapBaileysStatus(baileysStatus) {
    // Baileys status: PENDING, SERVER_ACK, DELIVERY_ACK, READ, PLAYED
    switch (baileysStatus) {
      case 1: // PENDING
        return 'sending'
      case 2: // SERVER_ACK
        return 'sent'
      case 3: // DELIVERY_ACK
        return 'delivered'
      case 4: // READ
      case 5: // PLAYED
        return 'read'
      default:
        return 'sent'
    }
  }

  /**
   * Save incoming message to database
   */
  async saveIncomingMessage(sessionId, msg) {
    if (!supabase) return

    try {
      // Get session user_id
      const { data: session, error: sessionError } = await supabase
        .from('whatsapp_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        console.error('  ❌ Session not found in database:', sessionId, sessionError)
        return
      }

      const userId = session.user_id
      console.log(`  👤 User ID: ${userId}`)

      // Extract phone number from JID (format: 6285xxx@s.whatsapp.net)
      const phoneNumber = msg.key.remoteJid.split('@')[0]
      const formattedPhone = phoneNumber.startsWith('62') ? `+${phoneNumber}` : `+62${phoneNumber}`

      // Get pushname (contact name from WhatsApp)
      const pushname = msg.pushName || null

      // Find or create contact
      let { data: contact } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('phone_number', formattedPhone)
        .eq('user_id', userId)
        .single()

      if (!contact) {
        // Get default tenant ID from environment
        const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
        
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            phone_number: formattedPhone,
            name: pushname,
            tenant_id: defaultTenantId
          })
          .select()
          .single()
        contact = newContact
      } else if (pushname && !contact.name) {
        await supabase
          .from('contacts')
          .update({ name: pushname })
          .eq('id', contact.id)
      }

      // Find or create conversation
      let { data: conversations } = await supabase
        .from('conversations')
        .select('id, status, workflow_status, whatsapp_session_id')
        .eq('contact_id', contact.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)

      let conversation = conversations?.[0]
      
      // Auto-assign conversation to current session if:
      // 1. Conversation exists but has no session assigned, OR
      // 2. Conversation's session is different from current session
      if (conversation && conversation.whatsapp_session_id !== sessionId) {
        console.log(`  🔄 Auto-assigning conversation ${conversation.id} to session ${sessionId}`)
        await supabase
          .from('conversations')
          .update({ whatsapp_session_id: sessionId })
          .eq('id', conversation.id)
        
        conversation.whatsapp_session_id = sessionId
      }

      // Extract message content
      const messageText = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text ||
                         msg.message?.imageMessage?.caption ||
                         msg.message?.videoMessage?.caption ||
                         msg.message?.documentMessage?.caption ||
                         msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
                         null

      // Extract quoted message ID if this is a reply
      let quotedMessageId = null
      if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
        const stanzaId = msg.message.extendedTextMessage.contextInfo.stanzaId
        console.log('  📎 This is a quoted message!')
        console.log('  📎 Quoted stanzaId:', stanzaId)
        
        // Find the quoted message in database by whatsapp_message_id
        const { data: quotedMsg } = await supabase
          .from('messages')
          .select('id')
          .eq('whatsapp_message_id', stanzaId)
          .maybeSingle()
        
        if (quotedMsg) {
          quotedMessageId = quotedMsg.id // Use database ID
          console.log('  📎 Found quoted message in database:', quotedMessageId)
        } else {
          console.log('  ⚠️  Quoted message not found in database, using stanzaId:', stanzaId)
          quotedMessageId = stanzaId // Fallback to stanzaId
        }
      }

      if (!conversation) {
        // Get default tenant ID from environment
        const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
        
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            whatsapp_session_id: sessionId,
            contact_id: contact.id,
            tenant_id: defaultTenantId,
            status: 'open',
            read_status: 'unread',
            unread_count: 1,
            last_message: messageText || '[Media]',
            last_message_at: new Date(msg.messageTimestamp * 1000).toISOString()
          })
          .select()
          .single()
        
        if (convError || !newConv) {
          console.error('  ❌ Failed to create conversation:', convError)
          return
        }
        
        conversation = newConv
      } else {
        // Update conversation
        const { data: currentConv } = await supabase
          .from('conversations')
          .select('unread_count, status, workflow_status')
          .eq('id', conversation.id)
          .single()

        const isClosed = currentConv?.status === 'closed' || currentConv?.workflow_status === 'done'
        const updateData = {
          last_message: messageText || '[Media]',
          last_message_at: new Date(msg.messageTimestamp * 1000).toISOString(),
          read_status: 'unread',
          unread_count: (currentConv?.unread_count || 0) + 1
        }

        if (isClosed) {
          updateData.status = 'open'
          updateData.workflow_status = 'incoming'
          updateData.closed_at = null
          updateData.assigned_to = null
        }

        await supabase
          .from('conversations')
          .update(updateData)
          .eq('id', conversation.id)
      }

      // Handle media
      let mediaUrl = null
      let mediaType = null
      let mediaFilename = null
      let mediaSize = null
      let mediaMimeType = null
      let messageType = 'text'
      let locationContent = null // For storing lat,lng

      // Log message structure for debugging
      if (msg.message) {
        console.log('  📋 Message structure:', Object.keys(msg.message))
      }

      // Check for media and download
      const session_sock = this.sessions.get(sessionId)
      
      // Helper function to download and upload media
      const downloadAndUploadMedia = async (msg, type, mimetype, filename = null) => {
        try {
          // Download media using Baileys downloadMediaMessage
          const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
              logger: pino({ level: 'silent' }),
              reuploadRequest: session_sock.sock.updateMediaMessage
            }
          )
          
          if (buffer) {
            // Generate filename if not provided
            const timestamp = Date.now()
            const ext = mimetype.split('/')[1]?.split(';')[0] || 'bin'
            
            // If filename is provided, add timestamp to make it unique
            let generatedFilename
            if (filename) {
              const nameParts = filename.split('.')
              const extension = nameParts.pop()
              const baseName = nameParts.join('.')
              generatedFilename = `${baseName}_${timestamp}.${extension}`
            } else {
              generatedFilename = `${type}_${timestamp}.${ext}`
            }
            
            // Upload to Supabase Storage
            const filePath = `${userId}/${conversation.id}/${generatedFilename}`
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-media')
              .upload(filePath, buffer, {
                contentType: mimetype,
                upsert: false
              })
            
            if (uploadError) {
              console.error('  ❌ Upload error:', uploadError)
              return null
            } else {
              const { data: urlData } = supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath)
              
              return {
                url: urlData.publicUrl,
                filename: generatedFilename,
                size: buffer.length,
                mimetype: mimetype
              }
            }
          }
        } catch (mediaError) {
          console.error(`  ❌ ${type} download error:`, mediaError)
          return null
        }
      }
      
      // Handle different media types
      if (msg.message?.imageMessage) {
        messageType = 'image'
        mediaType = 'image'
        mediaMimeType = msg.message.imageMessage.mimetype || 'image/jpeg'
        
        const result = await downloadAndUploadMedia(msg, 'image', mediaMimeType)
        if (result) {
          mediaUrl = result.url
          mediaFilename = result.filename
          mediaSize = result.size
        }
      } 
      else if (msg.message?.videoMessage) {
        messageType = 'video'
        mediaType = 'video'
        mediaMimeType = msg.message.videoMessage.mimetype || 'video/mp4'
        
        const result = await downloadAndUploadMedia(msg, 'video', mediaMimeType)
        if (result) {
          mediaUrl = result.url
          mediaFilename = result.filename
          mediaSize = result.size
        }
      } 
      else if (msg.message?.audioMessage) {
        messageType = 'audio'
        mediaType = 'audio'
        mediaMimeType = msg.message.audioMessage.mimetype || 'audio/ogg'
        
        const result = await downloadAndUploadMedia(msg, 'audio', mediaMimeType)
        if (result) {
          mediaUrl = result.url
          mediaFilename = result.filename
          mediaSize = result.size
        }
      } 
      else if (msg.message?.documentMessage) {
        console.log('  📄 Processing document message...')
        messageType = 'document'
        mediaType = 'document'
        mediaMimeType = msg.message.documentMessage.mimetype || 'application/octet-stream'
        const docFilename = msg.message.documentMessage.fileName || null
        
        console.log('  📄 Document info:', { mimetype: mediaMimeType, filename: docFilename })
        
        const result = await downloadAndUploadMedia(msg, 'document', mediaMimeType, docFilename)
        if (result) {
          mediaUrl = result.url
          mediaFilename = result.filename
          mediaSize = result.size
          console.log('  ✅ Document uploaded:', { url: mediaUrl, filename: mediaFilename, size: mediaSize })
        } else {
          console.log('  ❌ Document upload failed')
        }
      }
      else if (msg.message?.documentWithCaptionMessage) {
        console.log('  📄 Processing documentWithCaptionMessage...')
        messageType = 'document'
        mediaType = 'document'
        const docMsg = msg.message.documentWithCaptionMessage.message?.documentMessage
        if (docMsg) {
          mediaMimeType = docMsg.mimetype || 'application/octet-stream'
          const docFilename = docMsg.fileName || null
          
          console.log('  📄 Document with caption info:', { mimetype: mediaMimeType, filename: docFilename, caption: messageText })
          
          // For documentWithCaptionMessage, we need to download using the original message
          // but Baileys expects the documentMessage to be at the top level
          // So we create a modified message structure
          const modifiedMsg = {
            ...msg,
            message: msg.message.documentWithCaptionMessage.message
          }
          
          const result = await downloadAndUploadMedia(modifiedMsg, 'document', mediaMimeType, docFilename)
          if (result) {
            mediaUrl = result.url
            mediaFilename = result.filename
            mediaSize = result.size
            console.log('  ✅ Document with caption uploaded:', { url: mediaUrl, filename: mediaFilename, size: mediaSize })
          } else {
            console.log('  ❌ Document with caption upload failed')
          }
        } else {
          console.log('  ❌ No documentMessage found in documentWithCaptionMessage')
        }
      }
      else if (msg.message?.stickerMessage) {
        messageType = 'image' // Treat sticker as image
        mediaType = 'image'
        mediaMimeType = msg.message.stickerMessage.mimetype || 'image/webp'
        
        const result = await downloadAndUploadMedia(msg, 'sticker', mediaMimeType)
        if (result) {
          mediaUrl = result.url
          mediaFilename = result.filename
          mediaSize = result.size
        }
      }
      else if (msg.message?.locationMessage) {
        messageType = 'location'
        mediaType = 'location'
        
        const location = msg.message.locationMessage
        const latitude = location.degreesLatitude
        const longitude = location.degreesLongitude
        const name = location.name || null
        const address = location.address || null
        
        // Store coordinates in content field (format: "lat,lng")
        locationContent = `${latitude},${longitude}`
        
        // Store Google Maps URL in media_url
        mediaUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
        
        // Store address in media_filename (if available)
        mediaFilename = address || name || null
      }

      // Save message
      if (!conversation || !conversation.id) {
        console.error('  ❌ Cannot save message: conversation is null or has no ID')
        return
      }
      
      // Get default tenant ID from environment
      const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
      
      const messageData = {
        conversation_id: conversation.id,
        sender_type: 'customer',
        content: messageType === 'location' ? locationContent : messageText,
        is_from_me: false,
        status: 'delivered',
        message_type: messageType,
        media_url: mediaUrl,
        media_type: mediaType,
        media_filename: mediaFilename,
        media_size: mediaSize,
        media_mime_type: mediaMimeType,
        whatsapp_message_id: msg.key.id,
        quoted_message_id: quotedMessageId,
        tenant_id: defaultTenantId,
        created_at: new Date(msg.messageTimestamp * 1000).toISOString(),
        // Store the raw message object in metadata for quoting later
        metadata: {
          raw_message: {
            key: msg.key,
            message: msg.message,
            messageTimestamp: msg.messageTimestamp
          }
        }
      }
      
      await supabase
        .from('messages')
        .insert(messageData)
      
      console.log('  ✅ Message saved to database:', {
        id: messageData.whatsapp_message_id,
        type: messageType,
        hasMedia: !!mediaUrl,
        content: messageText || '[no text]',
        quoted_message_id: quotedMessageId
      })

      if (mediaUrl) {
      }
    } catch (error) {
      console.error('❌ Error saving message:', error)
    }
  }
}

export default new BaileysWhatsAppService()
