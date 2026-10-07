import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getInboundPreview } from '@/lib/whatsapp/inbound-parse'

const FALLBACK_TENANT_ID = '00000000-0000-0000-0000-000000000001'

type BridgeMedia = {
  base64?: string
  mimetype?: string
  filename?: string | null
  size?: number
  messageType?: string
}

/**
 * Receives inbound WhatsApp messages from the VPS Baileys service.
 */
export async function POST(request: NextRequest) {
  try {
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET
    if (bridgeSecret) {
      const provided = request.headers.get('x-bridge-secret')
      if (provided !== bridgeSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const body = await request.json()
    const {
      sessionId,
      tenantId,
      phoneNumber,
      pushName,
      messageText,
      messageType,
      lastMessagePreview,
      quotedWhatsappId,
      messageId,
      messageTimestamp,
      fromLid,
      rawMessage,
      media,
    } = body || {}

    if (!sessionId || !phoneNumber || !messageId) {
      return NextResponse.json(
        { error: 'Missing sessionId, phoneNumber, or messageId' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('id, user_id, tenant_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const resolvedTenant =
      tenantId || session.tenant_id || process.env.DEFAULT_TENANT_ID || FALLBACK_TENANT_ID
    const userId = session.user_id

    const { normalizeWhatsAppRecipient } = await import('@/lib/whatsapp/phone')
    const recipient = normalizeWhatsAppRecipient(
      fromLid ? `lid:${String(phoneNumber).replace(/^lid:/i, '')}` : String(phoneNumber)
    )
    let formattedPhone = recipient.displayPhone

    let contact: { id: string; name: string | null } | null = null

    if (!recipient.isLid) {
      const lidMistaken = `lid:${recipient.user}`
      const { data: mistaken } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('phone_number', lidMistaken)
        .eq('user_id', userId)
        .maybeSingle()

      if (mistaken) {
        await supabase
          .from('contacts')
          .update({ phone_number: formattedPhone, name: pushName || mistaken.name })
          .eq('id', mistaken.id)
        contact = { id: mistaken.id, name: pushName || mistaken.name }
      }
    }

    if (!contact) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('phone_number', formattedPhone)
        .eq('user_id', userId)
        .maybeSingle()
      contact = existing
    }

    if (!contact) {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          phone_number: formattedPhone,
          name: pushName || null,
          tenant_id: resolvedTenant,
        })
        .select('id, name')
        .single()

      if (contactError || !newContact) {
        console.error('[baileys-incoming] contact create failed', contactError)
        return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
      }
      contact = newContact
    } else if (pushName && contact.name !== pushName) {
      await supabase.from('contacts').update({ name: pushName }).eq('id', contact.id)
    }

    let { data: conversations } = await supabase
      .from('conversations')
      .select('id, status, workflow_status, whatsapp_session_id, unread_count')
      .eq('contact_id', contact.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)

    let conversation = conversations?.[0]
    const lastAt = messageTimestamp
      ? new Date(Number(messageTimestamp) * 1000).toISOString()
      : new Date().toISOString()

    const resolvedType = (messageType as string) || 'text'
    const preview =
      lastMessagePreview ||
      getInboundPreview(messageText, resolvedType)

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          whatsapp_session_id: sessionId,
          contact_id: contact.id,
          tenant_id: resolvedTenant,
          status: 'open',
          workflow_status: 'incoming',
          read_status: 'unread',
          unread_count: 1,
          last_message: preview,
          last_message_at: lastAt,
        })
        .select('id')
        .single()

      if (convError || !newConv) {
        console.error('[baileys-incoming] conversation create failed', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      conversation = newConv
    } else {
      if (conversation.whatsapp_session_id !== sessionId) {
        await supabase
          .from('conversations')
          .update({ whatsapp_session_id: sessionId })
          .eq('id', conversation.id)
      }

      await supabase
        .from('conversations')
        .update({
          last_message: preview,
          last_message_at: lastAt,
          read_status: 'unread',
          unread_count: (conversation.unread_count || 0) + 1,
          status: 'open',
          workflow_status: 'incoming',
        })
        .eq('id', conversation.id)
    }

    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('whatsapp_message_id', messageId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        conversationId: conversation.id,
        duplicate: true,
      })
    }

    let quotedMessageId: string | null = null
    if (quotedWhatsappId) {
      const { data: quoted } = await supabase
        .from('messages')
        .select('id')
        .eq('whatsapp_message_id', quotedWhatsappId)
        .maybeSingle()
      quotedMessageId = quoted?.id || quotedWhatsappId
    }

    const bridgeMedia = media as BridgeMedia | null
    let mediaUrl: string | null = null
    let mediaFilename: string | null = bridgeMedia?.filename || null
    let mediaSize: number | null = bridgeMedia?.size || null
    let mediaMimeType: string | null = bridgeMedia?.mimetype || null
    let dbMessageType = resolvedType === 'unknown' ? 'text' : resolvedType

    if (bridgeMedia?.base64 && bridgeMedia.mimetype) {
      const buffer = Buffer.from(bridgeMedia.base64, 'base64')
      const ext = bridgeMedia.mimetype.split('/')[1]?.split(';')[0] || 'bin'
      const generatedFilename =
        bridgeMedia.filename || `${dbMessageType}_${Date.now()}.${ext}`
      const filePath = `${userId}/${conversation.id}/${generatedFilename}`

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, buffer, {
          contentType: bridgeMedia.mimetype,
          upsert: false,
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(filePath)
        mediaUrl = urlData.publicUrl
        mediaFilename = generatedFilename
        mediaSize = buffer.length
        mediaMimeType = bridgeMedia.mimetype
        dbMessageType = bridgeMedia.messageType || dbMessageType
      } else {
        console.error('[baileys-incoming] media upload failed', uploadError)
      }
    }

    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      whatsapp_message_id: messageId,
      content: messageText || null,
      message_type: dbMessageType,
      status: 'delivered',
      sender_type: 'customer',
      is_from_me: false,
      tenant_id: resolvedTenant,
      quoted_message_id: quotedMessageId,
      media_url: mediaUrl,
      media_type: mediaUrl ? dbMessageType : null,
      media_filename: mediaFilename,
      media_size: mediaSize,
      media_mime_type: mediaMimeType,
      metadata: rawMessage
        ? {
            raw_message: rawMessage,
          }
        : null,
      created_at: lastAt,
    })

    if (msgError) {
      console.error('[baileys-incoming] message insert failed', msgError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      phone: formattedPhone,
    })
  } catch (error) {
    console.error('[baileys-incoming] error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
