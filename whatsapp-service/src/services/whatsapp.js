// WhatsApp service using Baileys
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
import { supabase } from '../config/supabase.js'

class BaileysWhatsAppService {
  constructor() {
    this.sessions = new Map() // sessionId -> { sock, store, state }
    this.qrCodes = new Map() // sessionId -> qrCode
    this.authDir = '.baileys_auth'
    
    // Create auth directory if not exists
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true })
    }
  }

  /**
   * Initialize a WhatsApp session
   */
  async initializeClient(sessionId) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)
    }

    try {
      // Create session auth directory
      const authPath = path.join(this.authDir, sessionId)
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true })
      }

      // Load auth state
      const { state, saveCreds } = await useMultiFileAuthState(authPath)

      // Get latest Baileys version
      const { version } = await fetchLatestBaileysVersion()

      // Create socket connection
      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome')
      })

      // Store session
      this.sessions.set(sessionId, { sock, state, saveCreds })

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        // Handle QR code
        if (qr) {
          // Show in terminal
          qrcodeTerminal.generate(qr, { small: true })
          
          // Convert to base64 for browser
          const qrImage = await QRCode.toDataURL(qr)
          this.qrCodes.set(sessionId, qrImage)
          
          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('qr', { sessionId, qr: qrImage })
          }
        }

        // Handle connection state
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error instanceof Boom)
            ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            : true

          // Update database
          if (supabase) {
            await supabase
              .from('whatsapp_sessions')
              .update({ status: 'disconnected' })
              .eq('id', sessionId)
          }

          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('disconnected', { sessionId })
          }

          // Remove from sessions
          this.sessions.delete(sessionId)
          this.qrCodes.delete(sessionId)

          // Reconnect if not logged out
          if (shouldReconnect) {
            setTimeout(() => {
              this.initializeClient(sessionId).catch(console.error)
            }, 5000)
          }
        } else if (connection === 'open') {
          // Clear QR code
          this.qrCodes.delete(sessionId)

          // Update database
          if (supabase) {
            await supabase
              .from('whatsapp_sessions')
              .update({ status: 'connected' })
              .eq('id', sessionId)
          }

          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('ready', { sessionId })
          }
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

          // Save to database
          await this.saveIncomingMessage(sessionId, msg)

          // Emit via Socket.IO
          const io = global.io
          if (io) {
            io.emit('message', {
              sessionId,
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
  async sendMessage(sessionId, to, message) {
    const session = this.sessions.get(sessionId)
    
    if (!session) {
      throw new Error('Session not found: ' + sessionId)
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

      // Send message
      const result = await sock.sendMessage(jid, { text: message })

      return {
        success: true,
        messageId: result.key.id
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      throw error
    }
  }

  /**
   * Send media message
   */
  async sendMedia(sessionId, to, mediaBuffer, options = {}) {
    const session = this.sessions.get(sessionId)
    
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
        messageContent = {
          document: mediaBuffer,
          mimetype,
          fileName: filename || 'document'
        }
      }

      const result = await sock.sendMessage(jid, messageContent)

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
  async sendLocation(sessionId, to, latitude, longitude, options = {}) {
    const session = this.sessions.get(sessionId)
    
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
    const session = this.sessions.get(sessionId)
    
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
    // Disconnect if connected
    if (this.sessions.has(sessionId)) {
      const { sock } = this.sessions.get(sessionId)
      try {
        await sock.logout()
      } catch (error) {
        console.log('Error during logout:', error.message)
      }
      this.sessions.delete(sessionId)
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

    this.qrCodes.delete(sessionId)

    return { success: true }
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId) {
    return this.sessions.has(sessionId) ? 'connected' : 'disconnected'
  }

  /**
   * Get QR code for session
   */
  getQRCode(sessionId) {
    return this.qrCodes.get(sessionId) || null
  }

  /**
   * Get all active sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.keys())
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
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single()

      if (!session) return

      const userId = session.user_id

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
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            phone_number: formattedPhone,
            name: pushname
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
        .select('id, status, workflow_status')
        .eq('whatsapp_session_id', sessionId)
        .eq('contact_id', contact.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)

      let conversation = conversations?.[0]

      // Extract message content
      const messageText = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text || 
                         null

      if (!conversation) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            whatsapp_session_id: sessionId,
            contact_id: contact.id,
            status: 'open',
            read_status: 'unread',
            unread_count: 1,
            last_message: messageText || '[Media]',
            last_message_at: new Date(msg.messageTimestamp * 1000).toISOString()
          })
          .select()
          .single()
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
            const generatedFilename = filename || `${type}_${timestamp}.${ext}`
            
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
        created_at: new Date(msg.messageTimestamp * 1000).toISOString()
      }
      
      await supabase
        .from('messages')
        .insert(messageData)

      if (mediaUrl) {
      }
    } catch (error) {
      console.error('❌ Error saving message:', error)
    }
  }
}

export default new BaileysWhatsAppService()
