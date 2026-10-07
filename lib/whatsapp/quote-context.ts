import type { SupabaseClient } from '@supabase/supabase-js'

export type QuotedContextPayload = {
  stanzaId: string
  participant?: string
  quotedMessage: Record<string, unknown>
}

/**
 * Resolve CRM quoted_message_id (UUID or WA id) into Baileys contextInfo payload.
 */
export async function resolveQuotedContextForBaileys(
  supabase: SupabaseClient,
  quotedMessageId: string,
  recipientJid: string
): Promise<QuotedContextPayload | null> {
  let quotedMsg: {
    metadata?: { raw_message?: { key?: { id?: string; fromMe?: boolean; remoteJid?: string }; message?: Record<string, unknown> } }
    content?: string | null
    is_from_me?: boolean
    whatsapp_message_id?: string | null
  } | null = null

  const { data: byWa } = await supabase
    .from('messages')
    .select('metadata, content, is_from_me, whatsapp_message_id')
    .eq('whatsapp_message_id', quotedMessageId)
    .maybeSingle()
  if (byWa) quotedMsg = byWa

  if (!quotedMsg && quotedMessageId.includes('-')) {
    const { data: byId } = await supabase
      .from('messages')
      .select('metadata, content, is_from_me, whatsapp_message_id')
      .eq('id', quotedMessageId)
      .maybeSingle()
    if (byId) quotedMsg = byId
  }

  if (!quotedMsg) return null

  const raw = quotedMsg.metadata?.raw_message
  if (raw?.key?.id && raw.message) {
    return {
      stanzaId: raw.key.id,
      participant: raw.key.fromMe ? undefined : raw.key.remoteJid,
      quotedMessage: raw.message,
    }
  }

  const stanzaId = quotedMsg.whatsapp_message_id
  if (stanzaId && !stanzaId.includes('-')) {
    return {
      stanzaId,
      participant: quotedMsg.is_from_me ? undefined : recipientJid,
      quotedMessage: { conversation: quotedMsg.content || '' },
    }
  }

  return null
}
