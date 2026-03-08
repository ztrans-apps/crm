import { getRedisClient } from '@/lib/cache/redis'

/**
 * Rate limit result returned by checkLimit
 */
export interface RateLimitResult {
  /** Whether the request is allowed (under the limit) */
  allowed: boolean
  
  /** Maximum number of requests allowed in the window */
  limit: number
  
  /** Number of requests remaining in the current window */
  remaining: number
  
  /** Unix timestamp (seconds) when the rate limit resets */
  reset: number
}

/**
 * Options for rate limiting operations
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  
  /** Time window in seconds */
  windowSeconds: number
  
  /** Prefix for the Redis key (e.g., "api:messages", "auth:login") */
  keyPrefix: string
  
  /** Identifier for the rate limit (tenant_id, user_id, or IP address) */
  identifier: string
}

/**
 * In-memory fallback for rate limiting when Redis is unavailable
 * Uses a Map to track request timestamps per identifier
 */
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  /**
   * Check if request is within rate limit using in-memory storage
   */
  checkLimit(options: RateLimitOptions): RateLimitResult {
    const key = `${options.keyPrefix}:${options.identifier}`
    const now = Date.now()
    const windowMs = options.windowSeconds * 1000
    const windowStart = now - windowMs
    
    // Get existing requests for this key
    let timestamps = this.requests.get(key) || []
    
    // Remove expired timestamps (outside the sliding window)
    timestamps = timestamps.filter(ts => ts > windowStart)
    
    // Update the map with cleaned timestamps
    this.requests.set(key, timestamps)
    
    // Check if under limit
    const allowed = timestamps.length < options.maxRequests
    const remaining = Math.max(0, options.maxRequests - timestamps.length)
    
    // Calculate reset time (when the oldest request expires)
    const oldestTimestamp = timestamps[0] || now
    const reset = Math.ceil((oldestTimestamp + windowMs) / 1000)
    
    return {
      allowed,
      limit: options.maxRequests,
      remaining,
      reset
    }
  }
  
  /**
   * Increment the counter by adding current timestamp
   */
  incrementCounter(options: RateLimitOptions): void {
    const key = `${options.keyPrefix}:${options.identifier}`
    const now = Date.now()
    const windowMs = options.windowSeconds * 1000
    const windowStart = now - windowMs
    
    // Get existing requests
    let timestamps = this.requests.get(key) || []
    
    // Remove expired timestamps
    timestamps = timestamps.filter(ts => ts > windowStart)
    
    // Add current timestamp
    timestamps.push(now)
    
    // Update the map
    this.requests.set(key, timestamps)
  }
  
  /**
   * Reset rate limit for an identifier
   */
  resetLimit(keyPrefix: string, identifier: string): void {
    const key = `${keyPrefix}:${identifier}`
    this.requests.delete(key)
  }
  
  /**
   * Cleanup old entries (called periodically)
   */
  cleanup(): void {
    const now = Date.now()
    const maxAge = 3600 * 1000 // 1 hour
    
    for (const [key, timestamps] of this.requests.entries()) {
      // Remove entries older than 1 hour
      const filtered = timestamps.filter(ts => ts > now - maxAge)
      
      if (filtered.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, filtered)
      }
    }
  }
}

// Singleton instance for in-memory fallback
const inMemoryLimiter = new InMemoryRateLimiter()

// Cleanup in-memory cache every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    inMemoryLimiter.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Redis-based rate limiter with sliding window algorithm
 * 
 * Uses Redis sorted sets to track requests with timestamps.
 * Falls back to in-memory rate limiting when Redis is unavailable.
 * 
 * Implementation:
 * - Each request is stored as a member in a sorted set with timestamp as score
 * - Expired requests (outside the window) are automatically removed
 * - Count of requests in the window determines if limit is exceeded
 * 
 * @example
 * ```typescript
 * const limiter = new RateLimiter()
 * 
 * // Check if request is allowed
 * const result = await limiter.checkLimit({
 *   maxRequests: 100,
 *   windowSeconds: 3600,
 *   keyPrefix: 'api:messages',
 *   identifier: tenantId
 * })
 * 
 * if (!result.allowed) {
 *   return res.status(429).json({ error: 'Rate limit exceeded' })
 * }
 * 
 * // Increment counter after processing request
 * await limiter.incrementCounter(options)
 * ```
 */
