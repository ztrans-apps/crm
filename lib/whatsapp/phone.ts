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

  // Already a Baileys JID — never re-parse digits (LID ids look like long numbers)
  if (trimmed.endsWith('@lid')) {
    const user = trimmed.split('@')[0].replace(/\D/g, '')
    return {
      user,
      displayPhone: `lid:${user}`,
      isLid: true,
      jid: `${user}@lid`,
      legacyJid: `${user}@lid`,
    }
  }
  if (trimmed.endsWith('@s.whatsapp.net') || trimmed.endsWith('@c.us')) {
    const user = trimmed.split('@')[0].replace(/\D/g, '')
    let e164 = user
    if (e164.startsWith('0')) e164 = `62${e164.slice(1)}`
    else if (!e164.startsWith('62') && e164.length >= 9 && e164.length <= 12) e164 = `62${e164}`
    return {
      user: e164,
      displayPhone: `+${e164}`,
      isLid: false,
      jid: `${e164}@s.whatsapp.net`,
      legacyJid: `${e164}@c.us`,
    }
  }

  const hadLidPrefix = trimmed.toLowerCase().startsWith('lid:')
  const core = hadLidPrefix ? trimmed.slice(4) : trimmed
  const digits = core.replace(/\D/g, '')

  // Only treat lid:… as a mistaken phone when it is clearly an Indonesian mobile
  const looksLikeIndonesianPhone =
    /^62\d{8,13}$/.test(digits) || /^08\d{8,12}$/.test(digits)

  if (hadLidPrefix && !looksLikeIndonesianPhone && digits.length >= 10) {
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
