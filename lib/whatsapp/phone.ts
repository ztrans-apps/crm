/**
 * Normalize contact phone values for WhatsApp send/save.
 * Handles accidental `lid:` prefix on real phone numbers, and true LID ids.
 */
export function normalizeWhatsAppRecipient(raw: string): {
  /** Digits / id without @domain */
  user: string
  /** E.164-ish display phone when known */
  displayPhone: string
  /** true when recipient must be addressed as @lid */
  isLid: boolean
  /** Baileys / legacy WhatsApp JID */
  jid: string
  /** legacy @c.us form used by some CRM call sites */
  legacyJid: string
} {
  const trimmed = String(raw || '').trim()
  const hadLidPrefix = trimmed.toLowerCase().startsWith('lid:')
  const core = hadLidPrefix ? trimmed.slice(4) : trimmed
  const digits = core.replace(/\D/g, '')

  // Real phone mistakenly stored as lid:628... (common after LID→PN resolve)
  const looksLikePhone =
    /^62\d{8,13}$/.test(digits) ||
    /^08\d{8,12}$/.test(digits) ||
    /^\d{10,15}$/.test(digits)

  if (hadLidPrefix && !looksLikePhone && digits.length >= 10) {
    return {
      user: digits,
      displayPhone: `lid:${digits}`,
      isLid: true,
      jid: `${digits}@lid`,
      legacyJid: `${digits}@lid`,
    }
  }

  let e164Digits = digits
  if (e164Digits.startsWith('0')) {
    e164Digits = `62${e164Digits.slice(1)}`
  } else if (!e164Digits.startsWith('62') && e164Digits.length >= 9 && e164Digits.length <= 12) {
    e164Digits = `62${e164Digits}`
  }

  return {
    user: e164Digits,
    displayPhone: `+${e164Digits}`,
    isLid: false,
    jid: `${e164Digits}@s.whatsapp.net`,
    legacyJid: `${e164Digits}@c.us`,
  }
}
