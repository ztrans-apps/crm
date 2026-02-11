import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import qrcode from 'qrcode-terminal'
import { supabase } from '../config/supabase.js'

class WhatsAppService {
  constructor() {
    this.clients = new Map()
    this.initializingClients = new Set() // Track clients being initialized
    this.startHealthCheck() // Start health check on service start
  }

  // Health check to keep sessions alive
  startHealthCheck() {
    setInterval(async () => {
      console.log('🔍 Running health check on all sessions...')
      
      for (const [sessionId, client] of this.clients.entries()) {
        try {
          // Skip if currently initializing
          if (this.initializingClients.has(sessionId)) {
            console.log(`  ⏳ Session ${sessionId} is initializing, skipping...`)
            continue
          }

          const state = await client.getState()
          console.log(`  📱 Session ${sessionId}: ${state}`)
          
          if (state !== 'CONNECTED') {
            console.log(`  ⚠️ Session ${sessionId} not connected, reinitializing...`)
            this.clients.delete(sessionId)
            await this.initializeClient(sessionId)
          }
        } catch (error) {
          console.error(`  ❌ Health check error for ${sessionId}:`, error.message)
          
          // If error, try to reinitialize
          try {
            console.log(`  🔄 Attempting to reinitialize ${sessionId}...`)
            this.clients.delete(sessionId)
            await this.initializeClient(sessionId)
          } catch (reinitError) {
            console.error(`  ❌ Failed to reinitialize ${sessionId}:`, reinitError.message)
          }
        }
      }
      
      console.log('✓ Health check complete')
    }, 120000) // Check every 2 minutes
  }

