/**
 * WhatsApp Send Service
 * Handle outgoing messages via Meta Cloud API with rate limiting
 */

import { rateLimiter } from '../core/rate-limiter';
import { getMetaCloudAPIForSession } from '@/lib/whatsapp/meta-api';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SendInput {
  tenantId: string;
  sessionId: string;
  to: string;
  message: string;
  metadata?: Record<string, any>;
}

export class WhatsAppSendService {
  /**
   * Send text message via Meta Cloud API
   */
  async sendMessage(input: SendInput): Promise<{ messageId: string }> {
    const { tenantId, sessionId, to, message } = input;

    // Check rate limit
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    // Send via Meta Cloud API
    const api = await getMetaCloudAPIForSession(sessionId, supabase);
    const result = await api.sendTextMessage(to, message);

    // Increment rate limit
    rateLimiter.increment(tenantId, sessionId);

    return { messageId: result.messages?.[0]?.id || 'sent' };
  }

  /**
   * Send media message via Meta Cloud API
   */
  async sendMedia(
    tenantId: string,
    sessionId: string,
    to: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<{ messageId: string }> {
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    const api = await getMetaCloudAPIForSession(sessionId, supabase);
    const result = await api.sendImageMessage(to, mediaUrl, caption);

    rateLimiter.increment(tenantId, sessionId);

    return { messageId: result.messages?.[0]?.id || 'sent' };
  }

  /**
   * Send location via Meta Cloud API
   */
  async sendLocation(
    tenantId: string,
    sessionId: string,
    to: string,
    latitude: number,
    longitude: number,
    description?: string,
  ): Promise<{ messageId: string }> {
    if (rateLimiter.isRateLimited(tenantId, sessionId)) {
      const resetTime = rateLimiter.getResetTime(tenantId, sessionId);
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`
      );
    }

    const api = await getMetaCloudAPIForSession(sessionId, supabase);
    const result = await api.sendLocationMessage(to, latitude, longitude, description || '', '');

    rateLimiter.increment(tenantId, sessionId);

    return { messageId: result.messages?.[0]?.id || 'sent' };
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
}
