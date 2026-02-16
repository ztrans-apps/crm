/**
 * WhatsApp Rate Limiter
 * Prevent WhatsApp ban by rate limiting messages per tenant/session
 */

interface RateLimitConfig {
  maxMessages: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class WhatsAppRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  // Default limits (conservative to prevent ban)
  private defaultConfig: RateLimitConfig = {
    maxMessages: 20, // 20 messages
    windowMs: 60000, // per minute
  };

  /**
   * Get rate limit key
   */
  private getKey(tenantId: string, sessionId: string): string {
    return `${tenantId}:${sessionId}`;
  }

  /**
   * Check if rate limit is exceeded
   */
  isRateLimited(
    tenantId: string,
    sessionId: string,
    config?: Partial<RateLimitConfig>
  ): boolean {
    const key = this.getKey(tenantId, sessionId);
    const now = Date.now();
    const limitConfig = { ...this.defaultConfig, ...config };

    // Get or create entry
    let entry = this.limits.get(key);

    // Reset if window expired
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + limitConfig.windowMs,
      };
      this.limits.set(key, entry);
    }

    // Check limit
    return entry.count >= limitConfig.maxMessages;
  }

  /**
   * Increment rate limit counter
   */
  increment(tenantId: string, sessionId: string): void {
    const key = this.getKey(tenantId, sessionId);
    const entry = this.limits.get(key);

    if (entry) {
      entry.count++;
    }
  }

  /**
   * Get remaining messages in current window
   */
  getRemaining(
    tenantId: string,
    sessionId: string,
    config?: Partial<RateLimitConfig>
  ): number {
    const key = this.getKey(tenantId, sessionId);
    const limitConfig = { ...this.defaultConfig, ...config };
    const entry = this.limits.get(key);

    if (!entry || Date.now() >= entry.resetAt) {
      return limitConfig.maxMessages;
    }

    return Math.max(0, limitConfig.maxMessages - entry.count);
  }

  /**
   * Get time until reset (ms)
   */
  getResetTime(tenantId: string, sessionId: string): number {
    const key = this.getKey(tenantId, sessionId);
    const entry = this.limits.get(key);

    if (!entry) {
      return 0;
    }

    return Math.max(0, entry.resetAt - Date.now());
  }

  /**
   * Reset rate limit for session
   */
  reset(tenantId: string, sessionId: string): void {
    const key = this.getKey(tenantId, sessionId);
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new WhatsAppRateLimiter();

// Cleanup expired entries every minute
setInterval(() => {
  rateLimiter.cleanup();
}, 60000);
