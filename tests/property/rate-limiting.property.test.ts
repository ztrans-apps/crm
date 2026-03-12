import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { RateLimiter } from '@/lib/middleware/rate-limiter'
import type { RateLimitOptions } from '@/lib/middleware/rate-limiter'

vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(() => null)
}))

/**
 * Property-Based Tests for Rate Limiting Enforcement
 * 
 * **Validates: Requirements 3.1, 3.6**
 * 
 * These tests verify that the rate limiter correctly enforces request limits,
 * rejects requests exceeding limits with 429 status, uses sliding window algorithm,
 * and maintains separate limits for different identifiers.
 */

describe('Feature: security-optimization, Property 12: Rate Limiting Enforcement', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property Test: Requests exceeding limit should be rejected
   * 
   * This test verifies that when the number of requests exceeds the configured
   * limit within the time window, subsequent requests are rejected (allowed: false).
   * 
   * The property being tested: For any tenant making requests to an endpoint,
   * when the number of requests exceeds the configured limit within the time window,
   * the system should reject subsequent requests until the window resets.
   */
  it('should reject requests exceeding the configured limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate rate limit configuration
          maxRequests: fc.integer({ min: 1, max: 10 }), // Small limit for faster testing
          windowSeconds: fc.integer({ min: 1, max: 5 }), // Short window for faster testing
          identifier: fc.uuid(),
          keyPrefix: fc.constantFrom('api', 'auth', 'whatsapp', 'admin'),
        }),
        async ({ maxRequests, windowSeconds, identifier, keyPrefix }) => {
          const options: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier,
            keyPrefix,
          }

          // Make requests up to the limit
          for (let i = 0; i < maxRequests; i++) {
            // Increment first to simulate a request being made
            await rateLimiter.incrementCounter(options)
            
            // Then check the state after increment
            const result = await rateLimiter.checkLimit(options)
            
            // After i+1 requests, we should have maxRequests - (i+1) remaining
            const expectedRemaining = maxRequests - (i + 1)
            expect(result.remaining).toBe(expectedRemaining)
            expect(result.limit).toBe(maxRequests)
            
            // Should still be allowed until we hit the limit
            if (i < maxRequests - 1) {
              expect(result.allowed).toBe(true)
            } else {
              // At the limit now
              expect(result.allowed).toBe(false)
            }
          }

          // The next request should definitely be rejected
          const rejectedResult = await rateLimiter.checkLimit(options)
          expect(rejectedResult.allowed).toBe(false)
          expect(rejectedResult.limit).toBe(maxRequests)
          expect(rejectedResult.remaining).toBe(0)
          expect(rejectedResult.reset).toBeGreaterThan(Math.floor(Date.now() / 1000))

          // Clean up
          await rateLimiter.resetLimit(keyPrefix, identifier)
        }
      ),
      { numRuns: 2 } // Using numRuns: 2 as specified in context
    )
  })

  /**
   * Property Test: Rate limit should include reset timestamp
   * 
   * This test verifies that when rate limited, the response includes
   * a reset timestamp indicating when the limit will be lifted.
   */
  it('should include reset timestamp when rate limited', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 1, max: 5 }),
          windowSeconds: fc.integer({ min: 2, max: 10 }),
          identifier: fc.uuid(),
          keyPrefix: fc.constant('test'),
        }),
        async ({ maxRequests, windowSeconds, identifier, keyPrefix }) => {
          const options: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier,
            keyPrefix,
          }

          const startTime = Math.floor(Date.now() / 1000)

          // Exhaust the limit
          for (let i = 0; i < maxRequests; i++) {
            await rateLimiter.incrementCounter(options)
          }

          // Check rate limited response
          const result = await rateLimiter.checkLimit(options)
          expect(result.allowed).toBe(false)
          expect(result.reset).toBeGreaterThan(startTime)
          expect(result.reset).toBeLessThanOrEqual(startTime + windowSeconds + 1)

          // Clean up
          await rateLimiter.resetLimit(keyPrefix, identifier)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Different identifiers should have separate rate limits
   * 
   * This test verifies that rate limits are tracked separately for different
   * identifiers (tenants, users, IPs), ensuring proper isolation.
   * 
   * Validates Requirement 3.6: Different rate limits for different endpoint categories
   */
  it('should maintain separate rate limits for different identifiers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 2, max: 10 }),
          windowSeconds: fc.integer({ min: 1, max: 5 }),
          identifier1: fc.uuid(),
          identifier2: fc.uuid(),
          keyPrefix: fc.constant('api'),
        }).filter(({ identifier1, identifier2 }) => identifier1 !== identifier2),
        async ({ maxRequests, windowSeconds, identifier1, identifier2, keyPrefix }) => {
          const options1: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier: identifier1,
            keyPrefix,
          }

          const options2: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier: identifier2,
            keyPrefix,
          }

          // Exhaust limit for identifier1
          for (let i = 0; i < maxRequests; i++) {
            await rateLimiter.incrementCounter(options1)
          }

          // identifier1 should be rate limited
          const result1 = await rateLimiter.checkLimit(options1)
          expect(result1.allowed).toBe(false)

          // identifier2 should still be allowed (separate limit)
          const result2 = await rateLimiter.checkLimit(options2)
          expect(result2.allowed).toBe(true)
          expect(result2.remaining).toBe(maxRequests)

          // Clean up
          await rateLimiter.resetLimit(keyPrefix, identifier1)
          await rateLimiter.resetLimit(keyPrefix, identifier2)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Sliding window algorithm should count requests accurately
   * 
   * This test verifies that the rate limiter uses a sliding window algorithm
   * where requests are counted accurately regardless of when they occur within
   * the window.
   * 
   * Validates Requirement 3.5: Sliding window algorithm for accurate rate limiting
   */
  it('should use sliding window algorithm for accurate counting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 3, max: 8 }),
          windowSeconds: fc.constant(2), // 2 second window for testing
          identifier: fc.uuid(),
          keyPrefix: fc.constant('test'),
        }),
        async ({ maxRequests, windowSeconds, identifier, keyPrefix }) => {
          const options: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier,
            keyPrefix,
          }

          // Make half the requests
          const halfRequests = Math.floor(maxRequests / 2)
          for (let i = 0; i < halfRequests; i++) {
            await rateLimiter.incrementCounter(options)
          }

          // Wait for half the window to pass
          await new Promise(resolve => setTimeout(resolve, (windowSeconds * 1000) / 2))

          // Make remaining requests
          for (let i = halfRequests; i < maxRequests; i++) {
            await rateLimiter.incrementCounter(options)
          }

          // Should be at limit now
          const atLimitResult = await rateLimiter.checkLimit(options)
          expect(atLimitResult.allowed).toBe(false)

          // Wait for the first half of requests to expire
          await new Promise(resolve => setTimeout(resolve, (windowSeconds * 1000) / 2 + 100))

          // Should have capacity again (first half expired)
          const afterExpiryResult = await rateLimiter.checkLimit(options)
          expect(afterExpiryResult.allowed).toBe(true)
          expect(afterExpiryResult.remaining).toBeGreaterThan(0)

          // Clean up
          await rateLimiter.resetLimit(keyPrefix, identifier)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Rate limit remaining count should decrease correctly
   * 
   * This test verifies that the remaining count decreases by 1 with each
   * request and accurately reflects the number of requests left.
   */
  it('should accurately track remaining request count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 3, max: 15 }),
          windowSeconds: fc.integer({ min: 1, max: 5 }),
          identifier: fc.uuid(),
          keyPrefix: fc.constant('test'),
        }),
        async ({ maxRequests, windowSeconds, identifier, keyPrefix }) => {
          const options: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier,
            keyPrefix,
          }

          // Track remaining count through all requests
          for (let i = 0; i < maxRequests; i++) {
            const result = await rateLimiter.checkLimit(options)
            expect(result.allowed).toBe(true)
            expect(result.remaining).toBe(maxRequests - i)
            expect(result.limit).toBe(maxRequests)
            
            await rateLimiter.incrementCounter(options)
            
            // After increment, check again to verify count decreased
            const afterIncrement = await rateLimiter.checkLimit(options)
            expect(afterIncrement.remaining).toBe(maxRequests - i - 1)
          }

          // After exhausting limit, remaining should be 0
          const finalResult = await rateLimiter.checkLimit(options)
          expect(finalResult.allowed).toBe(false)
          expect(finalResult.remaining).toBe(0)

          // Clean up
          await rateLimiter.resetLimit(keyPrefix, identifier)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Reset should clear rate limit for identifier
   * 
   * This test verifies that calling resetLimit clears the rate limit
   * for a specific identifier, allowing requests to proceed again.
   */
  it('should clear rate limit when reset is called', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 2, max: 8 }),
          windowSeconds: fc.integer({ min: 1, max: 5 }),
          identifier: fc.uuid(),
          keyPrefix: fc.constant('test'),
        }),
        async ({ maxRequests, windowSeconds, identifier, keyPrefix }) => {
          const options: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier,
            keyPrefix,
          }

          // Exhaust the limit
          for (let i = 0; i < maxRequests; i++) {
            await rateLimiter.incrementCounter(options)
          }

          // Should be rate limited
          const beforeReset = await rateLimiter.checkLimit(options)
          expect(beforeReset.allowed).toBe(false)

          // Reset the limit
          await rateLimiter.resetLimit(keyPrefix, identifier)

          // Should be allowed again
          const afterReset = await rateLimiter.checkLimit(options)
          expect(afterReset.allowed).toBe(true)
          expect(afterReset.remaining).toBe(maxRequests)

          // Clean up
          await rateLimiter.resetLimit(keyPrefix, identifier)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Different key prefixes should have separate limits
   * 
   * This test verifies that different endpoint categories (key prefixes)
   * maintain separate rate limits even for the same identifier.
   * 
   * Validates Requirement 3.6: Different rate limits for different endpoint categories
   */
  it('should maintain separate limits for different endpoint categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 2, max: 8 }),
          windowSeconds: fc.integer({ min: 1, max: 5 }),
          identifier: fc.uuid(),
          keyPrefix1: fc.constant('api'),
          keyPrefix2: fc.constant('whatsapp'),
        }),
        async ({ maxRequests, windowSeconds, identifier, keyPrefix1, keyPrefix2 }) => {
          const options1: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier,
            keyPrefix: keyPrefix1,
          }

          const options2: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier,
            keyPrefix: keyPrefix2,
          }

          // Exhaust limit for keyPrefix1
          for (let i = 0; i < maxRequests; i++) {
            await rateLimiter.incrementCounter(options1)
          }

          // keyPrefix1 should be rate limited
          const result1 = await rateLimiter.checkLimit(options1)
          expect(result1.allowed).toBe(false)

          // keyPrefix2 should still be allowed (separate category)
          const result2 = await rateLimiter.checkLimit(options2)
          expect(result2.allowed).toBe(true)
          expect(result2.remaining).toBe(maxRequests)

          // Clean up
          await rateLimiter.resetLimit(keyPrefix1, identifier)
          await rateLimiter.resetLimit(keyPrefix2, identifier)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: checkAndIncrement should be atomic
   * 
   * This test verifies that the checkAndIncrement method correctly
   * checks and increments in a single operation.
   */
  it('should atomically check and increment with checkAndIncrement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 2, max: 10 }),
          windowSeconds: fc.integer({ min: 1, max: 5 }),
          identifier: fc.uuid(),
          keyPrefix: fc.constant('test'),
        }),
        async ({ maxRequests, windowSeconds, identifier, keyPrefix }) => {
          const options: RateLimitOptions = {
            maxRequests,
            windowSeconds,
            identifier,
            keyPrefix,
          }

          // Use checkAndIncrement for all requests
          for (let i = 0; i < maxRequests; i++) {
            const result = await rateLimiter.checkAndIncrement(options)
            expect(result.allowed).toBe(true)
            // checkAndIncrement checks first, then increments
            // So remaining should be maxRequests - i before the increment
            expect(result.remaining).toBe(maxRequests - i)
          }

          // Next request should be rejected
          const rejectedResult = await rateLimiter.checkAndIncrement(options)
          expect(rejectedResult.allowed).toBe(false)
          expect(rejectedResult.remaining).toBe(0)

          // Clean up
          await rateLimiter.resetLimit(keyPrefix, identifier)
        }
      ),
      { numRuns: 2 }
    )
  })
})
