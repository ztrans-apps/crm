/**
 * Webhook Event Emitter
 * Emits WhatsApp events to webhook system
 */

class WebhookEmitter {
  constructor() {
    this.webhookServiceUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  /**
   * Emit event to webhook router
   */
  async emitEvent(tenantId, eventType, data) {
    try {
      // Call Next.js API to route webhook
      const response = await fetch(`${this.webhookServiceUrl}/api/webhooks/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          eventType,
          data,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        console.error(`[WebhookEmitter] Failed to emit event ${eventType}:`, response.statusText)
      }
    } catch (error) {
      console.error(`[WebhookEmitter] Error emitting event ${eventType}:`, error.message)
    }
  }

  /**
   * Emit message received event
   */
  async messageReceived(tenantId, sessionId, message) {
    await this.emitEvent(tenantId, 'message.received', {
      sessionId,
      from: message.key.remoteJid,
      messageId: message.key.id,
      message: message.message,
      timestamp: message.messageTimestamp,
    })
  }

  /**
   * Emit message sent event
   */
  async messageSent(tenantId, sessionId, to, messageId) {
    await this.emitEvent(tenantId, 'message.sent', {
      sessionId,
      to,
      messageId,
    })
  }

  /**
   * Emit message delivered event
   */
  async messageDelivered(tenantId, sessionId, messageId) {
    await this.emitEvent(tenantId, 'message.delivered', {
      sessionId,
      messageId,
    })
  }

  /**
   * Emit message read event
   */
  async messageRead(tenantId, sessionId, messageId) {
    await this.emitEvent(tenantId, 'message.read', {
      sessionId,
      messageId,
    })
  }

  /**
   * Emit message failed event
   */
  async messageFailed(tenantId, sessionId, messageId, error) {
    await this.emitEvent(tenantId, 'message.failed', {
      sessionId,
      messageId,
      error: error.message || error,
    })
  }

  /**
   * Emit session connected event
   */
  async sessionConnected(tenantId, sessionId, phoneNumber) {
    await this.emitEvent(tenantId, 'session.connected', {
      sessionId,
      phoneNumber,
    })
  }

  /**
   * Emit session disconnected event
   */
  async sessionDisconnected(tenantId, sessionId, reason) {
    await this.emitEvent(tenantId, 'session.disconnected', {
      sessionId,
      reason,
    })
  }
}

// Singleton instance
const webhookEmitter = new WebhookEmitter()

export default webhookEmitter

