/**
 * Inbound WhatsApp message parsing (Baileys protobuf shapes).
 */

export function unwrapMessageContent(message) {
  if (!message) return null
  let m = message
  for (let depth = 0; depth < 8; depth++) {
    if (m?.ephemeralMessage?.message) {
      m = m.ephemeralMessage.message
      continue
    }
    if (m?.viewOnceMessage?.message) {
      m = m.viewOnceMessage.message
      continue
    }
    if (m?.viewOnceMessageV2?.message) {
      m = m.viewOnceMessageV2.message
      continue
    }
    if (m?.documentWithCaptionMessage?.message) {
      m = m.documentWithCaptionMessage.message
      continue
    }
    break
  }
  return m
}

export function isReactionOrProtocol(message) {
  const u = unwrapMessageContent(message)
  if (!u) return false
  return !!(u.reactionMessage || u.protocolMessage || u.senderKeyDistributionMessage)
}

export function extractInboundTextFromContent(unwrapped) {
  if (!unwrapped) return null
  return (
    unwrapped.conversation ||
    unwrapped.extendedTextMessage?.text ||
    unwrapped.imageMessage?.caption ||
    unwrapped.videoMessage?.caption ||
    unwrapped.documentMessage?.caption ||
    unwrapped.buttonsResponseMessage?.selectedDisplayText ||
    unwrapped.listResponseMessage?.title ||
    unwrapped.listResponseMessage?.singleSelectReply?.selectedRowId ||
    unwrapped.templateButtonReplyMessage?.selectedDisplayText ||
    unwrapped.templateButtonReplyMessage?.selectedId ||
    null
  )
}

export function classifyInboundMessageType(unwrapped) {
  if (!unwrapped) return 'unknown'
  if (unwrapped.reactionMessage) return 'reaction'
  if (unwrapped.imageMessage || unwrapped.stickerMessage) return 'image'
  if (unwrapped.videoMessage) return 'video'
  if (unwrapped.audioMessage || unwrapped.pttMessage) return 'audio'
  if (unwrapped.documentMessage || unwrapped.documentWithCaptionMessage) return 'document'
  if (unwrapped.locationMessage || unwrapped.liveLocationMessage) return 'location'
  if (
    unwrapped.conversation ||
    unwrapped.extendedTextMessage ||
    unwrapped.buttonsResponseMessage ||
    unwrapped.listResponseMessage ||
    unwrapped.templateButtonReplyMessage
  ) {
    return 'text'
  }
  return 'unknown'
}

const PREVIEW_BY_TYPE = {
  image: '[Image]',
  video: '[Video]',
  audio: '[Audio]',
  document: '[Document]',
  location: '[Location]',
  reaction: '[Reaction]',
  unknown: '[Message]',
}

export function getInboundPreview(messageText, messageType) {
  if (messageText && String(messageText).trim()) return String(messageText).trim()
  return PREVIEW_BY_TYPE[messageType] || '[Message]'
}

export function extractQuotedStanzaId(unwrapped) {
  if (!unwrapped) return null
  const parts = [
    unwrapped.extendedTextMessage?.contextInfo?.stanzaId,
    unwrapped.imageMessage?.contextInfo?.stanzaId,
    unwrapped.videoMessage?.contextInfo?.stanzaId,
    unwrapped.audioMessage?.contextInfo?.stanzaId,
    unwrapped.documentMessage?.contextInfo?.stanzaId,
    unwrapped.documentWithCaptionMessage?.message?.documentMessage?.contextInfo?.stanzaId,
  ]
  return parts.find(Boolean) || null
}

export function getMediaMetaFromContent(unwrapped) {
  if (!unwrapped) return null
  if (unwrapped.imageMessage) {
    return {
      messageType: 'image',
      mimetype: unwrapped.imageMessage.mimetype || 'image/jpeg',
      filename: null,
    }
  }
  if (unwrapped.stickerMessage) {
    return {
      messageType: 'image',
      mimetype: unwrapped.stickerMessage.mimetype || 'image/webp',
      filename: 'sticker.webp',
    }
  }
  if (unwrapped.videoMessage) {
    return {
      messageType: 'video',
      mimetype: unwrapped.videoMessage.mimetype || 'video/mp4',
      filename: null,
    }
  }
  if (unwrapped.audioMessage || unwrapped.pttMessage) {
    const audio = unwrapped.audioMessage || unwrapped.pttMessage
    return {
      messageType: 'audio',
      mimetype: audio.mimetype || 'audio/ogg',
      filename: null,
    }
  }
  if (unwrapped.documentMessage) {
    return {
      messageType: 'document',
      mimetype: unwrapped.documentMessage.mimetype || 'application/octet-stream',
      filename: unwrapped.documentMessage.fileName || null,
    }
  }
  if (unwrapped.documentWithCaptionMessage?.message?.documentMessage) {
    const doc = unwrapped.documentWithCaptionMessage.message.documentMessage
    return {
      messageType: 'document',
      mimetype: doc.mimetype || 'application/octet-stream',
      filename: doc.fileName || null,
    }
  }
  return null
}
