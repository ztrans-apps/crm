/**
 * WhatsApp Send Service
 * Handle outgoing messages with queue and rate limiting
 */

import { sessionManager } from '../core/session-manager';
import { rateLimiter } from '../core/rate-limiter';
import { queueManager, QUEUE_NAMES } from '@/lib/queue/queue-manager';
import type { SendMessageInput } from '../types';

export class WhatsAppSendService {
  /**
   * Send text message
   */
  async sendMessage(input: SendMessageInput): Promise<{ jobId: string }> {
    const { tenantId, sessionId, to, message } = input;

    // Check rate limit
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    // Add to queue
    const job = await queueManager.addJob(
      QUEUE_NAMES.WHATSAPP_SEND,
      'send-text',
      {
        tenantId,
        sessionId,
        to,
        message,
        type: 'text',
        metadata: input.metadata,
      }
    );

    // Increment rate limit
    rateLimiter.increment(tenantId, sessionId);

    return { jobId: job.id! };
  }

  /**
   * Send media message
   */
  async sendMedia(
    tenantId: string,
    sessionId: string,
    to: string,
    mediaUrl: string,
    caption?: string,
    metadata?: Record<string, any>
  ): Promise<{ jobId: string }> {
    // Check rate limit
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    // Add to queue
    const job = await queueManager.addJob(
      QUEUE_NAMES.WHATSAPP_SEND,
      'send-media',
      {
        tenantId,
        sessionId,
        to,
        message: caption || '',
        type: 'media',
        mediaUrl,
        metadata,
      }
    );

    // Increment rate limit
    rateLimiter.increment(tenantId, sessionId);

    return { jobId: job.id! };
  }

  /**
   * Send location
   */
  async sendLocation(
    tenantId: string,
    sessionId: string,
    to: string,
    latitude: number,
    longitude: number,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<{ jobId: string }> {
    // Check rate limit
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    // Add to queue
    const job = await queueManager.addJob(
      QUEUE_NAMES.WHATSAPP_SEND,
      'send-location',
      {
        tenantId,
        sessionId,
        to,
        message: description || '',
        type: 'location',
        latitude,
        longitude,
        metadata,
      }
    );

    // Increment rate limit
    rateLimiter.increment(tenantId, sessionId);

    return { jobId: job.id! };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(tenantId: string, sessionId: string) {
    return {
      remaining: rateLimiter.getRemaining(tenantId, sessionId),
      resetIn: rateLimiter.getResetTime(tenantId, sessionId),
      isLimited: rateLimiter.isRateLimited(tenantId, sessionId),
    };
  }

  /**
   * Send direct (bypass queue) - Use with caution!
   */
  async sendDirect(input: SendMessageInput): Promise<{ messageId: string }> {
    const { tenantId, sessionId, to, message } = input;

    // Get session
    const client = sessionManager.getSession(tenantId, sessionId);
    if (!client) {
      throw new Error('WhatsApp session not ready');
    }

    // Check rate limit
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      throw new Error('Rate limit exceeded');
    }

    // Send message
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    const result = await client.sendMessage(chatId, message);

    // Increment rate limit
    rateLimiter.increment(tenantId, sessionId);

    return { messageId: result.id.id };
  }
}
