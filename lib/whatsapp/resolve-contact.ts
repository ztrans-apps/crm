import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeWhatsAppRecipient } from '@/lib/whatsapp/phone'

type ContactRow = { id: string; name: string | null; phone_number: string }

/**
 * Build all phone_number aliases we may have stored for the same WhatsApp peer
 * (LID vs PN vs mistaken lid:62… forms).
 */
export function buildContactPhoneAliases(opts: {
  phoneNumber: string
  fromLid?: boolean
  chatLid?: string | null
  senderPn?: string | null
}): string[] {
  const aliases = new Set<string>()

  const add = (raw: string | null | undefined) => {
    if (!raw) return
    const n = normalizeWhatsAppRecipient(raw)
    aliases.add(n.displayPhone)
    aliases.add(n.jid)
    aliases.add(n.user)
    if (n.isLid) {
      aliases.add(`lid:${n.user}`)
      aliases.add(`${n.user}@lid`)
    } else {
      aliases.add(`+${n.user}`)
      aliases.add(n.user)
      // Historical mistaken form: lid:628…
      aliases.add(`lid:${n.user}`)
    }
  }

  add(opts.phoneNumber)
  if (opts.chatLid) add(opts.chatLid)
  if (opts.senderPn) add(opts.senderPn)

  // If fromLid but phoneNumber is actually a resolved PN, also add lid-only from chatLid
  if (opts.fromLid && opts.chatLid) {
    const lidUser = String(opts.chatLid).split('@')[0].replace(/\D/g, '')
    if (lidUser) {
      aliases.add(`lid:${lidUser}`)
      aliases.add(`${lidUser}@lid`)
      aliases.add(`+${lidUser}`)
    }
  }

  return [...aliases].filter(Boolean)
}

/**
 * fromMe device messages often have only @lid (no senderPn). Recover PN from
 * any earlier inbound message in CRM that used the same remoteJid.
 */
export async function lookupSenderPnForChatLid(
  supabase: SupabaseClient,
  chatLid: string
): Promise<string | null> {
  const lid = chatLid.endsWith('@lid') ? chatLid : `${chatLid.replace(/^lid:/i, '')}@lid`
  const lidUser = lid.split('@')[0]

  const { data: rows } = await supabase
    .from('messages')
    .select('metadata, conversation_id')
    .not('metadata', 'is', null)
    .filter('metadata::text', 'ilike', `%${lidUser}@lid%`)
    .order('created_at', { ascending: false })
    .limit(40)

  for (const row of rows || []) {
    const key = row.metadata?.raw_message?.key
    if (!key) continue
    if (key.remoteJid === lid || key.remoteJidAlt === lid) {
      const pn = key.senderPn
      if (typeof pn === 'string' && pn.includes('@s.whatsapp.net')) return pn
      if (typeof key.remoteJidAlt === 'string' && key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
        return key.remoteJidAlt
      }
    }
  }

  // Fallback: conversation already linked to a +62 contact for this LID
  for (const row of rows || []) {
    const key = row.metadata?.raw_message?.key
    if (key?.remoteJid !== lid || !row.conversation_id) continue
    const { data: conv } = await supabase
      .from('conversations')
      .select('contact_id')
      .eq('id', row.conversation_id)
      .maybeSingle()
    if (!conv?.contact_id) continue
    const { data: contact } = await supabase
      .from('contacts')
      .select('phone_number')
      .eq('id', conv.contact_id)
      .maybeSingle()
    if (contact?.phone_number?.startsWith('+62')) {
      return `${contact.phone_number.replace(/\D/g, '')}@s.whatsapp.net`
    }
  }

  return null
}

function phoneDigits(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '')
}

function isRealPhone(value: string | null | undefined): boolean {
  const raw = String(value || '')
  if (!raw || raw.includes('lid') || raw.includes('@') || raw.startsWith('merged:')) return false
  const digits = phoneDigits(raw)
  return digits.length >= 10 && digits.length <= 15
}

/**
 * Find conversation already tied to this WhatsApp @lid (any contact).
 */
export async function findOpenConversationForChatLid(
  supabase: SupabaseClient,
  userId: string,
  chatLid: string
): Promise<{ conversationId: string; contactId: string } | null> {
  const lid = chatLid.endsWith('@lid') ? chatLid : `${chatLid.replace(/^lid:/i, '')}@lid`
  const lidUser = lid.split('@')[0]

  const { data: tagged } = await supabase
    .from('conversations')
    .select('id, contact_id, status, contacts!inner(user_id)')
    .eq('contacts.user_id', userId)
    .eq('status', 'open')
    .filter('metadata->>whatsapp_lid', 'eq', lid)
    .limit(5)

  const taggedHit = (tagged || []).find((row) => row.contact_id)
  if (taggedHit?.contact_id) {
    return { conversationId: taggedHit.id, contactId: taggedHit.contact_id }
  }

  const { data: rows } = await supabase
    .from('messages')
    .select('conversation_id, metadata')
    .not('metadata', 'is', null)
    .filter('metadata::text', 'ilike', `%${lidUser}@lid%`)
    .order('created_at', { ascending: false })
    .limit(40)

  for (const row of rows || []) {
    if (row.metadata?.raw_message?.key?.remoteJid !== lid) continue
    if (!row.conversation_id) continue

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, contact_id, status, contacts!inner(user_id)')
      .eq('id', row.conversation_id)
      .eq('contacts.user_id', userId)
      .maybeSingle()

    if (conv?.contact_id) {
      return { conversationId: conv.id, contactId: conv.contact_id }
    }
  }

  return null
}

