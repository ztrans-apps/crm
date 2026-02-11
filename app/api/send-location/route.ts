import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, to, latitude, longitude, address, name, conversationId, userId } = body

    if (!sessionId || !to || !latitude || !longitude || !conversationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Store coordinates in content field (format: "lat,lng")
    const locationContent = `${latitude},${longitude}`
    
    // Store Google Maps URL in media_url
    const mediaUrl = `https://www.google.com/maps?q=${latitude},${longitude}`

    // Prepare message data
    const messageData = {
      conversation_id: conversationId,
      sender_type: 'agent' as const,
      sender_id: userId,
      content: locationContent,
      is_from_me: true,
      status: 'sent' as const,
      message_type: 'location' as const,
      media_url: mediaUrl,
      media_type: 'location' as const,
      media_filename: address || name || null,
      created_at: new Date().toISOString(),
    }

    // Save message to database first
    const { data: savedMessage, error: dbError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save message to database: ' + dbError.message },
        { status: 500 }
      )
    }

    // Call WhatsApp service
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
    
    const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        to,
        latitude,
        longitude,
        address,
        name
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('WhatsApp service error:', errorText)
      
      // Update message status to failed
      await supabase
        .from('messages')
        .update({ status: 'failed' })
        .eq('id', savedMessage.id)
      
      throw new Error(`WhatsApp service error: ${response.status} ${errorText}`)
    }

    const result = await response.json()

    // Update message status to sent
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
        last_message: `📍 ${name || address || 'Location'}`,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    })
  } catch (error: any) {
    console.error('Error sending location:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send location' },
      { status: 500 }
    )
  }
}
