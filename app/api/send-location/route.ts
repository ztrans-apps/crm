import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLocationViaBaileys } from '@/lib/whatsapp/direct-send'
import { normalizeWhatsAppRecipient } from '@/lib/whatsapp/phone'

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const locationContent = `${latitude},${longitude}`
    const mediaUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'

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
      tenant_id: defaultTenantId,
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

    const { resolveWhatsAppChatJid } = await import('@/lib/whatsapp/chat-jid')
    const chat = await resolveWhatsAppChatJid(supabase, conversationId, to)
    const sendResult = await sendLocationViaBaileys({
      sessionId,
      to: chat.jid,
      latitude,
      longitude,
      address,
      name,
      tenantId: defaultTenantId,
    })

    if (!sendResult.success) {
      await supabase
        .from('messages')
        .update({ status: 'failed', metadata: { error: sendResult.error } })
        .eq('id', savedMessage.id)
      throw new Error(sendResult.error || 'Failed to send location')
    }

    await supabase
      .from('messages')
      .update({
        status: 'sent',
        whatsapp_message_id: sendResult.messageId || null,
        metadata: {
          sentVia: 'baileys-direct',
          baileys: sendResult.raw,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', savedMessage.id)

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
      messageId: savedMessage.id,
      whatsappMessageId: sendResult.messageId,
      message: 'Location sent',
    })
  } catch (error: any) {
    console.error('Error sending location:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send location' },
      { status: 500 }
    )
  }
}
