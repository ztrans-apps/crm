import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeWhatsAppRecipient } from '@/lib/whatsapp/phone'

export type ResolvedChatJid = {
  /** JID used for sock.sendMessage */
  jid: string
  /** Peer @lid when known (for quote metadata) */
  chatLid: string | null
  source: string
}

/**
 * Resolve WhatsApp send target.
 *
 * LID chats must be addressed as `…@lid` for reply/quote bubbles to render.
 * Phone PN (`senderPn`) still delivers plain text but WhatsApp often drops quotes.
 * Prefer @lid when history has it; fall back to senderPn / phone.
 */
export async function resolveWhatsAppChatJid(
  supabase: SupabaseClient,
  conversationId: string,
  fallbackTo: string
): Promise<ResolvedChatJid> {
  const fallback = normalizeWhatsAppRecipient(fallbackTo)

  const { data: rows } = await supabase
    .from('messages')
    .select('metadata, is_from_me, created_at')
    .eq('conversation_id', conversationId)
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40)

  let chatLid: string | null = null
  let senderPn: string | null = null
  let outboundPn: string | null = null

  for (const row of rows || []) {
    const key = row.metadata?.raw_message?.key
    if (!key) continue

    const remoteJid = typeof key.remoteJid === 'string' ? key.remoteJid : null
    const pn = typeof key.senderPn === 'string' ? key.senderPn : null

    if (!chatLid && remoteJid?.endsWith('@lid')) {
      chatLid = remoteJid
    }
    if (!senderPn && pn?.endsWith('@s.whatsapp.net')) {
      senderPn = pn
    }
    if (
      !outboundPn &&
      remoteJid?.endsWith('@s.whatsapp.net') &&
      /^62\d{8,13}@/.test(remoteJid)
    ) {
      outboundPn = remoteJid
    }
  }

  // Prefer true @lid for send (quotes + delivery in LID-linked chats)
  if (chatLid) {
    return { jid: chatLid, chatLid, source: 'message_raw_lid' }
  }
  if (senderPn) {
    return { jid: senderPn, chatLid, source: 'message_sender_pn' }
  }
  if (outboundPn) {
    return { jid: outboundPn, chatLid, source: 'message_outbound_pn' }
  }
  if (!fallback.isLid && fallback.jid.endsWith('@s.whatsapp.net')) {
    return { jid: fallback.jid, chatLid, source: 'fallback_phone' }
  }

  return { jid: fallback.jid, chatLid, source: 'fallback' }
}