export class RateLimiter {
  private redis: ReturnType<typeof getRedisClient>
  
  constructor() {
    this.redis = getRedisClient()
  }
  
  /**
   * Check if request is within rate limit
   * 
   * Uses sliding window algorithm with Redis sorted sets:
   * 1. Remove expired entries (outside the time window)
   * 2. Count remaining entries in the window
   * 3. Compare count against limit
   * 
   * @param options - Rate limit configuration
   * @returns Rate limit result with allowed status and metadata
   */
  async checkLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    // Fallback to in-memory if Redis unavailable
    if (!this.redis) {
      return inMemoryLimiter.checkLimit(options)
    }
    
    try {
      const key = `ratelimit:${options.keyPrefix}:${options.identifier}`
      const now = Date.now()
      const windowStart = now - (options.windowSeconds * 1000)
      
      // Remove expired entries (outside the sliding window)
      await this.redis.zremrangebyscore(key, 0, windowStart)
      
      // Count requests in the current window
      const count = await this.redis.zcard(key)
      
      // Check if under limit
      const allowed = count < options.maxRequests
      const remaining = Math.max(0, options.maxRequests - count)
      
      // Get the oldest timestamp to calculate reset time
      const oldestEntries = await this.redis.zrange(key, 0, 0, { withScores: true })
      const oldestTimestamp = oldestEntries.length > 0 
        ? (oldestEntries[0] as { score: number }).score 
        : now
      
      // Calculate when the rate limit resets (when oldest entry expires)
      const reset = Math.ceil((oldestTimestamp + (options.windowSeconds * 1000)) / 1000)
      
      return {
        allowed,
        limit: options.maxRequests,
        remaining,
        reset
      }
    } catch (error) {
      console.error('Redis rate limit check error, falling back to in-memory:', error)
      return inMemoryLimiter.checkLimit(options)
    }
  }
  
  /**
   * Increment the request counter
   * 
   * Adds current timestamp to the sorted set and sets expiration.
   * Should be called after a request is successfully processed.
   * 
   * @param options - Rate limit configuration
   */
  async incrementCounter(options: RateLimitOptions): Promise<void> {
    // Fallback to in-memory if Redis unavailable
    if (!this.redis) {
      inMemoryLimiter.incrementCounter(options)
      return
    }
    
    try {
      const key = `ratelimit:${options.keyPrefix}:${options.identifier}`
      const now = Date.now()
      const uniqueId = `${now}-${Math.random().toString(36).substr(2, 9)}`
      
      // Add current request with timestamp as score
      await this.redis.zadd(key, { score: now, member: uniqueId })
      
      // Set expiration on the key (window + buffer for cleanup)
      const expirationSeconds = options.windowSeconds + 60
      await this.redis.expire(key, expirationSeconds)
    } catch (error) {
      console.error('Redis rate limit increment error, falling back to in-memory:', error)
      inMemoryLimiter.incrementCounter(options)
    }
  }
  
  /**
   * Reset rate limit for a specific identifier
   * 
   * Useful for:
   * - Admin operations to clear rate limits
   * - Testing
   * - Resolving false positives
   * 
   * @param keyPrefix - The rate limit key prefix (e.g., "api:messages")
   * @param identifier - The identifier to reset (tenant_id, user_id, or IP)
   */
  async resetLimit(keyPrefix: string, identifier: string): Promise<void> {
    // Fallback to in-memory if Redis unavailable
    if (!this.redis) {
      inMemoryLimiter.resetLimit(keyPrefix, identifier)
      return
    }
    
    try {
      const key = `ratelimit:${keyPrefix}:${identifier}`
      await this.redis.del(key)
    } catch (error) {
      console.error('Redis rate limit reset error, falling back to in-memory:', error)
      inMemoryLimiter.resetLimit(keyPrefix, identifier)
    }
  }
  
  /**
   * Check and increment in a single operation (atomic)
   * 
   * This is a convenience method that combines checkLimit and incrementCounter.
   * Use this when you want to check and increment atomically.
   * 
   * @param options - Rate limit configuration
   * @returns Rate limit result
   */
  async checkAndIncrement(options: RateLimitOptions): Promise<RateLimitResult> {
    const result = await this.checkLimit(options)
    
    if (result.allowed) {
      await this.incrementCounter(options)
    }
    
    return result
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter()
