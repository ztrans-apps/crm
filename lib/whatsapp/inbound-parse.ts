/** Mirror of whatsapp-service/src/utils/inbound-message.js for Next.js bridge */

export function unwrapMessageContent(message: Record<string, unknown> | null | undefined) {
  if (!message) return null
  let m: Record<string, unknown> = message
  for (let depth = 0; depth < 8; depth++) {
    const ephemeral = m.ephemeralMessage as { message?: Record<string, unknown> } | undefined
    if (ephemeral?.message) {
      m = ephemeral.message
      continue
    }
    const v1 = m.viewOnceMessage as { message?: Record<string, unknown> } | undefined
    if (v1?.message) {
      m = v1.message
      continue
    }
    const v2 = m.viewOnceMessageV2 as { message?: Record<string, unknown> } | undefined
    if (v2?.message) {
      m = v2.message
      continue
    }
    const dwc = m.documentWithCaptionMessage as { message?: Record<string, unknown> } | undefined
    if (dwc?.message) {
      m = dwc.message
      continue
    }
    break
  }
  return m
}

export type InboundMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'reaction'
  | 'unknown'

export function getInboundPreview(messageText: string | null | undefined, messageType: string) {
  if (messageText && String(messageText).trim()) return String(messageText).trim()
  const map: Record<string, string> = {
    image: '[Image]',
    video: '[Video]',
    audio: '[Audio]',
    document: '[Document]',
    location: '[Location]',
    reaction: '[Reaction]',
    unknown: '[Message]',
  }
  return map[messageType] || '[Message]'
}
