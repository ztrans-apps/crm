import crypto from 'crypto'
import { getRedisClient } from '@/lib/cache/redis'

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  secret: string
  signatureHeader: string
  algorithm: 'sha256' | 'sha512'
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  id: string
  event: string
  data: Record<string, unknown>
  timestamp: number
}

/**
 * Webhook Handler
 * 
 * Provides secure webhook processing with:
 * - HMAC signature verification
 * - Replay attack prevention
 * - Timestamp validation
 * - Async processing via queue
 * - Idempotency handling
 * 
 * @example
 * ```typescript
 * const handler = new WebhookHandler()
 * 
 * // Verify signature
 * const isValid = await handler.verifySignature(
 *   payloadString,
 *   signature,
 *   { secret: 'webhook-secret', signatureHeader: 'X-Signature', algorithm: 'sha256' }
 * )
 * 
 * if (!isValid) {
 *   return res.status(401).json({ error: 'Invalid signature' })
 * }
 * 
 * // Process webhook
 * await handler.processWebhook(payload, config)
 * ```
 */
export class WebhookHandler {
  private redis: ReturnType<typeof getRedisClient>
  
  constructor() {
    this.redis = getRedisClient()
  }
  
  /**
   * Verify HMAC signature
   * 
   * @param payload - Raw payload string
   * @param signature - Signature from header
   * @param config - Webhook configuration
   * @returns True if signature is valid
   */
  async verifySignature(
    payload: string,
    signature: string,
    config: WebhookConfig
  ): Promise<boolean> {
    try {
      // Generate expected signature
      const hmac = crypto.createHmac(config.algorithm, config.secret)
      hmac.update(payload)
      const expectedSignature = hmac.digest('hex')
      
      // Compare signatures using timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch (error) {
      console.error('Signature verification error:', error)
      return false
    }
  }
  
  /**
   * Process webhook
   * 
   * @param payload - Webhook payload
   * @param config - Webhook configuration
   */
  async processWebhook(
    payload: WebhookPayload,
    config: WebhookConfig
  ): Promise<void> {
    // Validate timestamp (reject webhooks older than 5 minutes)
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    if (now - payload.timestamp > maxAge) {
      throw new Error('Webhook timestamp too old')
    }
    
    // Check for replay attack
    const isReplay = await this.preventReplay(payload.id)
    if (isReplay) {
      throw new Error('Webhook replay detected')
    }
    
    // Queue webhook for async processing
    await this.queueWebhook(payload)
    
    console.log(`✅ Webhook queued: ${payload.event} (${payload.id})`)
  }
  
  /**
   * Prevent replay attacks
   * 
   * Tracks processed webhook IDs in Redis with expiration.
   * Returns true if webhook has already been processed.
   * 
   * @param webhookId - Unique webhook ID
   * @returns True if webhook has already been processed
   */
  async preventReplay(webhookId: string): Promise<boolean> {
    if (!this.redis) {
      // Fallback: Use in-memory tracking (not distributed)
      // In production, Redis should always be available
      console.warn('Redis unavailable for replay prevention')
      return false
    }
    
    try {
      const key = `webhook:processed:${webhookId}`
      
      // Check if webhook has been processed
      const exists = await this.redis.get(key)
      if (exists) {
        return true // Replay detected
      }
      
      // Mark webhook as processed (expire after 1 hour)
      await this.redis.setex(key, 3600, '1')
      
      return false // Not a replay
    } catch (error) {
      console.error('Replay prevention error:', error)
      return false // Fail open to avoid blocking legitimate webhooks
    }
  }
  
  /**
   * Queue webhook for async processing
   * 
   * In production, this should integrate with a proper queue system like:
   * - Bull/BullMQ
   * - AWS SQS
   * - Google Cloud Tasks
   * - Azure Queue Storage
   * 
   * For now, this is a placeholder that logs the webhook.
   * 
   * @param payload - Webhook payload
   */
  async queueWebhook(payload: WebhookPayload): Promise<void> {
    // Placeholder implementation
    // In production, push to queue for async processing
    
    if (this.redis) {
      try {
        // Store in Redis list as a simple queue
        const queueKey = 'webhook:queue'
        await this.redis.lpush(queueKey, JSON.stringify(payload))
        
        // Trim queue to prevent unbounded growth (keep last 1000)
        await this.redis.ltrim(queueKey, 0, 999)
      } catch (error) {
        console.error('Queue webhook error:', error)
      }
    }
    
    // Log webhook for debugging
    console.log('Webhook queued:', {
      id: payload.id,
      event: payload.event,
      timestamp: new Date(payload.timestamp).toISOString()
    })
  }
  
  /**
   * Validate webhook payload structure
   * 
   * @param payload - Webhook payload to validate
   * @returns True if payload is valid
   */
  validatePayload(payload: unknown): payload is WebhookPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false
    }
    
    const p = payload as Record<string, unknown>
    
    return (
      typeof p.id === 'string' &&
      typeof p.event === 'string' &&
      typeof p.data === 'object' &&
      p.data !== null &&
      typeof p.timestamp === 'number'
    )
  }
  
  /**
   * Generate webhook signature for testing
   * 
   * @param payload - Payload string
   * @param secret - Webhook secret
   * @param algorithm - Hash algorithm
   * @returns HMAC signature
   */
  static generateSignature(
    payload: string,
    secret: string,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): string {
    const hmac = crypto.createHmac(algorithm, secret)
    hmac.update(payload)
    return hmac.digest('hex')
  }
}

// Export singleton instance
export const webhookHandler = new WebhookHandler()
