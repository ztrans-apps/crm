/**
 * Webhook Router Service
 * Routes WhatsApp events to registered webhooks
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { queueManager } from '@/lib/queue/queue-manager'

export interface WebhookEvent {
  type: string
  tenantId: string
  sessionId?: string
  data: any
  timestamp: string
}

export interface Webhook {
  id: string
  tenant_id: string
  name: string
  url: string
  secret?: string
  events: string[]
  is_active: boolean
  retry_count: number
  timeout_ms: number
}

class WebhookRouterService {
  /**
   * Route event to registered webhooks
   */
  async routeEvent(event: WebhookEvent): Promise<void> {
    try {
      // Get active webhooks for this tenant and event type
      const webhooks = await this.getWebhooksForEvent(event.tenantId, event.type)

      if (webhooks.length === 0) {
        console.log(`[WebhookRouter] No webhooks registered for event: ${event.type}`)
        return
      }

      console.log(`[WebhookRouter] Routing event ${event.type} to ${webhooks.length} webhook(s)`)

      // Queue webhook deliveries
      for (const webhook of webhooks) {
        await this.queueWebhookDelivery(webhook, event)
      }
    } catch (error) {
      console.error('[WebhookRouter] Error routing event:', error)
    }
  }

  /**
   * Get webhooks for specific event type
   */
  private async getWebhooksForEvent(tenantId: string, eventType: string): Promise<Webhook[]> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .contains('events', [eventType])

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('[WebhookRouter] Error getting webhooks:', error)
      return []
    }
  }

  /**
   * Queue webhook delivery
   */
  private async queueWebhookDelivery(webhook: Webhook, event: WebhookEvent): Promise<void> {
    try {
      const queue = queueManager.getQueue('webhook-delivery')

      await queue.add(
        'deliver',
        {
          webhookId: webhook.id,
          webhook,
          event,
        },
        {
          attempts: webhook.retry_count,
          backoff: {
            type: 'exponential',
            delay: 2000, // 2 seconds
          },
          timeout: webhook.timeout_ms,
        }
      )

      console.log(`[WebhookRouter] Queued delivery for webhook: ${webhook.name}`)
    } catch (error) {
      console.error('[WebhookRouter] Error queueing webhook delivery:', error)
    }
  }

  /**
   * Deliver webhook (called by worker)
   */
  async deliverWebhook(
    webhookId: string,
    webhook: Webhook,
    event: WebhookEvent,
    attemptNumber: number = 1
  ): Promise<{ success: boolean; statusCode?: number; error?: string; duration: number }> {
    const startTime = Date.now()

    try {
      // Prepare payload
      const payload = {
        event: event.type,
        timestamp: event.timestamp,
        data: event.data,
      }

      // Generate signature if secret is provided
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-CRM-Webhook/1.0',
        'X-Webhook-Event': event.type,
        'X-Webhook-Timestamp': event.timestamp,
        'X-Webhook-Attempt': attemptNumber.toString(),
      }

      if (webhook.secret) {
        const signature = this.generateSignature(payload, webhook.secret)
        headers['X-Webhook-Signature'] = signature
      }

      // Send webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(webhook.timeout_ms),
      })

      const duration = Date.now() - startTime
      const responseBody = await response.text()

      // Log delivery
      await this.logWebhookDelivery({
        webhookId,
        tenantId: event.tenantId,
        eventType: event.type,
        payload,
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit to 1000 chars
        attemptNumber,
        success: response.ok,
        duration,
      })

      return {
        success: response.ok,
        statusCode: response.status,
        duration,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime

      // Log failed delivery
      await this.logWebhookDelivery({
        webhookId,
        tenantId: event.tenantId,
        eventType: event.type,
        payload: event.data,
        attemptNumber,
        success: false,
        errorMessage: error.message,
        duration,
      })

      return {
        success: false,
        error: error.message,
        duration,
      }
    }
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    return `sha256=${hmac.digest('hex')}`
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Log webhook delivery
   */
  private async logWebhookDelivery(log: {
    webhookId: string
    tenantId: string
    eventType: string
    payload: any
    responseStatus?: number
    responseBody?: string
    attemptNumber: number
    success: boolean
    errorMessage?: string
    duration: number
  }): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase.from('webhook_logs').insert({
        webhook_id: log.webhookId,
        tenant_id: log.tenantId,
        event_type: log.eventType,
        payload: log.payload,
        response_status: log.responseStatus,
        response_body: log.responseBody,
        attempt_number: log.attemptNumber,
        success: log.success,
        error_message: log.errorMessage,
        duration_ms: log.duration,
      })
    } catch (error) {
      console.error('[WebhookRouter] Error logging webhook delivery:', error)
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(tenantId: string, webhookId?: string): Promise<any> {
    try {
      const supabase = await createClient()

      let query = supabase
        .from('webhook_logs')
        .select('success, duration_ms, created_at')
        .eq('tenant_id', tenantId)

      if (webhookId) {
        query = query.eq('webhook_id', webhookId)
      }

      // Get logs from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', oneDayAgo)

      const { data, error } = await query

      if (error) throw error

      const total = data?.length || 0
      const successful = data?.filter(l => l.success).length || 0
      const failed = total - successful
      const avgDuration = total > 0
        ? Math.round(data!.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / total)
        : 0

      return {
        total,
        successful,
        failed,
        successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
        avgDuration,
      }
    } catch (error) {
      console.error('[WebhookRouter] Error getting webhook stats:', error)
      return null
    }
  }
}

// Singleton instance
export const webhookRouter = new WebhookRouterService()

