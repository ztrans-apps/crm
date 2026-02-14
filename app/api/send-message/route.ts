import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { baileysAdapter } from '@/lib/queue/adapters/baileys-adapter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, to, message, conversationId, userId, quotedMessageId } = body

    if (!sessionId || !to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, to, message' },
        { status: 400 }
      )
    }

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

    console.log('[Send Message API] Supabase client created with service role')

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
      console.log('[Send Message API] Default tenant not found, fetching first available tenant')
      const { data: firstTenant } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .single()
      
      if (firstTenant) {
        defaultTenantId = firstTenant.id
        console.log('[Send Message API] Using tenant:', defaultTenantId)
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
        sender_type: 'agent',
        sender_id: userId,
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

      console.log('[Send Message API] Saving message to database:', {
        conversation_id: messageData.conversation_id,
        sender_type: messageData.sender_type,
        sender_id: messageData.sender_id,
        tenant_id: messageData.tenant_id,
        message_type: messageData.message_type,
        content_length: messageData.content?.length || 0
      })
      
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

      console.log('[Send Message API] Message saved successfully:', data.id)

      savedMessage = data
    }

    try {
      // Send message via queue (instead of direct call)
      console.log('[Send Message API] Queueing message via Baileys adapter')
      const { jobId } = await baileysAdapter.sendMessage(
        sessionId,
        to,
        message,
        quotedMessageId,
        defaultTenantId
      )

      console.log('[Send Message API] Message queued successfully, job ID:', jobId)

      // Update message status to queued
      if (savedMessage) {
        await supabase
          .from('messages')
          .update({
            status: 'sent', // Will be updated by worker when actually sent
            metadata: { queueJobId: jobId },
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
          // This is the first agent response - set first_response_at
          updateData.first_response_at = new Date().toISOString()
          
          // Auto-change workflow status from 'waiting' to 'in_progress'
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
        jobId,
        messageId: savedMessage?.id,
        message: 'Message queued for sending'
      })
    } catch (queueError: any) {
      console.error('Queue error:', queueError)
      
      // Update message status to failed if we saved it
      if (savedMessage) {
        await supabase
          .from('messages')
          .update({ status: 'failed', metadata: { error: queueError.message } })
          .eq('id', savedMessage.id)
      }
      
      throw queueError
    }
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
