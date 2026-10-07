import { getWhatsAppServiceUrl } from '@/lib/whatsapp/service-url'
import { normalizeWhatsAppRecipient } from '@/lib/whatsapp/phone'
import type { QuotedContextPayload } from '@/lib/whatsapp/quote-context'

function resolveToJid(to: string) {
  const recipient = normalizeWhatsAppRecipient(to)
  return recipient.isLid ? recipient.jid : recipient.legacyJid
}

/**
 * Send text via Baileys VPS immediately (no Redis worker).
 */
export async function sendTextViaBaileys(params: {
  sessionId: string
  to: string
  message: string
  quotedMessageId?: string
  quotedContext?: QuotedContextPayload | null
  tenantId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string; raw?: unknown }> {
  const serviceUrl = getWhatsAppServiceUrl().replace(/\/$/, '')
  const to = resolveToJid(params.to)

  const response = await fetch(`${serviceUrl}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: params.sessionId,
      to,
      message: params.message,
      quotedMessageId: params.quotedMessageId,
      quotedContext: params.quotedContext || null,
      tenantId: params.tenantId,
    }),
    signal: AbortSignal.timeout(45000),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      success: false,
      error: (data as { error?: string }).error || `HTTP ${response.status}`,
      raw: data,
    }
  }

  return {
    success: true,
    messageId: (data as { messageId?: string }).messageId,
    raw: data,
  }
}

export async function sendLocationViaBaileys(params: {
  sessionId: string
  to: string
  latitude: number
  longitude: number
  address?: string
  name?: string
  tenantId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string; raw?: unknown }> {
  const serviceUrl = getWhatsAppServiceUrl().replace(/\/$/, '')
  const to = resolveToJid(params.to)

  const response = await fetch(`${serviceUrl}/api/whatsapp/send-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: params.sessionId,
      to,
      latitude: params.latitude,
      longitude: params.longitude,
      address: params.address,
      name: params.name,
      tenantId: params.tenantId,
    }),
    signal: AbortSignal.timeout(45000),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      success: false,
      error: (data as { error?: string }).error || `HTTP ${response.status}`,
      raw: data,
    }
  }

  return {
    success: true,
    messageId: (data as { messageId?: string }).messageId,
    raw: data,
  }
}

export async function sendMediaViaBaileys(params: {
  sessionId: string
  to: string
  buffer: Buffer
  mimetype: string
  caption?: string
  filename?: string
  tenantId?: string
  quotedContext?: QuotedContextPayload | null
}): Promise<{ success: boolean; messageId?: string; error?: string; raw?: unknown }> {
  const serviceUrl = getWhatsAppServiceUrl().replace(/\/$/, '')
  const to = resolveToJid(params.to)

  const formData = new FormData()
  formData.append('sessionId', params.sessionId)
  formData.append('to', to)
  formData.append('caption', params.caption || '')
  formData.append('mimetype', params.mimetype)
  if (params.tenantId) formData.append('tenantId', params.tenantId)
  if (params.filename) formData.append('filename', params.filename)
  if (params.quotedContext) {
    formData.append('quotedContext', JSON.stringify(params.quotedContext))
  }
  formData.append(
    'media',
    new Blob([params.buffer], { type: params.mimetype }),
    params.filename || 'media'
  )

  const response = await fetch(`${serviceUrl}/api/whatsapp/send-media`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(120000),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      success: false,
      error: (data as { error?: string }).error || `HTTP ${response.status}`,
      raw: data,
    }
  }

  return {
    success: true,
    messageId: (data as { messageId?: string }).messageId,
    raw: data,
  }
}
