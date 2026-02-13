import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const sessionId = formData.get('sessionId') as string
    const to = formData.get('to') as string
    const caption = formData.get('caption') as string
    const media = formData.get('media') as Blob
    const mimetype = formData.get('mimetype') as string
    const conversationId = formData.get('conversationId') as string
    const userId = formData.get('userId') as string
    const mediaUrl = formData.get('mediaUrl') as string
    const mediaType = formData.get('mediaType') as string
    const mediaFilename = formData.get('mediaFilename') as string
    const mediaSize = formData.get('mediaSize') as string

    if (!sessionId || !to || !media || !conversationId || !userId) {
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

    // Prepare message data
    const messageData = {
      conversation_id: conversationId,
      sender_type: 'agent' as const,
      sender_id: userId,
      content: caption || null,
      is_from_me: true,
      status: 'sent' as const, // Changed from 'sending' to 'sent'
      message_type: mediaType as 'text' | 'image' | 'video' | 'audio' | 'document' | 'location',
      media_url: mediaUrl,
      media_type: mediaType as 'image' | 'video' | 'audio' | 'document' | 'location' | 'vcard' | null,
      media_filename: mediaFilename,
      media_size: parseInt(mediaSize),
      media_mime_type: mimetype,
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

    // Convert blob to buffer
    const buffer = Buffer.from(await media.arrayBuffer())

    // Call WhatsApp service
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
    
    // Create form data for WhatsApp service
    const serviceFormData = new FormData()
    serviceFormData.append('sessionId', sessionId)
    serviceFormData.append('to', to)
    serviceFormData.append('caption', caption || '')
    serviceFormData.append('media', new Blob([buffer], { type: mimetype }))
    serviceFormData.append('mimetype', mimetype)
    
    const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send-media`, {
      method: 'POST',
      body: serviceFormData,
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

    // Update conversation last_message and first_response_at
    const updateData: any = {
      last_message: caption || '[Media]',
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

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    })
  } catch (error: any) {
    console.error('Error sending media:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send media' },
      { status: 500 }
    )
  }
}
