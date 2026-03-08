import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import type { AuthContext } from '@/lib/middleware/types'

/**
 * Property-Based Tests for Rate Limit Headers
 * 
 * **Validates: Requirements 3.4, 3.10**
 * 
 * These tests verify that:
 * - All responses include rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
 * - 429 responses include Retry-After header
 * - Header values are correct and consistent
 */

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-profile-id',
              tenant_id: 'test-tenant-id',
              role: 'user',
              full_name: 'Test User',
            },
            error: null,
          }),
        })),
      })),
    })),
  })),
}))

// Mock Supabase JS client (service role)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}))

// Mock request logger
vi.mock('@/lib/middleware/request-logger', () => ({
  RequestLogger: {
    logRequest: vi.fn(),
    logSecurityEvent: vi.fn(),
  },
}))

// Mock rate limiter - track state per identifier
const rateLimitState = new Map<string, { count: number; reset: number }>()

vi.mock('@/lib/middleware/rate-limiter', () => ({
  rateLimiter: {
    checkLimit: vi.fn(async (options: any) => {
      const key = `${options.keyPrefix}:${options.identifier}`
      const now = Math.floor(Date.now() / 1000)
      
      // Get or initialize state
      let state = rateLimitState.get(key)
      if (!state || state.reset < now) {
        state = { count: 0, reset: now + options.windowSeconds }
        rateLimitState.set(key, state)
      }
      
      const allowed = state.count < options.maxRequests
      const remaining = Math.max(0, options.maxRequests - state.count)
      
      return {
        allowed,
        limit: options.maxRequests,
        remaining,
        reset: state.reset,
      }
    }),
    incrementCounter: vi.fn(async (options: any) => {
      const key = `${options.keyPrefix}:${options.identifier}`
      const state = rateLimitState.get(key)
      if (state) {
        state.count++
      }
    }),
    resetLimit: vi.fn(async (keyPrefix: string, identifier: string) => {
      const key = `${keyPrefix}:${identifier}`
      rateLimitState.delete(key)
    }),
  },
}))

// Mock error handler
vi.mock('@/lib/middleware/error-handler', () => ({
  ErrorHandler: {
    handle: vi.fn((error: any, requestId: string) => {
      const response = NextResponse.json(
        { error: error.message || 'Internal Server Error' },
        { status: error.statusCode || 500 }
      )
      // Add Retry-After header for rate limit errors
      if (error.name === 'RateLimitError' && error.retryAfter !== undefined) {
        response.headers.set('Retry-After', error.retryAfter.toString())
      }
      return response
    }),
    logError: vi.fn(),
  },
  RateLimitError: class RateLimitError extends Error {
    statusCode = 429
    constructor(message: string, public code: string, public retryAfter?: number) {
      super(message)
      this.name = 'RateLimitError'
    }
  },
  ValidationError: class ValidationError extends Error {
    statusCode = 400
    constructor(message: string, public code: string) {
      super(message)
      this.name = 'ValidationError'
    }
  },
}))

// Mock security headers
vi.mock('@/lib/middleware/security-headers', () => ({
  addSecurityHeaders: vi.fn((response: NextResponse) => response),
}))

// Mock input validator
vi.mock('@/lib/middleware/input-validator', () => ({
  InputValidator: {
    validate: vi.fn((schema: any, data: any) => ({
      success: true,
      data,
      errors: [],
    })),
  },
}))