const MOVE_TABLES = [
  'messages',
  'tickets',
  'conversation_labels',
  'conversation_notes',
  'chatbot_sessions',
  'handover_logs',
] as const

/**
 * One WhatsApp number (or one @lid before the number is known) keeps a single
 * open room. Alias contacts (lid: vs +62) are folded onto the canonical contact.
 * Two different +62 numbers are never merged.
 */
export async function consolidatePeerConversations(
  supabase: SupabaseClient,
  opts: {
    userId: string
    canonicalContactId: string
    canonicalPhone: string
    aliasPhones: string[]
  }
): Promise<void> {
  const aliasSet = new Set(opts.aliasPhones.filter(Boolean))
  aliasSet.add(opts.canonicalPhone)

  const { data: aliasContacts } = await supabase
    .from('contacts')
    .select('id, phone_number')
    .eq('user_id', opts.userId)
    .in('phone_number', [...aliasSet])

  const canonicalDigits = phoneDigits(opts.canonicalPhone)
  const peerIds = new Set<string>([opts.canonicalContactId])

  for (const row of aliasContacts || []) {
    if (row.id === opts.canonicalContactId) {
      peerIds.add(row.id)
      continue
    }
    const phone = String(row.phone_number || '')
    const digits = phoneDigits(phone)
    const otherRealPhone = isRealPhone(phone) && digits !== canonicalDigits
    if (otherRealPhone) continue
    peerIds.add(row.id)
  }

  if (peerIds.size > 1) {
    const others = [...peerIds].filter((id) => id !== opts.canonicalContactId)
    if (others.length) {
      await supabase
        .from('conversations')
        .update({ contact_id: opts.canonicalContactId })
        .in('contact_id', others)

      for (const id of others) {
        const { count } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('contact_id', id)
        if (count && count > 0) continue
        await supabase
          .from('contacts')
          .update({ phone_number: `merged:${id.slice(0, 8)}` })
          .eq('id', id)
          .eq('user_id', opts.userId)
      }
    }
  }

  const { data: opens } = await supabase
    .from('conversations')
    .select('id, unread_count, last_message, last_message_at, created_at')
    .eq('contact_id', opts.canonicalContactId)
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  if (!opens || opens.length < 2) return

  const keeper = opens[0]
  const extras = opens.slice(1)

  for (const extra of extras) {
    for (const table of MOVE_TABLES) {
      const { error } = await supabase
        .from(table)
        .update({ conversation_id: keeper.id })
        .eq('conversation_id', extra.id)
      if (error && !/does not exist|schema cache|Could not find/i.test(error.message || '')) {
        console.warn('[consolidate] move failed', table, error.message)
      }
    }

    const { error: delErr } = await supabase.from('conversations').delete().eq('id', extra.id)
    if (delErr) {
      await supabase
        .from('conversations')
        .update({
          status: 'closed',
          last_message: '[merged]',
          closed_at: new Date().toISOString(),
        })
        .eq('id', extra.id)
    }
  }

  const { data: latest } = await supabase
    .from('messages')
    .select('content, message_type, created_at')
    .eq('conversation_id', keeper.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const unread = opens.reduce((sum, row) => sum + (row.unread_count || 0), 0)
  await supabase
    .from('conversations')
    .update({
      unread_count: unread,
      last_message: latest?.content || keeper.last_message,
      last_message_at: latest?.created_at || keeper.last_message_at,
    })
    .eq('id', keeper.id)
}

/**
 * Find an existing contact matching any alias; prefer real +62 phone row.
 * Canonical phone: senderPn / resolved PN when available, else lid:…
 */
export async function resolveContactForWhatsAppPeer(
  supabase: SupabaseClient,
  opts: {
    userId: string
    tenantId: string
    phoneNumber: string
    fromLid?: boolean
    chatLid?: string | null
    senderPn?: string | null
    pushName?: string | null
  }
): Promise<{
  contact: ContactRow
  canonicalPhone: string
  created: boolean
  recoveredSenderPn: string | null
}> {
  let senderPn = opts.senderPn || null
  const chatLid =
    opts.chatLid ||
    (opts.fromLid ? `${String(opts.phoneNumber).replace(/^lid:/i, '').split('@')[0]}@lid` : null)

  // Device (fromMe) messages often lack senderPn — recover from CRM history
  if ((!senderPn || String(senderPn).endsWith('@lid')) && chatLid) {
    const recovered = await lookupSenderPnForChatLid(supabase, chatLid)
    if (recovered) senderPn = recovered
  }

  // If still no PN, reuse contact from an existing LID thread (open or recent)
  if ((!senderPn || String(senderPn).endsWith('@lid')) && chatLid) {
    const existing = await findOpenConversationForChatLid(supabase, opts.userId, chatLid)
    if (existing) {
      const { data: c } = await supabase
        .from('contacts')
        .select('id, name, phone_number')
        .eq('id', existing.contactId)
        .maybeSingle()
      if (c) {
        const earlyAliases = buildContactPhoneAliases({
          phoneNumber: c.phone_number,
          fromLid: !!opts.fromLid,
          chatLid,
          senderPn,
        })
        await consolidatePeerConversations(supabase, {
          userId: opts.userId,
          canonicalContactId: c.id,
          canonicalPhone: c.phone_number,
          aliasPhones: earlyAliases,
        })
        return {
          contact: c,
          canonicalPhone: c.phone_number,
          created: false,
          recoveredSenderPn: c.phone_number?.startsWith('+62')
            ? `${c.phone_number.replace(/\D/g, '')}@s.whatsapp.net`
            : senderPn,
        }
      }
    }
  }

  const aliases = buildContactPhoneAliases({
    ...opts,
    senderPn,
    chatLid,
  })

  const senderPnNorm = senderPn ? normalizeWhatsAppRecipient(senderPn) : null
  const phoneNorm = normalizeWhatsAppRecipient(
    // Never force lid: prefix onto a real Indonesian mobile
    opts.fromLid && !/^(62|08)\d{8,}/.test(String(opts.phoneNumber).replace(/\D/g, ''))
      ? `lid:${String(opts.phoneNumber).replace(/^lid:/i, '').split('@')[0]}`
      : String(opts.phoneNumber)
  )

  const canonicalPhone =
    senderPnNorm && !senderPnNorm.isLid
      ? senderPnNorm.displayPhone
      : phoneNorm.displayPhone

  const { data: matches } = await supabase
    .from('contacts')
    .select('id, name, phone_number')
    .eq('user_id', opts.userId)
    .in('phone_number', aliases)

  let contact: ContactRow | null = null
  if (matches && matches.length > 0) {
    // Prefer canonical +62…, then any non-lid, then first match
    contact =
      matches.find((c) => c.phone_number === canonicalPhone) ||
      matches.find((c) => c.phone_number?.startsWith('+62')) ||
      matches.find((c) => !String(c.phone_number).includes('lid') && !String(c.phone_number).includes('@')) ||
      matches[0]
  }

  if (!contact) {
    const { data: created, error } = await supabase
      .from('contacts')
      .insert({
        user_id: opts.userId,
        phone_number: canonicalPhone,
        name: opts.pushName || null,
        tenant_id: opts.tenantId,
      })
      .select('id, name, phone_number')
      .single()

    if (error || !created) {
      throw new Error(error?.message || 'Failed to create contact')
    }
    await consolidatePeerConversations(supabase, {
      userId: opts.userId,
      canonicalContactId: created.id,
      canonicalPhone,
      aliasPhones: aliases,
    })
    return {
      contact: created,
      canonicalPhone,
      created: true,
      recoveredSenderPn: senderPn,
    }
  }

  // Heal contact phone toward canonical +62 when we know PN
  if (
    canonicalPhone.startsWith('+62') &&
    contact.phone_number !== canonicalPhone &&
    (String(contact.phone_number).startsWith('lid:') ||
      String(contact.phone_number).includes('@lid') ||
      /^\+?145/.test(String(contact.phone_number)))
  ) {
    const { error: updErr } = await supabase
      .from('contacts')
      .update({
        phone_number: canonicalPhone,
        name: opts.pushName || contact.name,
      })
      .eq('id', contact.id)

    if (!updErr) {
      contact = { ...contact, phone_number: canonicalPhone, name: opts.pushName || contact.name }
    }
  } else if (opts.pushName && contact.name !== opts.pushName) {
    await supabase.from('contacts').update({ name: opts.pushName }).eq('id', contact.id)
    contact = { ...contact, name: opts.pushName }
  }

  await consolidatePeerConversations(supabase, {
    userId: opts.userId,
    canonicalContactId: contact.id,
    canonicalPhone: contact.phone_number,
    aliasPhones: aliases,
  })

  return { contact, canonicalPhone: contact.phone_number, created: false, recoveredSenderPn: senderPn }
}
