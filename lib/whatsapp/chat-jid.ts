import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeWhatsAppRecipient } from '@/lib/whatsapp/phone'

/**
 * WhatsApp 1:1 chats often address the peer as @lid while senderPn holds the phone.
 * Quotes only render when we send to the same chat JID the inbound messages used.
 */
export async function resolveWhatsAppChatJid(
  supabase: SupabaseClient,
  conversationId: string,
  fallbackTo: string
): Promise<{ jid: string; source: string }> {
  const fallback = normalizeWhatsAppRecipient(fallbackTo).jid

  const { data: rows } = await supabase
    .from('messages')
    .select('metadata, is_from_me, created_at')
    .eq('conversation_id', conversationId)
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40)

  for (const row of rows || []) {
    const key = row.metadata?.raw_message?.key
    const remoteJid = typeof key?.remoteJid === 'string' ? key.remoteJid : null
    if (remoteJid?.endsWith('@lid')) {
      return { jid: remoteJid, source: 'message_raw_lid' }
    }
  }

  // Prefer phone PN from senderPn on LID chats for display fallback only —
  // if we never saw @lid, use normalized phone / provided recipient.
  for (const row of rows || []) {
    const key = row.metadata?.raw_message?.key
    const senderPn = typeof key?.senderPn === 'string' ? key.senderPn : null
    if (senderPn?.endsWith('@s.whatsapp.net')) {
      return { jid: senderPn, source: 'message_sender_pn' }
    }
    const remoteJid = typeof key?.remoteJid === 'string' ? key.remoteJid : null
    if (remoteJid?.endsWith('@s.whatsapp.net')) {
      return { jid: remoteJid, source: 'message_raw_pn' }
    }
  }

  return { jid: fallback, source: 'fallback_phone' }
}