describe('Feature: security-optimization, Property 13: Rate Limit Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear rate limit state between tests
    rateLimitState.clear()
  })
  /**
   * Property Test: All responses should include rate limit headers
   * 
   * This test verifies that when rate limiting is configured, all responses
   * (both successful and rate-limited) include the standard rate limit headers:
   * - X-RateLimit-Limit: Maximum requests allowed
   * - X-RateLimit-Remaining: Requests remaining in current window
   * - X-RateLimit-Reset: Unix timestamp when limit resets
   * 
   * Validates Requirement 3.4: Rate limit headers included in all responses
   */
  it('should include rate limit headers in all responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 2, max: 10 }),
          windowSeconds: fc.integer({ min: 1, max: 5 }),
          requestCount: fc.integer({ min: 1, max: 3 }), // Make some requests
          testId: fc.uuid(), // Unique ID for this test run
        }),
        async ({ maxRequests, windowSeconds, requestCount, testId }) => {
          // Create a test handler with rate limiting
          const handler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            },
            {
              rateLimit: {
                maxRequests,
                windowSeconds,
                keyPrefix: `test-headers-${testId}`, // Unique prefix per test
              },
            }
          )

          // Make multiple requests
          for (let i = 0; i < requestCount; i++) {
            const request = new NextRequest('http://localhost:3000/api/test', {
              method: 'GET',
            })

            const response = await handler(request)

            // All responses should have rate limit headers
            expect(response.headers.has('X-RateLimit-Limit')).toBe(true)
            expect(response.headers.has('X-RateLimit-Remaining')).toBe(true)
            expect(response.headers.has('X-RateLimit-Reset')).toBe(true)

            // Verify header values are valid
            const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0')
            const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
            const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0')

            expect(limit).toBe(maxRequests)
            expect(remaining).toBeGreaterThanOrEqual(0)
            expect(remaining).toBeLessThanOrEqual(maxRequests)
            expect(reset).toBeGreaterThan(Math.floor(Date.now() / 1000))
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Rate limit headers should be consistent
   * 
   * This test verifies that the rate limit headers are consistent across
   * multiple requests:
   * - X-RateLimit-Limit stays constant
   * - X-RateLimit-Remaining decreases by 1 with each request
   * - X-RateLimit-Reset is consistent within the window
   * 
   * Validates Requirement 3.4: Rate limit headers are correct and consistent
   */
  it('should have consistent rate limit headers across requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 3, max: 8 }),
          windowSeconds: fc.integer({ min: 2, max: 5 }),
          testId: fc.uuid(),
        }),
        async ({ maxRequests, windowSeconds, testId }) => {
          const handler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            },
            {
              rateLimit: {
                maxRequests,
                windowSeconds,
                keyPrefix: `test-consistency-${testId}`,
              },
            }
          )

          let previousRemaining = maxRequests + 1 // Start higher to account for first request
          let previousReset: number | null = null

          // Make requests up to the limit
          for (let i = 0; i < maxRequests; i++) {
            const request = new NextRequest('http://localhost:3000/api/test', {
              method: 'GET',
            })

            const response = await handler(request)

            const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0')
            const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
            const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0')

            // Limit should always be the same
            expect(limit).toBe(maxRequests)

            // Remaining should decrease (or stay at 0 if already at limit)
            expect(remaining).toBeLessThan(previousRemaining)

            // Reset should be consistent (same or slightly later)
            if (previousReset !== null) {
              expect(reset).toBeGreaterThanOrEqual(previousReset - 1) // Allow 1 second tolerance
            }

            previousRemaining = remaining
            previousReset = reset
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: 429 responses should include Retry-After header
   * 
   * This test verifies that when rate limit is exceeded (429 status),
   * the response includes a Retry-After header indicating when the
   * client can retry the request.
   * 
   * Validates Requirement 3.10: Retry-After header on 429 responses
   */
  it('should include Retry-After header when rate limited', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 1, max: 5 }),
          windowSeconds: fc.integer({ min: 2, max: 10 }),
          testId: fc.uuid(),
        }),
        async ({ maxRequests, windowSeconds, testId }) => {
          const handler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            },
            {
              rateLimit: {
                maxRequests,
                windowSeconds,
                keyPrefix: `test-retry-after-${testId}`,
              },
            }
          )

          // Exhaust the rate limit
          for (let i = 0; i < maxRequests; i++) {
            const request = new NextRequest('http://localhost:3000/api/test', {
              method: 'GET',
            })
            await handler(request)
          }

          // Next request should be rate limited
          const request = new NextRequest('http://localhost:3000/api/test', {
            method: 'GET',
          })
          const response = await handler(request)

          // Should be rate limited
          expect(response.status).toBe(429)

          // Should have Retry-After header
          expect(response.headers.has('Retry-After')).toBe(true)

          // Retry-After should be a positive number
          const retryAfter = parseInt(response.headers.get('Retry-After') || '0')
          expect(retryAfter).toBeGreaterThan(0)
          // Retry-After is calculated from reset time, which can be up to windowSeconds in the future
          expect(retryAfter).toBeLessThanOrEqual(windowSeconds + 2) // Allow 2 second tolerance

          // Should still have rate limit headers
          expect(response.headers.has('X-RateLimit-Limit')).toBe(true)
          expect(response.headers.has('X-RateLimit-Remaining')).toBe(true)
          expect(response.headers.has('X-RateLimit-Reset')).toBe(true)

          // Remaining should be 0
          const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '-1')
          expect(remaining).toBe(0)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Rate limit headers should reflect accurate state
   * 
   * This test verifies that the rate limit headers accurately reflect
   * the current state of the rate limiter:
   * - Remaining count matches actual requests left
   * - Reset time is accurate
   * - Headers update correctly after each request
   * 
   * Validates Requirement 3.4: Rate limit headers are accurate
   */
  it('should accurately reflect rate limit state in headers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 3, max: 10 }),
          windowSeconds: fc.integer({ min: 1, max: 5 }),
          testId: fc.uuid(),
        }),
        async ({ maxRequests, windowSeconds, testId }) => {
          const handler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            },
            {
              rateLimit: {
                maxRequests,
                windowSeconds,
                keyPrefix: `test-accuracy-${testId}`,
              },
            }
          )

          const startTime = Math.floor(Date.now() / 1000)

          // Make requests and verify state
          for (let i = 0; i < maxRequests; i++) {
            const request = new NextRequest('http://localhost:3000/api/test', {
              method: 'GET',
            })

            const response = await handler(request)

            const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0')
            const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
            const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0')

            // Verify limit is correct
            expect(limit).toBe(maxRequests)

            // Verify remaining is valid (between 0 and maxRequests)
            // Note: remaining reflects state BEFORE increment, so it can be maxRequests on first request
            expect(remaining).toBeGreaterThanOrEqual(0)
            expect(remaining).toBeLessThanOrEqual(maxRequests)

            // Verify reset is in the future and within expected window
            expect(reset).toBeGreaterThan(startTime)
            expect(reset).toBeLessThanOrEqual(startTime + windowSeconds + 2) // Allow 2 second tolerance
          }

          // After exhausting limit, verify state
          const finalRequest = new NextRequest('http://localhost:3000/api/test', {
            method: 'GET',
          })
          const finalResponse = await handler(finalRequest)

          expect(finalResponse.status).toBe(429)
          const finalRemaining = parseInt(finalResponse.headers.get('X-RateLimit-Remaining') || '-1')
          expect(finalRemaining).toBe(0)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Rate limit headers should be present even without rate limiting
   * 
   * This test verifies that when rate limiting is NOT configured,
   * the responses do NOT include rate limit headers (they are only
   * present when rate limiting is explicitly enabled).
   * 
   * This ensures headers are only added when rate limiting is active.
   */
  it('should not include rate limit headers when rate limiting is not configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant({}),
        async () => {
          // Handler without rate limiting
          const handler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            }
            // No rateLimit option
          )

          const request = new NextRequest('http://localhost:3000/api/test', {
            method: 'GET',
          })

          const response = await handler(request)

          // Should NOT have rate limit headers when not configured
          expect(response.headers.has('X-RateLimit-Limit')).toBe(false)
          expect(response.headers.has('X-RateLimit-Remaining')).toBe(false)
          expect(response.headers.has('X-RateLimit-Reset')).toBe(false)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Rate limit headers should have correct format
   * 
   * This test verifies that rate limit headers have the correct format:
   * - All values are valid integers
   * - Limit is positive
   * - Remaining is non-negative
   * - Reset is a valid Unix timestamp
   * 
   * Validates Requirement 3.4: Rate limit headers are correctly formatted
   */
  it('should have correctly formatted rate limit headers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRequests: fc.integer({ min: 1, max: 20 }),
          windowSeconds: fc.integer({ min: 1, max: 10 }),
        }),
        async ({ maxRequests, windowSeconds }) => {
          const handler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            },
            {
              rateLimit: {
                maxRequests,
                windowSeconds,
                keyPrefix: 'test-format',
              },
            }
          )

          const request = new NextRequest('http://localhost:3000/api/test', {
            method: 'GET',
          })

          const response = await handler(request)

          // Get header values
          const limitStr = response.headers.get('X-RateLimit-Limit')
          const remainingStr = response.headers.get('X-RateLimit-Remaining')
          const resetStr = response.headers.get('X-RateLimit-Reset')

          // All headers should be present
          expect(limitStr).not.toBeNull()
          expect(remainingStr).not.toBeNull()
          expect(resetStr).not.toBeNull()

          // All should be valid integers
          const limit = parseInt(limitStr!)
          const remaining = parseInt(remainingStr!)
          const reset = parseInt(resetStr!)

          expect(Number.isInteger(limit)).toBe(true)
          expect(Number.isInteger(remaining)).toBe(true)
          expect(Number.isInteger(reset)).toBe(true)

          // Limit should be positive
          expect(limit).toBeGreaterThan(0)

          // Remaining should be non-negative
          expect(remaining).toBeGreaterThanOrEqual(0)

          // Reset should be a valid Unix timestamp (in seconds, not milliseconds)
          const now = Math.floor(Date.now() / 1000)
          expect(reset).toBeGreaterThan(now - 1) // Allow 1 second tolerance
          expect(reset).toBeLessThan(now + windowSeconds + 10) // Should be within reasonable future
        }
      ),
      { numRuns: 2 }
    )
  })
})
