import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, to, message, conversationId, userId } = body

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
      const { data, error: dbError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_id: userId,
          content: message,
          is_from_me: true,
          status: 'sent', // Changed from 'sending' to 'sent'
          message_type: 'text',
          created_at: new Date().toISOString(),
        })
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

      // Update conversation last_message
      await supabase
        .from('conversations')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
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
