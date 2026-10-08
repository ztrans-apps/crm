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
import {
  unwrapMessageContent,
  isReactionOrProtocol,
  extractInboundTextFromContent,
  classifyInboundMessageType,
  getInboundPreview,
  extractQuotedStanzaId,
  getMediaMetaFromContent,
  extractLocationFromContent,
  hasDisplayableInboundContent,
} from '../utils/inbound-message.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class BaileysWhatsAppService {
  constructor() {
    this.sessions = new Map() // sessionKey (tenantId:sessionId) -> { sock, store, state, tenantId }
    /** @type {Map<string, string>} LID jid → phone jid (@s.whatsapp.net) */
    this.lidToPn = new Map()
    this.qrCodes = new Map() // sessionKey -> qrCode
    
    // Use dedicated folder for auth sessions
    // Try /var/wa-sessions first, fallback to project root .baileys_auth
    const preferredPath = '/var/wa-sessions'
    // Use __dirname to get whatsapp-service/src/services, then go up 3 levels to project root
    const projectRoot = path.join(__dirname, '..', '..', '..')
    const fallbackPath = path.join(projectRoot, '.baileys_auth')
    
    
    try {
      if (!fs.existsSync(preferredPath)) {
        fs.mkdirSync(preferredPath, { recursive: true, mode: 0o755 })
      }
      // Test write permission
      const testFile = path.join(preferredPath, '.test')
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
      this.authDir = preferredPath
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
      const existingSession = this.sessions.get(sessionKey)
      try {
        await existingSession.sock.logout()
      } catch (err) {
      }
      this.sessions.delete(sessionKey)
      this.qrCodes.delete(sessionKey)
      this.qrCodes.delete(sessionId)
    }

    // If session already exists and not forcing new, return it
    if (this.sessions.has(sessionKey) && !forceNew) {
      return this.sessions.get(sessionKey)
    }

    try {
      
      // Create session auth directory
      const authPath = path.join(this.authDir, sessionId)
      
      // If forcing new session, delete old auth files
      if (forceNew && fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true })
      }
      
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true })
      } else {
      }

      // Load auth state
      const { state, saveCreds } = await useMultiFileAuthState(authPath)

      
      // Check if we have valid credentials
      // registrationId can be 0, so check for undefined/null explicitly
      const hasValidCreds = !!(state.creds?.me?.id && state.creds?.registrationId !== undefined && state.creds?.registrationId !== null)
      
      if (hasValidCreds) {
        
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
        browser: Browsers.macOS('Chrome'),
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        retryRequestDelayMs: 500,
        maxMsgRetryCount: 3,
        keepAliveIntervalMs: 25000,
        markOnlineOnConnect: false,
      })


      // Store session with tenant info
      const sessionData = { sock, state, saveCreds, tenantId, sessionId }
      this.sessions.set(sessionKey, sessionData)

      // Register with session manager
      sessionManager.registerSession(tenantId, sessionId, {
        sock,
        phoneNumber: null, // Will be updated on connection
        status: 'initializing'
      })


      // Global error handler for socket
      sock.ev.on('error', (error) => {
        console.error(`❌ Socket error for ${sessionKey}:`, error)
        
        // Update state registry on error
        sessionStateRegistry.setState(sessionId, 'ERROR')
        sessionStateRegistry.incrementErrorCount(sessionId)
        
        // Handle timeout errors specifically
        if (error.message?.includes('Timed Out') || error.message?.includes('timeout')) {
          // Don't crash, let connection.update handle reconnection
        }
      })

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        console.log(`[Baileys] connection.update ${sessionKey}`, {
          connection,
          hasQR: !!qr,
          hasLastDisconnect: !!lastDisconnect,
        })

        // Update state registry based on connection status
        if (connection === 'connecting') {
          sessionStateRegistry.setState(sessionId, 'CONNECTING')
        }

        // Handle QR code
        if (qr) {
          
          // Show in terminal
          qrcodeTerminal.generate(qr, { small: true })
          
          // Convert to base64 for browser
          const qrImage = await QRCode.toDataURL(qr)
          
          // Store with BOTH sessionKey and sessionId for compatibility
          this.qrCodes.set(sessionKey, qrImage)
          this.qrCodes.set(sessionId, qrImage) // Also store with sessionId only
          
          
          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('qr', { sessionId, tenantId, qr: qrImage })
          }
        }

        // Handle connection state
        if (connection === 'close') {
          const statusCode = lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output.statusCode
            : null
          const disconnectError = lastDisconnect?.error?.message || lastDisconnect?.error || null

          console.log(`[Baileys] connection closed ${sessionKey}`, {
            statusCode,
            disconnectError,
            reasonName: Object.keys(DisconnectReason).find(
              (k) => DisconnectReason[k] === statusCode
            ),
          })

          // Do NOT auto-reconnect on loggedOut / intentional close while pairing.
          // Auto re-init mid-scan invalidates the QR and causes "couldn't link device".
          const shouldReconnect = (lastDisconnect?.error instanceof Boom)
            ? (
                statusCode !== DisconnectReason.loggedOut &&
                statusCode !== DisconnectReason.badSession &&
                statusCode !== DisconnectReason.multideviceMismatch
              )
            : true

          // Update state registry based on disconnect reason
          if (statusCode === DisconnectReason.loggedOut) {
            sessionStateRegistry.setState(sessionId, 'LOGGED_OUT')
            reconnectManager.cancelReconnect(sessionId)

            // Clear auth so next manual "Generate QR" starts clean,
            // but do not auto-initialize here.
            const authPath = path.join(this.authDir, sessionId)
            if (fs.existsSync(authPath)) {
              fs.rmSync(authPath, { recursive: true, force: true })
            }
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
          
          sessionManager.unregisterSession(tenantId, sessionId)

          // Reconnect if not logged out
          if (shouldReconnect) {
            
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
          }
        } else if (connection === 'open') {
          
          // Update state registry to CONNECTED
          sessionStateRegistry.setState(sessionId, 'CONNECTED')
          sessionStateRegistry.resetErrorCount(sessionId)
          
          // Reset reconnect attempts on successful connection
          reconnectManager.resetAttempts(sessionId)
          
          // Get phone number from Baileys
          const phoneNumber = sock.user?.id?.split(':')[0] || null
          
          // IMPORTANT: Update creds.me if not set (for auto-reconnect to work)
          if (sock.user && (!state.creds.me || !state.creds.me.id)) {
            state.creds.me = {
              id: sock.user.id,
              name: sock.user.name || sock.user.verifiedName || 'WhatsApp User',
              lid: sock.user.lid || sock.user.id
            }
            // Save credentials immediately
            await saveCreds()
          }
          
          // Update session manager
          sessionManager.updateStatus(tenantId, sessionId, 'active')
          
          // Update database with phone number
          if (supabase) {
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
          }, 5000) // Increased from 2s to 5s
        } else if (connection === 'connecting') {
          sessionManager.updateStatus(tenantId, sessionId, 'connecting')
        }
      })

      // Handle credentials update
      sock.ev.on('creds.update', saveCreds)

      // Handle incoming messages (+ outbound from phone / CRM echo via fromMe)
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const msg of messages) {
          if (msg.key.remoteJid === 'status@broadcast') continue
          if (isReactionOrProtocol(msg.message)) continue
          if (!hasDisplayableInboundContent(msg)) continue

          const isFromMe = !!msg.key.fromMe

          console.log('[Baileys] message upsert', {
            fromMe: isFromMe,
            from: msg.key.remoteJid,
            senderPn: msg.key.senderPn || null,
            remoteJidAlt: msg.key.remoteJidAlt || null,
            messageId: msg.key.id,
            hasMessage: !!msg.message,
            supabase: !!supabase,
          })

          // Update session activity
          sessionManager.updateActivity(tenantId, sessionId, 'message')

          // Save to database (fromMe = sales reply on phone / CRM send echo; deduped by whatsapp_message_id)
          let savedConversationId = null
          try {
            savedConversationId = await this.saveIncomingMessage(sessionId, msg, tenantId)
          } catch (error) {
            console.error('❌ Error processing message:', error)
            sessionManager.updateActivity(tenantId, sessionId, 'error')
          }

          // Chatbot only for customer messages
          if (savedConversationId && !isFromMe) {
            try {
              await this.triggerChatbot(sessionId, msg, savedConversationId, tenantId)
            } catch (error) {
              console.error('❌ Error triggering chatbot:', error)
              // Don't fail the whole flow if chatbot fails
            }
          }

          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('message', {
              sessionId,
              tenantId,
              from: msg.key.remoteJid,
              fromMe: isFromMe,
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
            
            if (supabase) {
              await supabase
                .from('messages')
                .update({ status })
                .eq('whatsapp_message_id', update.key.id)
            } else {
              await this.forwardMessageStatusToCrm(sessionId, update.key.id, status)
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
  async sendMessage(sessionId, to, message, quotedMessageId = null, tenantId = null, quotedContext = null) {
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
      
      // Try to find any active session for this tenant
      const availableSessions = Array.from(this.sessions.keys()).filter(key => key.startsWith(`${tenantId}:`))
      
      if (availableSessions.length > 0) {
        const fallbackSessionKey = availableSessions[0]
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
      const jid = this.formatRecipientJid(to)

      let quoted =
        this.buildQuotedOption(quotedContext, jid) ||
        (quotedMessageId && supabase
          ? await this.resolveQuotedOptionFromDb(quotedMessageId, jid)
          : null)

      console.log('[Baileys] sendMessage', {
        sessionId,
        to,
        jid,
        messageLength: message?.length,
        hasQuotedId: !!quotedMessageId,
        hasQuotedOption: !!quoted,
        quotedStanzaId: quoted?.key?.id || null,
        quotedFromMe: quoted?.key?.fromMe ?? null,
        tenantId,
      })

      // Baileys 6: quotes must use options.quoted (not manual contextInfo on text)
      const result = await sock.sendMessage(
        jid,
        { text: message },
        quoted ? { quoted } : {}
      )

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
      const jid = this.formatRecipientJid(to)
      const { mimetype, caption, filename, quotedContext } = options

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

      const quoted = this.buildQuotedOption(quotedContext, jid)
      if (quotedContext && !quoted) {
        console.warn('[Baileys] sendMedia: quotedContext present but invalid', {
          hasStanzaId: !!quotedContext?.stanzaId,
          hasQuotedMessage: !!quotedContext?.quotedMessage,
        })
      }

      const result = await sock.sendMessage(
        jid,
        messageContent,
        quoted ? { quoted } : {}
      )

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
        messageId: result.key.id,
        key: result.key,
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
      const jid = this.formatRecipientJid(to)
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
        messageId: result.key.id,
        key: result.key,
      }
    } catch (error) {
      console.error('❌ Failed to send location:', error)
      throw error
    }
  }

  /**
   * Send media message with buttons
   */
  async sendMediaWithButtons(sessionId, to, mediaBuffer, options = {}, tenantId = null) {
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

      const { mimetype, caption, filename, footer, buttons } = options

      // Prepare media content
      let mediaContent = {}
      if (mimetype.startsWith('image/')) {
        mediaContent.image = mediaBuffer
      } else if (mimetype.startsWith('video/')) {
        mediaContent.video = mediaBuffer
      } else if (mimetype.startsWith('audio/')) {
        mediaContent.audio = mediaBuffer
        mediaContent.mimetype = mimetype
      } else {
        mediaContent.document = mediaBuffer
        mediaContent.mimetype = mimetype
        mediaContent.fileName = filename || 'document'
      }

      // Add caption if provided
      if (caption) {
        mediaContent.caption = caption
      }

      // Add footer if provided
      if (footer) {
        mediaContent.footer = footer
      }

      // Add buttons if provided
      if (buttons && buttons.length > 0) {
        // Convert buttons to Baileys format
        const baileysButtons = buttons.map((btn, idx) => {
          if (btn.type === 'QUICK_REPLY') {
            return {
              buttonId: `btn_${idx}`,
              buttonText: { displayText: btn.text },
              type: 1
            }
          } else if (btn.type === 'URL') {
            return {
              buttonId: `btn_${idx}`,
              buttonText: { displayText: btn.text },
              type: 1
            }
          } else if (btn.type === 'PHONE_NUMBER') {
            return {
              buttonId: `btn_${idx}`,
              buttonText: { displayText: btn.text },
              type: 1
            }
          }
          return null
        }).filter(Boolean)

        if (baileysButtons.length > 0) {
          mediaContent.buttons = baileysButtons
          mediaContent.headerType = mimetype.startsWith('image/') ? 1 : 
                                    mimetype.startsWith('video/') ? 2 : 
                                    mimetype.startsWith('document/') ? 3 : 4
        }
      }

      const result = await sock.sendMessage(jid, mediaContent)

      return {
        success: true,
        messageId: result.key.id
      }
    } catch (error) {
      console.error('❌ Failed to send media with buttons:', error)
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

    return { success: true }
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId) {
    // Prefer live memory / session manager — DB may lag when SERVICE_KEY is missing
    const live = this.getLiveSessionStatus(sessionId)
    if (live === 'connected') {
      return 'connected'
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .select('status, tenant_id')
          .eq('id', sessionId)
          .single()

        if (!error && data?.status) {
          return data.status
        }
      } catch (error) {
        console.warn(`⚠️  Failed to get status from DB, checking memory`)
      }
    }

    return live
  }

  /**
   * Resolve live in-memory status for a sessionId
   */
  getLiveSessionStatus(sessionId) {
    if (this.sessions.has(sessionId)) {
      return 'connected'
    }

    for (const [key, value] of this.sessions.entries()) {
      if (key === sessionId || key.endsWith(`:${sessionId}`)) {
        const sock = value?.sock
        if (sock?.user?.id) return 'connected'
        return 'connecting'
      }
    }

    try {
      const managed = sessionManager.getSession(
        process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001',
        sessionId
      )
      if (managed?.status === 'active' || managed?.sock?.user?.id) {
        return 'connected'
      }
      if (managed) return 'connecting'
    } catch {
      // ignore
    }

    // Scan all managed sessions for this sessionId
    try {
      for (const session of sessionManager.getAllSessions?.() || []) {
        if (session.sessionId === sessionId) {
          if (session.status === 'active' || session.sock?.user?.id) return 'connected'
          return session.status === 'connecting' ? 'connecting' : 'disconnected'
        }
      }
    } catch {
      // ignore
    }

    return 'disconnected'
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

    console.log('[Baileys] getQRCode', {
      sessionId,
      tenantId,
      sessionKey,
      hasQRWithKey: sessionKey ? this.qrCodes.has(sessionKey) : false,
      hasQRWithId: this.qrCodes.has(sessionId),
      totalQRs: this.qrCodes.size,
      allKeys: Array.from(this.qrCodes.keys()),
    })
    
    if (sessionKey && this.qrCodes.has(sessionKey)) {
      return this.qrCodes.get(sessionKey)
    }
    
    // Fallback: try with sessionId only (for backward compatibility)
    if (this.qrCodes.has(sessionId)) {
      return this.qrCodes.get(sessionId)
    }
    
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
    if (typeof baileysStatus === 'string') {
      const s = baileysStatus.toLowerCase()
      if (s.includes('read') || s === 'played') return 'read'
      if (s.includes('delivery') || s === 'delivery_ack') return 'delivered'
      if (s === 'server_ack') return 'sent'
      if (s === 'pending') return 'sending'
      if (s === 'error' || s === 'failed') return 'failed'
      return 'sent'
    }
    // Baileys status: PENDING, SERVER_ACK, DELIVERY_ACK, READ, PLAYED
    switch (baileysStatus) {
      case 0:
        return 'sending'
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

  async forwardMessageStatusToCrm(sessionId, whatsappMessageId, status) {
    const baseUrl = (process.env.CRM_APP_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '')
    if (!baseUrl) return

    const headers = { 'Content-Type': 'application/json' }
    if (process.env.WHATSAPP_BRIDGE_SECRET) {
      headers['x-bridge-secret'] = process.env.WHATSAPP_BRIDGE_SECRET
    }

    try {
      await fetch(`${baseUrl}/api/whatsapp/baileys-status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, whatsappMessageId, status }),
      })
    } catch (error) {
      console.warn('[Baileys] forward status failed:', error?.message || error)
    }
  }

  /**
   * Resolve a phone-number JID (@s.whatsapp.net) from LID / alt fields.
   * WhatsApp increasingly sends @lid for 1:1 chats; phone must be recovered
   * via senderPn / remoteJidAlt / Baileys lidMapping cache.
   */
  async resolvePhoneJid(sessionId, msg, tenantId) {
    const key = msg.key || {}
    const candidates = [
      key.senderPn,
      key.remoteJidAlt,
      key.participantPn,
      key.participantAlt,
      key.participant,
      key.remoteJid,
    ].filter(Boolean)

    for (const jid of candidates) {
      if (typeof jid === 'string' && jid.endsWith('@s.whatsapp.net')) {
        return jid
      }
    }

    const lid =
      (typeof key.remoteJid === 'string' && key.remoteJid.endsWith('@lid') && key.remoteJid) ||
      (typeof key.participant === 'string' && key.participant.endsWith('@lid') && key.participant) ||
      null

    if (!lid) return null

    if (this.lidToPn.has(lid)) {
      return this.lidToPn.get(lid)
    }

    try {
      const sessionKey = tenantId ? `${tenantId}:${sessionId}` : sessionId
      const session =
        this.sessions.get(sessionKey) ||
        this.sessions.get(sessionId) ||
        null
      const sock = session?.sock
      const pn = await sock?.signalRepository?.lidMapping?.getPNForLID?.(lid)
      if (pn && typeof pn === 'string' && pn.includes('@')) {
        const normalized = pn.endsWith('@s.whatsapp.net') ? pn : `${pn.split('@')[0]}@s.whatsapp.net`
        this.lidToPn.set(lid, normalized)
        return normalized
      }
    } catch (error) {
      console.warn('[Baileys] lidMapping.getPNForLID failed:', error?.message || error)
    }

    return null
  }

  rememberLidPhoneMapping(msg, phoneJid) {
    const remote = msg?.key?.remoteJid
    const senderPn = msg?.key?.senderPn
    if (typeof remote === 'string' && remote.endsWith('@lid')) {
      if (typeof senderPn === 'string' && senderPn.endsWith('@s.whatsapp.net')) {
        this.lidToPn.set(remote, senderPn)
      } else if (typeof phoneJid === 'string' && phoneJid.endsWith('@s.whatsapp.net')) {
        this.lidToPn.set(remote, phoneJid)
      }
    }
  }

  formatRecipientJid(to) {
    const rawTo = String(to || '').trim()
    if (rawTo.endsWith('@lid') || rawTo.endsWith('@s.whatsapp.net')) {
      return rawTo
    }
    if (rawTo.toLowerCase().startsWith('lid:')) {
      const lidUser = rawTo.slice(4).replace(/\D/g, '')
      const looksLikePhone = /^62\d{8,13}$/.test(lidUser)
      return looksLikePhone ? `${lidUser}@s.whatsapp.net` : `${lidUser}@lid`
    }
    let phoneNumber = rawTo.replace('@c.us', '').replace(/\D/g, '')
    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      throw new Error(`Invalid phone number: ${phoneNumber}`)
    }
    return `${phoneNumber}@s.whatsapp.net`
  }

  /**
   * Build Baileys sendMessage options.quoted from CRM bridge payload.
   */
  buildQuotedOption(quotedContext, fallbackJid) {
    if (!quotedContext?.stanzaId || !quotedContext?.quotedMessage) return null

    let message = quotedContext.quotedMessage
    if (message?.message && typeof message.message === 'object') {
      message = message.message
    }

    // Strip empty / unknown wrappers so Baileys getContentType works
    if (message && typeof message === 'object') {
      const copy = { ...message }
      delete copy.messageContextInfo
      message = copy
    }

    const fromMe = !!quotedContext.fromMe
    // Prefer original chat JID for quotes (often @lid). Baileys will set
    // contextInfo.remoteJid when send jid !== quoted remoteJid — that is OK.
    const remoteJid = quotedContext.remoteJid || fallbackJid
    return {
      key: {
        remoteJid,
        fromMe,
        id: quotedContext.stanzaId,
        ...(fromMe
          ? {}
          : {
              participant:
                quotedContext.participant ||
                quotedContext.remoteJid ||
                remoteJid,
            }),
      },
      message,
    }
  }

  async resolveQuotedOptionFromDb(quotedMessageId, jid) {
    try {
      let quotedMsg = null

      let { data } = await supabase
        .from('messages')
        .select('metadata, content, is_from_me, whatsapp_message_id, message_type, id')
        .eq('whatsapp_message_id', quotedMessageId)
        .maybeSingle()
      if (data) quotedMsg = data

      if (!quotedMsg && quotedMessageId.includes('-')) {
        const result = await supabase
          .from('messages')
          .select('metadata, content, is_from_me, whatsapp_message_id, message_type, id')
          .eq('id', quotedMessageId)
          .maybeSingle()
        quotedMsg = result.data
      }

      if (!quotedMsg) return null

      const rawMsg = quotedMsg.metadata?.raw_message
      if (rawMsg?.key?.id && rawMsg.message) {
        return this.buildQuotedOption(
          {
            stanzaId: rawMsg.key.id,
            fromMe: !!rawMsg.key.fromMe || !!quotedMsg.is_from_me,
            remoteJid: rawMsg.key.remoteJid || jid,
            participant: rawMsg.key.participant || rawMsg.key.remoteJid,
            quotedMessage: rawMsg.message,
          },
          jid
        )
      }

      const stanzaId = quotedMsg.whatsapp_message_id
      if (stanzaId && !stanzaId.includes('-')) {
        return this.buildQuotedOption(
          {
            stanzaId,
            fromMe: !!quotedMsg.is_from_me,
            remoteJid: jid,
            participant: quotedMsg.is_from_me ? undefined : jid,
            quotedMessage: { conversation: quotedMsg.content || '' },
          },
          jid
        )
      }
    } catch (err) {
      console.error('[Baileys] resolve quote from DB failed:', err?.message || err)
    }
    return null
  }

  analyzeInboundMessage(msg) {
    const unwrapped = unwrapMessageContent(msg.message)
    const messageType = classifyInboundMessageType(unwrapped)
    const messageText = extractInboundTextFromContent(unwrapped)
    const lastMessagePreview = getInboundPreview(messageText, messageType)
    const quotedWhatsappId = extractQuotedStanzaId(unwrapped)
    const mediaMeta = getMediaMetaFromContent(unwrapped)
    return {
      unwrapped,
      messageType,
      messageText,
      lastMessagePreview,
      quotedWhatsappId,
      mediaMeta,
    }
  }

  extractInboundText(msg) {
    return extractInboundTextFromContent(unwrapMessageContent(msg.message))
  }

  async downloadInboundMediaBuffer(sessionId, tenantId, msg, mediaMeta) {
    const sessionKey = this.getSessionKey(tenantId, sessionId)
    let session = this.sessions.get(sessionKey)
    if (!session) {
      for (const [key, s] of this.sessions.entries()) {
        if (key.endsWith(`:${sessionId}`) || key === sessionId) {
          session = s
          break
        }
      }
    }
    if (!session?.sock) return null

    try {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
      let downloadMsg = msg
      if (msg.message?.documentWithCaptionMessage?.message) {
        downloadMsg = {
          ...msg,
          message: msg.message.documentWithCaptionMessage.message,
        }
      }
      const buffer = await downloadMediaMessage(
        downloadMsg,
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: session.sock.updateMediaMessage,
        }
      )
      if (!buffer || buffer.length === 0) return null
      const maxBytes = 12 * 1024 * 1024
      if (buffer.length > maxBytes) {
        console.warn('[Baileys] inbound media too large for bridge, skipping bytes', buffer.length)
        return null
      }
      return {
        base64: buffer.toString('base64'),
        mimetype: mediaMeta.mimetype,
        filename: mediaMeta.filename,
        size: buffer.length,
        messageType: mediaMeta.messageType,
      }
    } catch (error) {
      console.error('[Baileys] inbound media download failed:', error?.message || error)
      return null
    }
  }

  /**
   * When VPS has no SUPABASE_SERVICE_KEY, forward inbound text to the Next.js app
   * (which already has SUPABASE_SERVICE_ROLE_KEY on Vercel).
   */
  async forwardIncomingToCrm(sessionId, msg, tenantId, phoneJid, fromLid = false) {
    const baseUrl = (process.env.CRM_APP_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '')
    if (!baseUrl) {
      console.warn('[Baileys] cannot forward inbound: CRM_APP_URL/FRONTEND_URL not set')
      return null
    }

    const unresolvedLid = fromLid && !phoneJid
    const phoneNumber = unresolvedLid
      ? msg.key.remoteJid.split('@')[0]
      : phoneJid.split('@')[0]

    const analysis = this.analyzeInboundMessage(msg)
    let mediaPayload = null
    if (analysis.mediaMeta) {
      mediaPayload = await this.downloadInboundMediaBuffer(
        sessionId,
        tenantId,
        msg,
        analysis.mediaMeta
      )
    }

    const location =
      analysis.messageType === 'location'
        ? extractLocationFromContent(analysis.unwrapped)
        : null

    const chatLid =
      typeof msg.key.remoteJid === 'string' && msg.key.remoteJid.endsWith('@lid')
        ? msg.key.remoteJid
        : null

    const payload = {
      sessionId,
      tenantId,
      phoneNumber,
      pushName: msg.pushName || null,
      messageText: analysis.messageText,
      messageType: mediaPayload?.messageType || analysis.messageType,
      lastMessagePreview: analysis.lastMessagePreview,
      quotedWhatsappId: analysis.quotedWhatsappId,
      messageId: msg.key.id,
      messageTimestamp: msg.messageTimestamp,
      // only true when we could NOT map LID → phone (avoid lid:628… contacts)
      fromLid: unresolvedLid,
      chatLid,
      senderPn: msg.key.senderPn || phoneJid || null,
      isFromMe: !!msg.key.fromMe,
      location,
      rawMessage: {
        key: msg.key,
        message: analysis.unwrapped || msg.message,
        messageTimestamp: msg.messageTimestamp,
      },
      media: mediaPayload,
    }

    const headers = { 'Content-Type': 'application/json' }
    if (process.env.WHATSAPP_BRIDGE_SECRET) {
      headers['x-bridge-secret'] = process.env.WHATSAPP_BRIDGE_SECRET
    }

    try {
      const res = await fetch(`${baseUrl}/api/whatsapp/baileys-incoming`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('[Baileys] forward inbound failed', res.status, data)
        return null
      }
      console.log('[Baileys] forwarded inbound → CRM', {
        conversationId: data.conversationId,
        phone: data.phone,
      })
      return data.conversationId || true
    } catch (error) {
      console.error('[Baileys] forward inbound error:', error?.message || error)
      return null
    }
  }

  /**
   * Save incoming message to database
   */
  async saveIncomingMessage(sessionId, msg, tenantId) {
    try {
      // Skip group messages - CRM only handles 1-on-1 chats
      if (msg.key.remoteJid.endsWith('@g.us')) {
        return
      }
      
      // Skip status broadcast
      if (msg.key.remoteJid === 'status@broadcast') {
        return
      }

      // Skip WhatsApp Communities/Broadcast
      if (msg.key.remoteJid.endsWith('@broadcast')) {
        return
      }

      let phoneJid = null
      let fromLid = false
      if (msg.key.remoteJid.endsWith('@s.whatsapp.net')) {
        phoneJid = msg.key.remoteJid
      } else if (msg.key.remoteJid.endsWith('@lid')) {
        fromLid = true
        phoneJid = await this.resolvePhoneJid(sessionId, msg, tenantId)
        if (phoneJid) {
          this.rememberLidPhoneMapping(msg, phoneJid)
          console.log('[Baileys] resolved @lid →', phoneJid)
        } else {
          console.warn('[Baileys] @lid without phone mapping — saving with lid: prefix', {
            remoteJid: msg.key.remoteJid,
            fromMe: !!msg.key.fromMe,
            senderPn: msg.key.senderPn || null,
            remoteJidAlt: msg.key.remoteJidAlt || null,
            messageId: msg.key.id,
            cached: this.lidToPn.has(msg.key.remoteJid),
          })
        }
      } else {
        return null
      }

      this.rememberLidPhoneMapping(msg, phoneJid)

      // No direct Supabase on VPS → forward to Next.js (service role lives there)
      if (!supabase) {
        return await this.forwardIncomingToCrm(sessionId, msg, tenantId, phoneJid, fromLid)
      }

      if (fromLid && !phoneJid) {
        // Persist with synthetic lid: phone so chat still appears in CRM
        const lidUser = msg.key.remoteJid.split('@')[0]
        const modifiedMsg = {
          ...msg,
          key: { ...msg.key, remoteJid: `${lidUser}@s.whatsapp.net` },
          __lidFallback: true,
        }
        return await this.processDirectMessage(sessionId, modifiedMsg, tenantId)
      }

      const modifiedMsg =
        phoneJid === msg.key.remoteJid
          ? msg
          : {
              ...msg,
              key: {
                ...msg.key,
                remoteJid: phoneJid,
              },
            }

      return await this.processDirectMessage(sessionId, modifiedMsg, tenantId)
      
    } catch (error) {
      console.error('❌ Error in saveIncomingMessage:', error)
      return null
    }
  }
  
  /**
   * Process direct message (extracted from saveIncomingMessage for reuse)
   */
  async processDirectMessage(sessionId, msg, tenantId) {
    try {
      const isFromMe = !!msg.key.fromMe

      // Deduplicate CRM-sent echoes / phone sync by WhatsApp stanza id
      if (msg.key?.id) {
        const { data: existingMsg } = await supabase
          .from('messages')
          .select('id, conversation_id')
          .eq('whatsapp_message_id', msg.key.id)
          .maybeSingle()
        if (existingMsg) {
          return existingMsg.conversation_id || true
        }
      }

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

      // Extract phone number from JID (direct messages only)
      const rawJid = msg.key.remoteJid
      const phoneNumber = rawJid.split('@')[0]
      const lidFallback = !!msg.__lidFallback
      
      // Validate phone number length and format
      if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 18) {
        console.error('  ❌ Invalid phone number length:', phoneNumber, `(${phoneNumber.length} chars)`)
        console.error('  ❌ Raw JID:', rawJid)
        return null
      }
      
      // Check for corrupted phone (too long or has invalid characters)
      if (!/^\d+$/.test(phoneNumber)) {
        console.error('  ❌ Phone number contains non-digit characters:', phoneNumber)
        console.error('  ❌ Raw JID:', rawJid)
        return null
      }
      
      // Format phone number properly
      let formattedPhone
      if (lidFallback) {
        // WhatsApp LID without PN mapping — keep chat visible until mapping appears
        formattedPhone = `lid:${phoneNumber}`
      } else if (phoneNumber.startsWith('62')) {
        // Already has country code
        formattedPhone = `+${phoneNumber}`
      } else if (phoneNumber.startsWith('0')) {
        // Local format (08xxx) - convert to international
        formattedPhone = `+62${phoneNumber.substring(1)}`
      } else {
        // Assume it's missing country code
        formattedPhone = `+62${phoneNumber}`
      }
      
      // Final validation - Indonesian mobile, or lid: fallback
      if (!lidFallback && !/^\+628\d{8,11}$/.test(formattedPhone)) {
        console.error('  ❌ Invalid Indonesian phone format:', formattedPhone)
        return null
      }
      

      // Get pushname (contact name from WhatsApp)
      const pushname = msg.pushName || null

      // Find or create contact
      let { data: contact } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('phone_number', formattedPhone)
        .eq('user_id', userId)
        .maybeSingle()

      if (!contact) {
        // Create new contact
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
      } else {
        // Update contact name if:
        // 1. Contact has no name, OR
        // 2. Pushname is different from current name (WhatsApp name changed)
        if (pushname && (!contact.name || contact.name !== pushname)) {
          await supabase
            .from('contacts')
            .update({ name: pushname })
            .eq('id', contact.id)
          
          contact.name = pushname
        }
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
        await supabase
          .from('conversations')
          .update({ whatsapp_session_id: sessionId })
          .eq('id', conversation.id)
        
        conversation.whatsapp_session_id = sessionId
      }

      const inboundAnalysis = this.analyzeInboundMessage(msg)
      const messageText = inboundAnalysis.messageText
      const lastMessagePreview = inboundAnalysis.lastMessagePreview

      // Extract quoted message ID if this is a reply
      let quotedMessageId = null
      const stanzaId = inboundAnalysis.quotedWhatsappId
      if (stanzaId) {
        
        // Find the quoted message in database by whatsapp_message_id
        const { data: quotedMsg } = await supabase
          .from('messages')
          .select('id')
          .eq('whatsapp_message_id', stanzaId)
          .maybeSingle()
        
        if (quotedMsg) {
          quotedMessageId = quotedMsg.id // Use database ID
        } else {
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
            // Outbound-from-phone should not mark inbox unread
            read_status: isFromMe ? 'read' : 'unread',
            unread_count: isFromMe ? 0 : 1,
            last_message: lastMessagePreview,
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
          last_message: lastMessagePreview,
          last_message_at: new Date(msg.messageTimestamp * 1000).toISOString(),
        }

        if (!isFromMe) {
          updateData.read_status = 'unread'
          updateData.unread_count = (currentConv?.unread_count || 0) + 1
          if (isClosed) {
            updateData.status = 'open'
            updateData.workflow_status = 'incoming'
            updateData.closed_at = null
            updateData.assigned_to = null
          }
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
      }

      // Check for media and download
      // Session is stored with tenantId:sessionId format, need to find it
      let session_sock = null
      for (const [key, session] of this.sessions.entries()) {
        if (key.endsWith(`:${sessionId}`) || key === sessionId) {
          session_sock = session
          break
        }
      }
      
      if (!session_sock) {
        console.error('  ❌ Session socket not found for media download!')
        console.error('     Session ID:', sessionId)
        console.error('     Available sessions:', Array.from(this.sessions.keys()))
      }
      
      // Helper function to download and upload media
      const downloadAndUploadMedia = async (msg, type, mimetype, filename = null) => {
        if (!session_sock) {
          console.error(`  ❌ Cannot download ${type}: session socket not available`)
          return null
        }
        
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
        messageType = 'document'
        mediaType = 'document'
        mediaMimeType = msg.message.documentMessage.mimetype || 'application/octet-stream'
        const docFilename = msg.message.documentMessage.fileName || null
        
        
        const result = await downloadAndUploadMedia(msg, 'document', mediaMimeType, docFilename)
        if (result) {
          mediaUrl = result.url
          mediaFilename = result.filename
          mediaSize = result.size
        } else {
        }
      }
      else if (msg.message?.documentWithCaptionMessage) {
        messageType = 'document'
        mediaType = 'document'
        const docMsg = msg.message.documentWithCaptionMessage.message?.documentMessage
        if (docMsg) {
          mediaMimeType = docMsg.mimetype || 'application/octet-stream'
          const docFilename = docMsg.fileName || null
          
          
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
          } else {
          }
        } else {
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
        sender_type: isFromMe ? 'agent' : 'customer',
        content: messageType === 'location' ? locationContent : messageText,
        is_from_me: isFromMe,
        status: isFromMe ? 'sent' : 'delivered',
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
          source: isFromMe ? 'whatsapp_device' : 'whatsapp_inbound',
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

      console.log('[Baileys] message saved', {
        id: messageData.whatsapp_message_id,
        type: messageType,
        hasMedia: !!mediaUrl,
        content: messageText || '[no text]',
        quoted_message_id: quotedMessageId,
      })

      // Return conversation ID for chatbot trigger
      return conversation.id

    } catch (error) {
      console.error('❌ Error saving message:', error)
      return null
    }
  }

  /**
   * Trigger chatbot for incoming message
   */
  async triggerChatbot(sessionId, msg, conversationId, tenantId) {
    if (!supabase) return

    try {
      // Extract message text
      const messageText = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text ||
                         null

      if (!messageText) {
        return
      }


      // Get active chatbots for this tenant, ordered by priority
      const { data: chatbots, error } = await supabase
        .from('chatbots')
        .select('id, name, trigger_type, trigger_config, priority')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('priority', { ascending: false })

      if (error) {
        console.error('  ❌ Error fetching chatbots:', error)
        return
      }

      if (!chatbots || chatbots.length === 0) {
        return
      }


      // Find matching chatbot
      let matchedChatbot = null
      for (const chatbot of chatbots) {
        const isMatch = await this.checkChatbotTrigger(chatbot, messageText, conversationId)
        if (isMatch) {
          matchedChatbot = chatbot
          break
        }
      }

      if (!matchedChatbot) {
        return
      }

      // Get chatbot response from trigger_config
      const response = matchedChatbot.trigger_config?.response_message
      if (!response) {
        return
      }

      // Send response via Next.js API (which uses queue system)
      const phoneNumber = msg.key.remoteJid.split('@')[0]
      const to = `${phoneNumber}@c.us`

      try {
        // Call Next.js API to send message (which will use queue)
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const response_api = await fetch(`${apiUrl}/api/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId,
            to: to,
            message: response,
            conversationId: conversationId,
            userId: 'bot', // Mark as bot message
            quotedMessageId: null,
            chatbotMetadata: {
              chatbot_id: matchedChatbot.id,
              chatbot_name: matchedChatbot.name,
              trigger_type: matchedChatbot.trigger_type
            }
          })
        })

        if (!response_api.ok) {
          const errorData = await response_api.json()
          throw new Error(errorData.error || 'Failed to send via API')
        }

        const result = await response_api.json()

        // Update the saved message metadata
        if (result.messageId && supabase) {
          try {
            await supabase
              .from('messages')
              .update({
                metadata: {
                  chatbot_id: matchedChatbot.id,
                  chatbot_name: matchedChatbot.name,
                  trigger_type: matchedChatbot.trigger_type,
                  queueJobId: result.jobId
                }
              })
              .eq('id', result.messageId)

          } catch (updateError) {
            console.error('  ❌ Failed to update message metadata:', updateError)
          }
        }
      } catch (sendError) {
        console.error('  ❌ Failed to send chatbot response via API:', sendError)
        
        // Fallback: send directly if API fails
        try {
          const jid = `${phoneNumber}@s.whatsapp.net`
          const directResult = await this.sendMessage(sessionId, jid, response, null, tenantId)

          // Save bot message to database
          if (directResult.success && supabase) {
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
            
            const botMessageData = {
              conversation_id: conversationId,
              sender_type: 'bot',
              content: response,
              is_from_me: true,
              status: 'sent',
              message_type: 'text',
              whatsapp_message_id: directResult.messageId,
              tenant_id: defaultTenantId,
              created_at: new Date().toISOString(),
              metadata: {
                chatbot_id: matchedChatbot.id,
                chatbot_name: matchedChatbot.name,
                trigger_type: matchedChatbot.trigger_type,
                fallback: true,
                raw_message: directResult.key ? {
                  key: directResult.key,
                  message: { conversation: response },
                  messageTimestamp: Math.floor(Date.now() / 1000)
                } : null
              }
            }

            await supabase
              .from('messages')
              .insert(botMessageData)

            // Update conversation last_message
            await supabase
              .from('conversations')
              .update({
                last_message: response,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', conversationId)

          }
        } catch (fallbackError) {
          console.error('  ❌ Fallback also failed:', fallbackError)
          throw fallbackError
        }
      }

      // Log analytics
      await supabase
        .from('chatbot_analytics')
        .insert({
          chatbot_id: matchedChatbot.id,
          event_type: 'triggered',
          event_data: {
            conversation_id: conversationId,
            message_text: messageText,
            response_sent: response
          }
        })

    } catch (error) {
      console.error('❌ Error in triggerChatbot:', error)
    }
  }

  /**
   * Check if chatbot trigger matches the message
   */
  async checkChatbotTrigger(chatbot, messageText, conversationId) {
    const { trigger_type, trigger_config } = chatbot

    switch (trigger_type) {
      case 'keyword':
        // Check if message contains any of the keywords
        const keywords = trigger_config?.keywords || []
        if (!Array.isArray(keywords) || keywords.length === 0) return false
        
        const lowerMessage = messageText.toLowerCase()
        return keywords.some(keyword => 
          lowerMessage.includes(keyword.toLowerCase())
        )

      case 'greeting':
        // Check if message is a greeting
        const greetings = ['halo', 'hai', 'hello', 'hi', 'hey', 'selamat', 'pagi', 'siang', 'sore', 'malam']
        const lowerMsg = messageText.toLowerCase().trim()
        return greetings.some(greeting => lowerMsg.startsWith(greeting))

      case 'always':
        // Always trigger (for testing or catch-all)
        return true

      case 'schedule':
        // Check if current time matches schedule
        const schedule = trigger_config?.schedule
        if (!schedule) return false
        
        const now = new Date()
        const currentHour = now.getHours()
        const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
        
        // Check if current time is within schedule
        if (schedule.days && !schedule.days.includes(currentDay)) return false
        if (schedule.start_hour && currentHour < schedule.start_hour) return false
        if (schedule.end_hour && currentHour >= schedule.end_hour) return false
        
        return true

      case 'intent':
        // Simple intent matching (can be enhanced with NLP)
        const intents = trigger_config?.intents || []
        if (!Array.isArray(intents) || intents.length === 0) return false
        
        const msgLower = messageText.toLowerCase()
        return intents.some(intent => {
          const patterns = intent.patterns || []
          return patterns.some(pattern => 
            msgLower.includes(pattern.toLowerCase())
          )
        })

      default:
        return false
    }
  }

}

export default new BaileysWhatsAppService()
