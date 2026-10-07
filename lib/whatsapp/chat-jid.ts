import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeWhatsAppRecipient } from '@/lib/whatsapp/phone'

export type ResolvedChatJid = {
  /** JID used for sock.sendMessage — prefer phone PN for delivery */
  jid: string
  /** Peer @lid when known (for quote contextInfo.remoteJid) */
  chatLid: string | null
  source: string
}

/**
 * Resolve where to send, and the LID chat identity for quotes.
 *
 * Inbound often uses `145…@lid` with `senderPn: 628…@s.whatsapp.net`.
 * Sending to the LID-as-@s.whatsapp.net is wrong and messages never arrive.
 * Prefer senderPn / phone for delivery; keep @lid for quote metadata.
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

  if (senderPn) {
    return { jid: senderPn, chatLid, source: 'message_sender_pn' }
  }
  if (outboundPn) {
    return { jid: outboundPn, chatLid, source: 'message_outbound_pn' }
  }
  if (!fallback.isLid && fallback.jid.endsWith('@s.whatsapp.net')) {
    return { jid: fallback.jid, chatLid, source: 'fallback_phone' }
  }
  if (chatLid) {
    // No phone mapping — must address LID directly
    return { jid: chatLid, chatLid, source: 'message_raw_lid_only' }
  }

  return { jid: fallback.jid, chatLid, source: 'fallback' }
}
