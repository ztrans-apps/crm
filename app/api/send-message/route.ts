import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
        }
      }
    )

    // Save message to database first (if conversationId and userId provided)
    let savedMessage = null
    if (conversationId && userId) {
      const messageData: any = {
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: userId,
        content: message,
        is_from_me: true,
        status: 'sent',
        message_type: 'text',
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
        console.error('Database error:', dbError)
        return NextResponse.json(
          { error: 'Failed to save message to database' },
          { status: 500 }
        )
      }

      savedMessage = data
    }

    // Call WhatsApp service
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
    
    const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        to,
        message,
        quotedMessageId: quotedMessageId || undefined,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('WhatsApp service error:', errorText)
      
      // Update message status to failed if we saved it
      if (savedMessage) {
        await supabase
          .from('messages')
          .update({ status: 'failed' })
          .eq('id', savedMessage.id)
      }
      
      throw new Error(`WhatsApp service error: ${response.status} ${errorText}`)
    }

    const result = await response.json()

    // Update message status to sent if we saved it
    if (savedMessage) {
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          whatsapp_message_id: result.messageId,
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

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
