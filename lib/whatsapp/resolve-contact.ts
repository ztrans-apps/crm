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
): Promise<{ contact: ContactRow; canonicalPhone: string; created: boolean }> {
  const aliases = buildContactPhoneAliases(opts)

  const senderPnNorm = opts.senderPn
    ? normalizeWhatsAppRecipient(opts.senderPn)
    : null
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
    return { contact: created, canonicalPhone, created: true }
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

  return { contact, canonicalPhone, created: false }
}
