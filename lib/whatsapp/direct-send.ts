import { getWhatsAppServiceUrl } from '@/lib/whatsapp/service-url'
import { normalizeWhatsAppRecipient } from '@/lib/whatsapp/phone'

/**
 * Send text via Baileys VPS immediately (no Redis worker).
 * Vercel does not run BullMQ workers, so queue-only send never reaches WhatsApp.
 */
export async function sendTextViaBaileys(params: {
  sessionId: string
  to: string
  message: string
  quotedMessageId?: string
  tenantId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string; raw?: unknown }> {
  const serviceUrl = getWhatsAppServiceUrl().replace(/\/$/, '')
  const recipient = normalizeWhatsAppRecipient(params.to)
  const to = recipient.isLid ? recipient.jid : recipient.legacyJid

  const response = await fetch(`${serviceUrl}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: params.sessionId,
      to,
      message: params.message,
      quotedMessageId: params.quotedMessageId,
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