  async initializeClient(sessionId) {
    // Prevent multiple initializations
    if (this.initializingClients.has(sessionId)) {
      console.log('Client already initializing:', sessionId)
      // Wait for existing initialization
      await new Promise(resolve => setTimeout(resolve, 5000))
      return this.clients.get(sessionId)
    }

    if (this.clients.has(sessionId)) {
      console.log('Client already exists:', sessionId)
      return this.clients.get(sessionId)
    }

    this.initializingClients.add(sessionId)
    console.log('Initializing new client for session:', sessionId)

    try {
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ],
          timeout: 60000
        }
      })

    // Store client
    this.clients.set(sessionId, client)

    // QR Code event
    client.on('qr', async (qr) => {
      console.log('QR received for session:', sessionId)
      
      // Show in terminal
      qrcode.generate(qr, { small: true })
      
      // Convert QR to base64 image for browser
      const QRCode = await import('qrcode')
      const qrImage = await QRCode.toDataURL(qr)
      
      // Emit to Socket.IO
      const io = global.io
      if (io) {
        io.emit('qr', { sessionId, qr: qrImage })
      }
    })

    // Ready event
    client.on('ready', async () => {
      console.log('✅ WhatsApp ready for session:', sessionId)
      console.log('⏳ Initializing contact list and LID...')
      console.log('')
      console.log('⚠️  IMPORTANT: Wait 10-30 seconds before sending messages!')
      console.log('   WhatsApp needs time to:')
      console.log('   - Load contact list')
      console.log('   - Initialize LID (Linked Identity)')
      console.log('   - Sync with WhatsApp servers')
      console.log('')
      
      // Update status in database to 'connected' (matching existing data)
      if (supabase) {
        await supabase
          .from('whatsapp_sessions')
          .update({ status: 'connected' })
          .eq('id', sessionId)
      }
      
      // Wait for full initialization
      setTimeout(() => {
        console.log('✅ Session fully initialized for:', sessionId)
        console.log('✅ Ready to send messages!')
        console.log('')
      }, 30000) // Wait 30 seconds for full initialization
      
      const io = global.io
      if (io) {
        io.emit('ready', { sessionId })
      }
    })

    // Disconnected event
    client.on('disconnected', async (reason) => {
      console.log('WhatsApp disconnected:', sessionId, reason)
      
      this.clients.delete(sessionId)
      
      // Update status in database
      if (supabase) {
        await supabase
          .from('whatsapp_sessions')
          .update({ status: 'disconnected' })
          .eq('id', sessionId)
      }
      
      const io = global.io
      if (io) {
        io.emit('disconnected', { sessionId, reason })
      }

      // Auto-reconnect after 5 seconds (unless manually disconnected)
      // Check if session still exists in database (not manually deleted)
      if (supabase && reason !== 'MANUAL_DISCONNECT') {
        console.log('Scheduling auto-reconnect for session:', sessionId)
        setTimeout(async () => {
          try {
            const { data: session } = await supabase
              .from('whatsapp_sessions')
              .select('id, status')
              .eq('id', sessionId)
              .single()

            // Only reconnect if session still exists and not manually disconnected
            if (session && session.status !== 'disconnected') {
              console.log('Auto-reconnecting session:', sessionId)
              await this.initializeClient(sessionId)
            } else {
              console.log('Session was manually disconnected, skipping auto-reconnect')
            }
          } catch (error) {
            console.error('Auto-reconnect error:', error)
          }
        }, 5000) // Wait 5 seconds before reconnecting
      }
    })

    // Message event
    client.on('message', async (message) => {
      console.log('📨 Message received!')
      console.log('  - From:', message.from)
      console.log('  - Body:', message.body)
      console.log('  - Timestamp:', message.timestamp)
      console.log('  - Session:', sessionId)
      
      try {
        // Get contact info to extract pushname
        const contact = await message.getContact()
        const pushname = contact.pushname || contact.name || null
        
        console.log('  - Contact pushname:', pushname)
        
        // Save to database with pushname
        await this.saveIncomingMessage(sessionId, message, pushname)
        console.log('  ✓ Message saved to database')
      } catch (error) {
        console.error('  ❌ Error saving message:', error)
      }
      
      const io = global.io
      if (io) {
        const eventData = {
          sessionId,
          from: message.from,
          body: message.body,
          timestamp: message.timestamp
        }
        io.emit('message', eventData)
        console.log('  ✓ Emitted Socket.IO event:', eventData)
      } else {
        console.log('  ⚠️ Socket.IO not available')
      }
    })

    // Message acknowledgement event (for status updates)
    client.on('message_ack', async (message, ack) => {
      console.log('📨 Message ACK received!')
      console.log('  - Message ID:', message.id._serialized)
      console.log('  - ACK Status:', ack)
      console.log('  - ACK Name:', ['ERROR', 'PENDING', 'SERVER_ACK', 'DELIVERY_ACK', 'READ', 'PLAYED'][ack] || 'UNKNOWN')
      console.log('  - Session:', sessionId)
      console.log('  - From:', message.from)
      console.log('  - To:', message.to)
      console.log('  - Body:', message.body?.substring(0, 50))
      
      // ack values:
      // 0 = ERROR
      // 1 = PENDING
      // 2 = SERVER_ACK (sent)
      // 3 = DELIVERY_ACK (delivered)
      // 4 = READ (read)
      // 5 = PLAYED (for voice messages)
      
      let status = 'sent'
      if (ack === 2) status = 'sent'
      if (ack === 3) status = 'delivered'
      if (ack === 4) status = 'read'
      if (ack === 0) status = 'failed'
      
      console.log('  - Mapped status:', status)
      
      try {
        // Update message status in database
        if (supabase) {
          // First, let's check what messages exist in the database
          const { data: allMessages } = await supabase
            .from('messages')
            .select('id, whatsapp_message_id, status, content')
            .eq('is_from_me', true)
            .order('created_at', { ascending: false })
            .limit(10)
          
          console.log('  - Recent messages in DB:')
          allMessages?.forEach(m => {
            console.log(`    * ${m.whatsapp_message_id} -> ${m.status} (${m.content?.substring(0, 30)})`)
          })
          
          console.log('  - Searching for message with ID:', message.id._serialized)
          
          const { data, error } = await supabase
            .from('messages')
            .update({ status })
            .eq('whatsapp_message_id', message.id._serialized)
            .select()
          
          if (error) {
            console.error('  ❌ Error updating message status:', error)
          } else if (data && data.length > 0) {
            console.log('  ✅ SUCCESS! Message status updated to:', status)
            console.log('  ✅ Updated', data.length, 'message(s)')
            console.log('  ✅ Updated message:', {
              id: data[0].id,
              content: data[0].content?.substring(0, 30),
              old_status: allMessages?.find(m => m.id === data[0].id)?.status,
              new_status: status
            })
          } else {
            console.log('  ⚠️ WARNING: No message found with whatsapp_message_id:', message.id._serialized)
            console.log('  ⚠️ Possible reasons:')
            console.log('     1. Message ID format mismatch')
            console.log('     2. Message not yet saved to database')
            console.log('     3. Message is from customer (no whatsapp_message_id)')
            console.log('     4. This is an incoming message, not outgoing')
          }
        } else {
          console.log('  ⚠️ Supabase not configured')
        }
      } catch (error) {
        console.error('  ❌ Error updating message status:', error)
      }
      
      const io = global.io
      if (io) {
        io.emit('message_status', {
          sessionId,
          messageId: message.id._serialized,
          status
        })
        console.log('  ✓ Emitted message_status event via Socket.IO')
      }
    })

    // Initialize
    await client.initialize()

    console.log('✓ WhatsApp client initialized for session:', sessionId)
    console.log('✓ Event listeners registered: qr, ready, disconnected, message, message_ack')

    this.initializingClients.delete(sessionId)
    return client
  } catch (error) {
    console.error('Failed to initialize client:', error)
    this.initializingClients.delete(sessionId)
    this.clients.delete(sessionId)
    throw error
  }
}

  async sendMessage(sessionId, to, message) {
    let client = this.clients.get(sessionId)
    
    if (!client) {
      console.error('Session not found:', sessionId)
      
      // Try to initialize if not found
      console.log('Attempting to initialize session:', sessionId)
      try {
        client = await this.initializeClient(sessionId)
      } catch (error) {
        throw new Error('Session not found and failed to initialize: ' + error.message)
      }
    }

    try {
      // Validate and format phone number
      let phoneNumber = to.replace('@c.us', '')
      
      // Remove any non-digit characters
      phoneNumber = phoneNumber.replace(/\D/g, '')
      
      // Validate phone number length (Indonesian: 10-13 digits after country code)
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        throw new Error(`Invalid phone number format: ${phoneNumber}. Expected 10-15 digits, got ${phoneNumber.length}`)
      }
      
      console.log('Formatted phone number:', phoneNumber)
      
      const chatId = `${phoneNumber}@c.us`
      
      // Check if client is ready
      let state
      try {
        state = await client.getState()
        console.log('Client state:', state)
      } catch (stateError) {
        console.error('Failed to get client state:', stateError.message)
        throw new Error('Client state check failed. Session may be disconnected.')
      }
      
      if (state !== 'CONNECTED') {
        console.error('Client not connected. State:', state)
        
        // Try to reinitialize
        console.log('Reinitializing client due to disconnected state...')
        this.clients.delete(sessionId)
        client = await this.initializeClient(sessionId)
        
        throw new Error(`WhatsApp client reconnecting. Please wait 10 seconds and try again.`)
      }
      
      const result = await client.sendMessage(chatId, message)
      
      return { 
        success: true,
        messageId: result.id._serialized
      }
    } catch (error) {
      console.error('Error sending message:', error.message)
      
      // Handle "No LID for user" error
      if (error.message.includes('No LID for user')) {
        console.error('❌ LID Error: Session not fully initialized')
        console.error('   This usually means:')
        console.error('   1. Session just connected - wait 15-30 seconds')
        console.error('   2. Contact list not loaded yet')
        console.error('   3. Session needs to be restarted')
        console.error('')
        console.error('   Quick fix: Restart WhatsApp service and wait 30 seconds after QR scan')
        
        throw new Error('Session belum siap. Tunggu 30 detik setelah scan QR code, atau restart WhatsApp service.')
      }
      
      // If detached frame or evaluation error, reinitialize
      if (error.message.includes('detached Frame') || 
          error.message.includes('evaluate') ||
          error.message.includes('Execution context')) {
        console.log('Frame/context error detected, reinitializing client...')
        this.clients.delete(sessionId)
        
        // Try to reinitialize in background
        this.initializeClient(sessionId).catch(err => {
          console.error('Background reinitialization failed:', err.message)
        })
        
        throw new Error('WhatsApp session disconnected. Reconnecting... Please try again in 10 seconds.')
      }
      
      throw error
    }
  }

  async disconnectSession(sessionId) {
    const client = this.clients.get(sessionId)
    
    if (client) {
      // Mark as manual disconnect to prevent auto-reconnect
      if (supabase) {
        await supabase
          .from('whatsapp_sessions')
          .update({ status: 'disconnected' })
          .eq('id', sessionId)
      }
      
      await client.destroy()
      this.clients.delete(sessionId)
    }
    
    return { success: true }
  }

  getSessionStatus(sessionId) {
    const client = this.clients.get(sessionId)
    
    if (!client) {
      return 'disconnected'
    }
    
    return 'connected'
  }

  getAllSessions() {
    return Array.from(this.clients.keys())
  }

  async getMessageInfo(sessionId, messageId) {
    const client = this.clients.get(sessionId)
    
    if (!client) {
      throw new Error('Session not found: ' + sessionId)
    }

    try {
      // Get message by ID
      const message = await client.getMessageById(messageId)
      
      if (!message) {
        return {
          found: false,
          messageId
        }
      }

      // Get ACK status
      let status = 'sent'
      if (message.ack === 3) status = 'delivered'
      if (message.ack === 4) status = 'read'
      if (message.ack === 0) status = 'failed'

      return {
        found: true,
        messageId: message.id._serialized,
        ack: message.ack,
        status,
        timestamp: message.timestamp,
        from: message.from,
        to: message.to,
        body: message.body
      }
    } catch (error) {
      console.error('Error getting message info:', error)
      throw error
    }
  }

  async saveIncomingMessage(sessionId, message, pushname = null) {
    if (!supabase) {
      console.log('Supabase not configured, skipping message save')
      return
    }

    try {
      // Get user_id from whatsapp_sessions
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single()

      if (!session) {
        console.error('Session not found:', sessionId)
        return
      }

      const userId = session.user_id

      // Extract phone number from message.from (format: 6285155046155@c.us)
      const rawFrom = message.from
      console.log('  📱 Raw message.from:', rawFrom)
      
      const phoneNumber = rawFrom.split('@')[0]
      console.log('  📱 Extracted phone number:', phoneNumber)
      
      // Validate phone number length
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        console.error('  ❌ Invalid phone number length:', phoneNumber.length)
        console.error('  ❌ Phone number:', phoneNumber)
        return
      }
      
      // Format with + prefix
      const formattedPhone = phoneNumber.startsWith('62') ? `+${phoneNumber}` : `+62${phoneNumber}`
      
      console.log('  📞 Processing contact:', {
        raw: rawFrom,
        extracted: phoneNumber,
        formatted: formattedPhone,
        length: formattedPhone.length,
        pushname: pushname
      })

      // 1. Find or create contact WITH pushname
      let { data: contact } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('phone_number', formattedPhone)
        .eq('user_id', userId)
        .single()

      if (!contact) {
        // Create new contact WITH name from WhatsApp pushname
        console.log('  ➕ Creating new contact with pushname:', pushname)
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            phone_number: formattedPhone,
            name: pushname  // Auto-save name from WhatsApp
          })
          .select()
          .single()

        if (contactError) {
          console.error('Error creating contact:', contactError)
          throw contactError
        }
        contact = newContact
        console.log('  ✅ Contact created with name:', pushname)
      } else {
        // Update existing contact if name is empty and pushname is available
        if (pushname && (!contact.name || contact.name.trim() === '')) {
          console.log('  📝 Updating contact name from pushname:', pushname)
          const { error: updateError } = await supabase
            .from('contacts')
            .update({ name: pushname })
            .eq('id', contact.id)
          
          if (updateError) {
            console.error('  ❌ Error updating contact name:', updateError)
          } else {
            console.log('  ✅ Contact name updated to:', pushname)
            contact.name = pushname
          }
        } else if (contact.name) {
          console.log('  ℹ️ Contact already has name:', contact.name)
        }
      }

      // 2. Find or create conversation
      // Only look for open conversations to avoid duplicates
      let { data: conversations } = await supabase
        .from('conversations')
        .select('id, status, workflow_status')
        .eq('whatsapp_session_id', sessionId)
        .eq('contact_id', contact.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)

      let conversation = conversations && conversations.length > 0 ? conversations[0] : null

      if (!conversation) {
        // Create new conversation with unread_count = 1
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            whatsapp_session_id: sessionId,
            contact_id: contact.id,
            status: 'open',
            read_status: 'unread',
            unread_count: 1,
            last_message: message.body,
            last_message_at: new Date(message.timestamp * 1000).toISOString()
          })
          .select()
          .single()

        if (convError) {
          console.error('Error creating conversation:', convError)
          throw convError
        }
        conversation = newConv
      } else {
        // Get current unread_count and status
        const { data: currentConv } = await supabase
          .from('conversations')
          .select('unread_count, read_status, status, workflow_status')
          .eq('id', conversation.id)
          .single()
        
        const currentCount = currentConv?.unread_count || 0
        const currentReadStatus = currentConv?.read_status || 'unread'
        const isClosed = currentConv?.status === 'closed' || currentConv?.workflow_status === 'done'
        
        console.log('  📊 Current conversation state:', {
          id: conversation.id,
          currentCount,
          currentReadStatus,
          isClosed
        })
        
        // ALWAYS increment unread_count for incoming messages (don't check read_status)
        // Agent will mark as read when they view the conversation
        const newCount = currentCount + 1
        const newReadStatus = 'unread'
        
        console.log('  ➕ Incrementing unread_count:', {
          from: currentCount,
          to: newCount
        })
        
        // Prepare update data
        const updateData = {
          last_message: message.body,
          last_message_at: new Date(message.timestamp * 1000).toISOString(),
          read_status: newReadStatus,
          unread_count: newCount
        }
        
        // If conversation was closed, reopen it and reset workflow
        if (isClosed) {
          console.log('  ⚠️ Conversation was closed, reopening...')
          updateData.status = 'open'
          updateData.workflow_status = 'incoming'
          updateData.closed_at = null
          updateData.closed_by = null
          updateData.workflow_completed_at = null
          updateData.assigned_to = null // Unassign so it goes back to pool
        }
        
        // Update conversation
        const { error: updateError } = await supabase
          .from('conversations')
          .update(updateData)
          .eq('id', conversation.id)
          
        if (updateError) {
          console.error('  ❌ Error updating conversation:', updateError)
        } else {
          console.log('  ✅ Conversation updated successfully')
        }
        
        if (isClosed) {
          console.log('  ✓ Conversation reopened and reset to incoming')
        }
      }

      // 3. Save message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'customer',
          content: message.body,
          is_from_me: false,
          status: 'delivered',
          created_at: new Date(message.timestamp * 1000).toISOString()
        })

      if (msgError) {
        console.error('Error saving message:', msgError)
        throw msgError
      }

      console.log('✓ Message saved to database')
      console.log('✓ Contact name:', contact.name || 'Not set')
    } catch (error) {
      console.error('Error saving message to database:', error)
      // Don't throw - just log, so service doesn't crash
    }
  }
}

export default new WhatsAppService()
