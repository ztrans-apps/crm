import type { SupabaseClient } from '@supabase/supabase-js'

export type QuotedContextPayload = {
  stanzaId: string
  fromMe?: boolean
  /** Chat JID of the original message (usually the 1:1 peer) */
  remoteJid?: string
  participant?: string
  quotedMessage: Record<string, unknown>
}

function normalizeQuotedMessageContent(
  message: Record<string, unknown> | null | undefined,
  fallbackText?: string | null
): Record<string, unknown> | null {
  if (!message || typeof message !== 'object') {
    return fallbackText != null ? { conversation: String(fallbackText) } : null
  }

  // Prefer a single concrete content type (Baileys strips nested wrappers when quoting)
  if (message.conversation || message.extendedTextMessage || message.imageMessage ||
      message.videoMessage || message.audioMessage || message.documentMessage ||
      message.locationMessage || message.stickerMessage) {
    return message
  }

  // Some rows store WAMessage envelope { key, message }
  const nested = (message as { message?: Record<string, unknown> }).message
  if (nested && typeof nested === 'object') {
    return normalizeQuotedMessageContent(nested, fallbackText)
  }

  return fallbackText != null ? { conversation: String(fallbackText) } : null
}

/**
 * Resolve CRM quoted_message_id (UUID or WA id) into Baileys `options.quoted` payload.
 */
export async function resolveQuotedContextForBaileys(
  supabase: SupabaseClient,
  quotedMessageId: string,
  recipientJid: string
): Promise<QuotedContextPayload | null> {
  let quotedMsg: {
    metadata?: {
      raw_message?: {
        key?: { id?: string; fromMe?: boolean; remoteJid?: string; participant?: string }
        message?: Record<string, unknown>
      }
    }
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
  if (raw?.key?.id) {
    const quotedMessage = normalizeQuotedMessageContent(raw.message, quotedMsg.content)
    if (quotedMessage) {
      const fromMe = !!raw.key.fromMe || !!quotedMsg.is_from_me
      return {
        stanzaId: raw.key.id,
        fromMe,
        remoteJid: raw.key.remoteJid || recipientJid,
        participant: fromMe ? undefined : raw.key.participant || raw.key.remoteJid || recipientJid,
        quotedMessage,
      }
    }
  }

  const stanzaId = quotedMsg.whatsapp_message_id
  // Real WA stanza ids are long alphanumeric (e.g. 3EB0…); reject UUIDs / probe ids
  const looksLikeWaId =
    !!stanzaId &&
    !stanzaId.includes('-') &&
    /^[A-Za-z0-9]{16,}$/.test(stanzaId)

  if (looksLikeWaId) {
    const fromMe = !!quotedMsg.is_from_me
    const text = quotedMsg.content || ''
    return {
      stanzaId,
      fromMe,
      remoteJid: recipientJid,
      participant: fromMe ? undefined : recipientJid,
      // Baileys text sends as extendedTextMessage; match that for quote previews
      quotedMessage: { extendedTextMessage: { text } },
    }
  }

  return null
}
