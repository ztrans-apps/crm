import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMetaCloudAPIForSession } from '@/lib/whatsapp/meta-api'

export async function POST(request: NextRequest) {
  try {
    // Check if request has a body
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    // Parse JSON with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { sessionId, to, message, conversationId, userId, quotedMessageId } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      )
    }

    // Convert \n literal string to actual newline for WhatsApp
    const messageForWhatsApp = message.replace(/\\n/g, '\n')

    // Check if this is a bot message (userId is null or 'bot')
    const isBotMessage = !userId || userId === 'bot'

    // Create Supabase client with service role for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    )

    // Get default tenant ID or from request header
    const tenantIdFromHeader = request.headers.get('x-tenant-id')
    let defaultTenantId = tenantIdFromHeader || process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'

    // Verify tenant exists, if not use the first available tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', defaultTenantId)
      .single()

    if (tenantError || !tenant) {
      const { data: firstTenant } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .single()
      
      if (firstTenant) {
        defaultTenantId = firstTenant.id
      } else {
        return NextResponse.json(
          { error: 'No tenant found in database. Please create a tenant first.' },
          { status: 400 }
        )
      }
    }

    // Save message to database first (if conversationId and userId provided)
    let savedMessage = null
    if (conversationId && userId) {
      // Verify conversation exists and get its tenant_id
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, tenant_id')
        .eq('id', conversationId)
        .single()

      if (convError || !conversation) {
        console.error('[Send Message API] Conversation not found:', conversationId)
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      // Use the conversation's tenant_id instead of default
      const messageTenantId = conversation.tenant_id

      const messageData: any = {
        conversation_id: conversationId,
        sender_type: isBotMessage ? 'bot' : 'agent',
        sender_id: isBotMessage ? null : userId,
        content: message,
        is_from_me: true,
        status: 'sent', // Use 'sent' instead of 'pending' until constraint is fixed
        message_type: 'text',
        tenant_id: messageTenantId,
        created_at: new Date().toISOString(),
      }

      // Add quoted_message_id if provided
      if (quotedMessageId) {
        messageData.quoted_message_id = quotedMessageId
      }
      
      const { data, error: dbError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (dbError) {
        console.error('[Send Message API] Database error details:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
          messageData: messageData
        })
        return NextResponse.json(
          { 
            error: 'Failed to save message to database',
            details: dbError.message,
            hint: dbError.hint,
            code: dbError.code
          },
          { status: 500 }
        )
      }

      savedMessage = data
    }

    try {
      // Send message via Meta Cloud API (supports multi-number)
      const metaApi = await getMetaCloudAPIForSession(sessionId, supabase)

      if (!metaApi.isConfigured()) {
        throw new Error('WhatsApp Cloud API not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.')
      }

      const result = await metaApi.sendText(to, messageForWhatsApp)

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message via WhatsApp Cloud API')
      }

      // Update message with WhatsApp message ID
      if (savedMessage) {
        await supabase
          .from('messages')
          .update({
            status: 'sent',
            whatsapp_message_id: result.messageId,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedMessage.id)

        // Update conversation last_message and first_response_at
        const updateData: any = {
          last_message: message,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        
        // Check if this is the first agent response
        const { data: conv } = await supabase
          .from('conversations')
          .select('first_response_at, workflow_status')
          .eq('id', conversationId)
          .single()
        
        if (conv && !conv.first_response_at) {
          updateData.first_response_at = new Date().toISOString()
          
          if (conv.workflow_status === 'waiting' || conv.workflow_status === 'incoming') {
            updateData.workflow_status = 'in_progress'
            updateData.workflow_started_at = new Date().toISOString()
          }
        }
        
        await supabase
          .from('conversations')
          .update(updateData)
          .eq('id', conversationId)
      }

      return NextResponse.json({
        success: true,
        messageId: savedMessage?.id,
        whatsappMessageId: result.messageId,
        message: 'Message sent via WhatsApp Cloud API'
      })
    } catch (sendError: any) {
      console.error('WhatsApp Cloud API error:', sendError)
      
      // Update message status to failed if we saved it
      if (savedMessage) {
        await supabase
          .from('messages')
          .update({ status: 'failed', metadata: { error: sendError.message } })
          .eq('id', savedMessage.id)
      }
      
      throw sendError
    }
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
