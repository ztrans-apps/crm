import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMediaViaBaileys } from '@/lib/whatsapp/direct-send'
import { normalizeWhatsAppRecipient } from '@/lib/whatsapp/phone'
import { resolveQuotedContextForBaileys } from '@/lib/whatsapp/quote-context'

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
    const quotedMessageId = formData.get('quotedMessageId') as string | null

    if (!sessionId || !to || !media || !conversationId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'

    const messageData: Record<string, unknown> = {
      conversation_id: conversationId,
      sender_type: 'agent',
      sender_id: userId,
      content: caption || null,
      is_from_me: true,
      status: 'sent',
      message_type: mediaType,
      media_url: mediaUrl,
      media_type: mediaType,
      media_filename: mediaFilename,
      media_size: parseInt(mediaSize, 10),
      media_mime_type: mimetype,
      tenant_id: defaultTenantId,
      created_at: new Date().toISOString(),
    }

    if (quotedMessageId) {
      messageData.quoted_message_id = quotedMessageId
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

    const buffer = Buffer.from(await media.arrayBuffer())
    const recipient = normalizeWhatsAppRecipient(to)
    const recipientJid = recipient.jid
    const quotedContext = quotedMessageId
      ? await resolveQuotedContextForBaileys(supabase, quotedMessageId, recipientJid)
      : null

    const sendResult = await sendMediaViaBaileys({
      sessionId,
      to: recipientJid,
      buffer,
      mimetype,
      caption: caption || '',
      filename: mediaFilename,
      tenantId: defaultTenantId,
      quotedContext,
    })

    if (!sendResult.success) {
      await supabase
        .from('messages')
        .update({ status: 'failed', metadata: { error: sendResult.error } })
        .eq('id', savedMessage.id)
      throw new Error(sendResult.error || 'Failed to send media')
    }

    await supabase
      .from('messages')
      .update({
        status: 'sent',
        whatsapp_message_id: sendResult.messageId || null,
        metadata: {
          sentVia: 'baileys-direct',
          baileys: sendResult.raw,
          raw_message: {
            key: {
              id: sendResult.messageId,
              fromMe: true,
              remoteJid: recipientJid,
            },
            message: caption ? { conversation: caption } : {},
            messageTimestamp: Math.floor(Date.now() / 1000),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', savedMessage.id)

    const updateData: Record<string, unknown> = {
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

    await supabase.from('conversations').update(updateData).eq('id', conversationId)

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
    })
  } catch (error: any) {
    console.error('Error sending media:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send media' },
      { status: 500 }
    )
  }
}
