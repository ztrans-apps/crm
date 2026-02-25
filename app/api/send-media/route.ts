import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMetaCloudAPI } from '@/lib/whatsapp/meta-api'

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

    if (!to || !conversationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: to, conversationId, userId' },
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

    // Get default tenant ID
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'

    // Prepare message data
    const messageData = {
      conversation_id: conversationId,
      sender_type: 'agent' as const,
      sender_id: userId,
      content: caption || null,
      is_from_me: true,
      status: 'sent' as const,
      message_type: mediaType as 'text' | 'image' | 'video' | 'audio' | 'document' | 'location',
      media_url: mediaUrl,
      media_type: mediaType as 'image' | 'video' | 'audio' | 'document' | 'location' | 'vcard' | null,
      media_filename: mediaFilename,
      media_size: parseInt(mediaSize),
      media_mime_type: mimetype,
      tenant_id: defaultTenantId,
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

    try {
      // Send media via Meta Cloud API (Official WhatsApp Business API)
      const metaApi = getMetaCloudAPI()

      if (!metaApi.isConfigured()) {
        throw new Error('WhatsApp Cloud API not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.')
      }

      let result

      // Determine media type for Meta API
      const waMediaType = (mediaType || 'image') as 'image' | 'video' | 'audio' | 'document'

      if (media) {
        // Upload media to Meta first, then send by media ID
        const buffer = Buffer.from(await media.arrayBuffer())
        const uploadedMediaId = await metaApi.uploadMedia(buffer, mimetype, mediaFilename)
        
        result = await metaApi.sendMedia(to, {
          type: waMediaType,
          id: uploadedMediaId,
          caption: caption || undefined,
          filename: mediaFilename || undefined,
        })
      } else if (mediaUrl) {
        // Send by URL directly
        result = await metaApi.sendMedia(to, {
          type: waMediaType,
          url: mediaUrl,
          caption: caption || undefined,
          filename: mediaFilename || undefined,
        })
      } else {
        throw new Error('Either media file or mediaUrl is required')
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to send media via WhatsApp Cloud API')
      }

      // Update message status to sent
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
        last_message: caption || '[Media]',
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
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

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Media sent via WhatsApp Cloud API'
      })
    } catch (sendError: any) {
      console.error('WhatsApp Cloud API error:', sendError)
      
      await supabase
        .from('messages')
        .update({ status: 'failed', metadata: { error: sendError.message } })
        .eq('id', savedMessage.id)
      
      throw sendError
    }
  } catch (error: any) {
    console.error('Error sending media:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send media' },
      { status: 500 }
    )
  }
}
