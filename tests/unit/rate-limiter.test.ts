import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RateLimiter, RateLimitOptions } from '@/lib/middleware/rate-limiter'

// Mock the Redis client
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(() => null) // Return null to force in-memory fallback
}))

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter
  let options: RateLimitOptions
  let testCounter = 0

  beforeEach(() => {
    rateLimiter = new RateLimiter()
    // Use unique identifier for each test to avoid state pollution
    testCounter++
    options = {
      maxRequests: 5,
      windowSeconds: 60,
      keyPrefix: `test:api:${testCounter}`,
      identifier: `test-user-${testCounter}`
    }
  })

  describe('checkLimit', () => {
    it('should allow requests under the limit', async () => {
      const result = await rateLimiter.checkLimit(options)
      
      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(5)
      expect(result.reset).toBeGreaterThan(0)
    })

    it('should track remaining requests correctly', async () => {
      // First request
      await rateLimiter.incrementCounter(options)
      let result = await rateLimiter.checkLimit(options)
      expect(result.remaining).toBe(4)
      
      // Second request
      await rateLimiter.incrementCounter(options)
      result = await rateLimiter.checkLimit(options)
      expect(result.remaining).toBe(3)
    })

    it('should deny requests when limit is exceeded', async () => {
      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.incrementCounter(options)
      }
      
      const result = await rateLimiter.checkLimit(options)
      
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should return correct limit and reset values', async () => {
      const result = await rateLimiter.checkLimit(options)
      
      expect(result.limit).toBe(options.maxRequests)
      expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })
  })

  describe('incrementCounter', () => {
    it('should increment the request counter', async () => {
      const before = await rateLimiter.checkLimit(options)
      expect(before.remaining).toBe(5)
      
      await rateLimiter.incrementCounter(options)
      
      const after = await rateLimiter.checkLimit(options)
      expect(after.remaining).toBe(4)
    })

    it('should handle multiple increments', async () => {
      for (let i = 0; i < 3; i++) {
        await rateLimiter.incrementCounter(options)
      }
      
      const result = await rateLimiter.checkLimit(options)
      expect(result.remaining).toBe(2)
    })
  })

  describe('resetLimit', () => {
    it('should reset the rate limit for an identifier', async () => {
      // Make some requests
      for (let i = 0; i < 3; i++) {
        await rateLimiter.incrementCounter(options)
      }
      
      let result = await rateLimiter.checkLimit(options)
      expect(result.remaining).toBe(2)
      
      // Reset the limit
      await rateLimiter.resetLimit(options.keyPrefix, options.identifier)
      
      // Check that limit is reset
      result = await rateLimiter.checkLimit(options)
      expect(result.remaining).toBe(5)
    })
  })

  describe('checkAndIncrement', () => {
    it('should check and increment atomically when allowed', async () => {
      const result = await rateLimiter.checkAndIncrement(options)
      
      expect(result.allowed).toBe(true)
      
      // Verify counter was incremented
      const check = await rateLimiter.checkLimit(options)
      expect(check.remaining).toBe(4)
    })

    it('should not increment when limit exceeded', async () => {
      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.incrementCounter(options)
      }
      
      const result = await rateLimiter.checkAndIncrement(options)
      
      expect(result.allowed).toBe(false)
      
      // Verify counter was not incremented
      const check = await rateLimiter.checkLimit(options)
      expect(check.remaining).toBe(0)
    })
  })

  describe('sliding window behavior', () => {
    it('should use sliding window algorithm', async () => {
      // This test verifies that old requests outside the window are not counted
      const shortWindowOptions: RateLimitOptions = {
        maxRequests: 3,
        windowSeconds: 1, // 1 second window
        keyPrefix: 'test:sliding',
        identifier: 'test-user-456'
      }
      
      // Make 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        await rateLimiter.incrementCounter(shortWindowOptions)
      }
      
      let result = await rateLimiter.checkLimit(shortWindowOptions)
      expect(result.allowed).toBe(false)
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Should be allowed again after window expires
      result = await rateLimiter.checkLimit(shortWindowOptions)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(3)
    })
  })

  describe('tenant isolation', () => {
    it('should isolate rate limits by identifier', async () => {
      const user1Options: RateLimitOptions = {
        ...options,
        identifier: 'user-1'
      }
      
      const user2Options: RateLimitOptions = {
        ...options,
        identifier: 'user-2'
      }
      
      // User 1 makes 3 requests
      for (let i = 0; i < 3; i++) {
        await rateLimiter.incrementCounter(user1Options)
      }
      
      // User 2 makes 1 request
      await rateLimiter.incrementCounter(user2Options)
      
      // Check limits are independent
      const user1Result = await rateLimiter.checkLimit(user1Options)
      const user2Result = await rateLimiter.checkLimit(user2Options)
      
      expect(user1Result.remaining).toBe(2)
      expect(user2Result.remaining).toBe(4)
    })

    it('should isolate rate limits by key prefix', async () => {
      const apiOptions: RateLimitOptions = {
        ...options,
        keyPrefix: 'api:messages'
      }
      
      const authOptions: RateLimitOptions = {
        ...options,
        keyPrefix: 'auth:login'
      }
      
      // Make requests to different endpoints
      for (let i = 0; i < 2; i++) {
        await rateLimiter.incrementCounter(apiOptions)
      }
      
      for (let i = 0; i < 4; i++) {
        await rateLimiter.incrementCounter(authOptions)
      }
      
      // Check limits are independent
      const apiResult = await rateLimiter.checkLimit(apiOptions)
      const authResult = await rateLimiter.checkLimit(authOptions)
      
      expect(apiResult.remaining).toBe(3)
      expect(authResult.remaining).toBe(1)
    })
  })

  describe('graceful degradation', () => {
    it('should work with in-memory fallback when Redis unavailable', async () => {
      // Redis is mocked to return null, so this tests in-memory fallback
      const result = await rateLimiter.checkLimit(options)
      
      expect(result).toBeDefined()
      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(options.maxRequests)
    })

    it('should maintain functionality with in-memory fallback', async () => {
      // Make requests using in-memory fallback
      for (let i = 0; i < 3; i++) {
        await rateLimiter.incrementCounter(options)
      }
      
      const result = await rateLimiter.checkLimit(options)
      
      expect(result.remaining).toBe(2)
      expect(result.allowed).toBe(true)
    })
  })
})
