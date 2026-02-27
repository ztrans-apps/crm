import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { getMetaCloudAPIForSession } from '@/lib/whatsapp/meta-api'

export const POST = withAuth(async (request, ctx) => {
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

    const supabase = ctx.serviceClient

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
      tenant_id: ctx.tenantId,
      created_at: new Date().toISOString(),
    }

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
      const metaApi = await getMetaCloudAPIForSession(sessionId, supabase)

      if (!metaApi.isConfigured()) {
        throw new Error('WhatsApp Cloud API not configured.')
      }

      let result
      const waMediaType = (mediaType || 'image') as 'image' | 'video' | 'audio' | 'document'

      if (media) {
        const buffer = Buffer.from(await media.arrayBuffer())
        const uploadedMediaId = await metaApi.uploadMedia(buffer, mimetype, mediaFilename)
        
        result = await metaApi.sendMedia(to, {
          type: waMediaType,
          id: uploadedMediaId,
          caption: caption || undefined,
          filename: mediaFilename || undefined,
        })
      } else if (mediaUrl) {
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

      await supabase
        .from('messages')
        .update({
          status: 'sent',
          whatsapp_message_id: result.messageId,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', savedMessage.id)

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
}, { permission: 'chat.reply' })
