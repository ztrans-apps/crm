/**
 * Baileys WhatsApp Adapter
 * Integrates existing Baileys service with queue system
 */

import { queueManager, QUEUE_NAMES } from '../queue-manager';
import { rateLimiter } from '@/modules/whatsapp/core/rate-limiter';

interface SendMessageJob {
  tenantId: string;
  sessionId: string;
  to: string;
  message: string;
  type: 'text' | 'media' | 'location';
  mediaUrl?: string;
  mediaBuffer?: Buffer;
  mimetype?: string;
  caption?: string;
  filename?: string;
  latitude?: number;
  longitude?: number;
  quotedMessageId?: string;
  metadata?: Record<string, any>;
  conversationId?: string;
  messageDbId?: string; // Database message ID to update after sending
}

export class BaileysQueueAdapter {
  /**
   * Send message via queue (with rate limiting)
   */
  async sendMessage(
    sessionId: string,
    to: string,
    message: string,
    quotedMessageId?: string,
    tenantId: string = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001',
    messageDbId?: string
  ): Promise<{ jobId: string }> {
    // Check rate limit
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    // Add to queue
    const job = await queueManager.addJob<SendMessageJob>(
      QUEUE_NAMES.WHATSAPP_SEND,
      'send-text',
      {
        tenantId,
        sessionId,
        to,
        message,
        type: 'text',
        quotedMessageId,
        messageDbId,
      }
    );

    // Increment rate limit
    rateLimiter.increment(tenantId, sessionId);

    return { jobId: job.id! };
  }

  /**
   * Send media via queue (with rate limiting)
   */
  async sendMedia(
    sessionId: string,
    to: string,
    mediaBuffer: Buffer,
    options: {
      mimetype: string;
      caption?: string;
      filename?: string;
    },
    tenantId: string = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
  ): Promise<{ jobId: string }> {
    // Check rate limit
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    // Add to queue
    const job = await queueManager.addJob<SendMessageJob>(
      QUEUE_NAMES.WHATSAPP_SEND,
      'send-media',
      {
        tenantId,
        sessionId,
        to,
        message: options.caption || '',
        type: 'media',
        mediaBuffer: mediaBuffer as any, // BullMQ will serialize this
        mimetype: options.mimetype,
        caption: options.caption,
        filename: options.filename,
      }
    );

    // Increment rate limit
    rateLimiter.increment(tenantId, sessionId);

    return { jobId: job.id! };
  }

  /**
   * Send location via queue (with rate limiting)
   */
  async sendLocation(
    sessionId: string,
    to: string,
    latitude: number,
    longitude: number,
    options?: {
      address?: string;
      name?: string;
    },
    tenantId: string = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
  ): Promise<{ jobId: string }> {
    // Check rate limit
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    // Add to queue
    const job = await queueManager.addJob<SendMessageJob>(
      QUEUE_NAMES.WHATSAPP_SEND,
      'send-location',
      {
        tenantId,
        sessionId,
        to,
        message: options?.address || '',
        type: 'location',
        latitude,
        longitude,
        metadata: options,
      }
    );

    // Increment rate limit
    rateLimiter.increment(tenantId, sessionId);

    return { jobId: job.id! };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(
    sessionId: string,
    tenantId: string = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
  ) {
    return {
      remaining: rateLimiter.getRemaining(tenantId, sessionId),
      resetIn: rateLimiter.getResetTime(tenantId, sessionId),
      isLimited: rateLimiter.isRateLimited(tenantId, sessionId),
    };
  }
}

// Singleton instance
export const baileysAdapter = new BaileysQueueAdapter();
