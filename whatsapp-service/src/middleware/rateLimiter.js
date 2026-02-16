/**
 * Rate Limiter Middleware
 * Prevents abuse by limiting requests per phone number/session
 */

class RateLimiter {
  constructor() {
    // Store: phoneNumber -> { count, resetTime, blocked }
    this.limits = new Map();
    
    // Configuration
    this.config = {
      // Messages per minute per phone number
      messagesPerMinute: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_MINUTE) || 20,
      // Messages per hour per phone number
      messagesPerHour: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_HOUR) || 100,
      // Block duration in milliseconds
      blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION) || 300000, // 5 minutes
      // Cleanup interval
      cleanupInterval: 60000, // 1 minute
    };
    
    // Start cleanup job
    this.startCleanup();
  }

  /**
   * Check if request is allowed
   */
  checkLimit(phoneNumber, type = 'minute') {
    const key = `${phoneNumber}:${type}`;
    const now = Date.now();
    
    let limit = this.limits.get(key);
    
    // Check if blocked
    if (limit && limit.blocked && limit.blockedUntil > now) {
      return {
        allowed: false,
        reason: 'blocked',
        retryAfter: Math.ceil((limit.blockedUntil - now) / 1000),
      };
    }
    
    // Initialize or reset if expired
    if (!limit || limit.resetTime < now) {
      const duration = type === 'minute' ? 60000 : 3600000;
      limit = {
        count: 0,
        resetTime: now + duration,
        blocked: false,
        blockedUntil: 0,
      };
      this.limits.set(key, limit);
    }
    
    // Check limit
    const maxCount = type === 'minute' 
      ? this.config.messagesPerMinute 
      : this.config.messagesPerHour;
    
    if (limit.count >= maxCount) {
      // Block the phone number
      limit.blocked = true;
      limit.blockedUntil = now + this.config.blockDuration;
      
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        limit: maxCount,
        retryAfter: Math.ceil((limit.resetTime - now) / 1000),
      };
    }
    
    // Increment counter
    limit.count++;
    
    return {
      allowed: true,
      remaining: maxCount - limit.count,
      resetTime: limit.resetTime,
    };
  }

  /**
   * Check both minute and hour limits
   */
  checkAllLimits(phoneNumber) {
    // Check minute limit
    const minuteCheck = this.checkLimit(phoneNumber, 'minute');
    if (!minuteCheck.allowed) {
      return minuteCheck;
    }
    
    // Check hour limit
    const hourCheck = this.checkLimit(phoneNumber, 'hour');
    if (!hourCheck.allowed) {
      return hourCheck;
    }
    
    return {
      allowed: true,
      remaining: {
        minute: minuteCheck.remaining,
        hour: hourCheck.remaining,
      },
    };
  }

  /**
   * Reset limits for a phone number
   */
  resetLimits(phoneNumber) {
    this.limits.delete(`${phoneNumber}:minute`);
    this.limits.delete(`${phoneNumber}:hour`);
  }

  /**
   * Get current status for a phone number
   */
  getStatus(phoneNumber) {
    const minuteKey = `${phoneNumber}:minute`;
    const hourKey = `${phoneNumber}:hour`;
    
    const minuteLimit = this.limits.get(minuteKey);
    const hourLimit = this.limits.get(hourKey);
    
    return {
      minute: minuteLimit ? {
        count: minuteLimit.count,
        limit: this.config.messagesPerMinute,
        resetTime: minuteLimit.resetTime,
        blocked: minuteLimit.blocked,
      } : null,
      hour: hourLimit ? {
        count: hourLimit.count,
        limit: this.config.messagesPerHour,
        resetTime: hourLimit.resetTime,
        blocked: hourLimit.blocked,
      } : null,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, limit] of this.limits.entries()) {
      // Remove if reset time passed and not blocked
      if (limit.resetTime < now && (!limit.blocked || limit.blockedUntil < now)) {
        this.limits.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Rate limiter cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Start cleanup job
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalEntries = 0;
    let blockedCount = 0;
    
    for (const [key, limit] of this.limits.entries()) {
      totalEntries++;
      if (limit.blocked && limit.blockedUntil > Date.now()) {
        blockedCount++;
      }
    }
    
    return {
      totalEntries,
      blockedCount,
      config: this.config,
    };
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Express middleware
 */
export function rateLimiterMiddleware(req, res, next) {
  const phoneNumber = req.body.to || req.body.phoneNumber || req.params.phoneNumber;
  
  if (!phoneNumber) {
    return next(); // Skip if no phone number
  }
  
  const result = rateLimiter.checkAllLimits(phoneNumber);
  
  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      reason: result.reason,
      retryAfter: result.retryAfter,
      message: result.reason === 'blocked' 
        ? `Phone number temporarily blocked. Try again in ${result.retryAfter} seconds.`
        : `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
    });
  }
  
  // Add rate limit info to response headers
  res.setHeader('X-RateLimit-Remaining-Minute', result.remaining.minute);
  res.setHeader('X-RateLimit-Remaining-Hour', result.remaining.hour);
  
  next();
}

export default rateLimiter;
