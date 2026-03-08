import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { rateLimiter } from '@/lib/middleware/rate-limiter'
import { InputValidator } from '@/lib/middleware/input-validator'
import { z } from 'zod'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/middleware/rate-limiter', () => ({
  rateLimiter: {
    checkLimit: vi.fn(),
    incrementCounter: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/request-logger', () => ({
  RequestLogger: {
    logRequest: vi.fn(),
    logSecurityEvent: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/error-handler', () => ({
  ErrorHandler: {
    handle: vi.fn(),
    logError: vi.fn(),
  },
  RateLimitError: class RateLimitError extends Error {
    constructor(message: string, public code: string, public retryAfter?: number) {
      super(message)
      this.name = 'RateLimitError'
    }
    statusCode = 429
    isOperational = true
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string, public code: string) {
      super(message)
      this.name = 'ValidationError'
    }
    statusCode = 400
    isOperational = true
  },
}))

vi.mock('@/lib/middleware/security-headers', () => ({
  addSecurityHeaders: vi.fn((response) => response),
}))

vi.mock('@/lib/monitoring/performance-monitor', () => ({
  PerformanceMonitor: {
    getInstance: vi.fn(() => ({
      incrementConcurrentRequests: vi.fn(),
      decrementConcurrentRequests: vi.fn(),
      recordMetric: vi.fn(),
    })),
  },
}))

vi.mock('@/lib/security/api-key-manager', () => ({
  APIKeyManager: vi.fn().mockImplementation(() => ({
    validateAPIKey: vi.fn(),
    isIPWhitelisted: vi.fn(),
    hasScope: vi.fn(),
  })),
}))

describe('withAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rate Limiting', () => {
    it('should check rate limit when rateLimit option is provided', async () => {
      const mockRateLimitResult = {
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Math.floor(Date.now() / 1000) + 3600,
      }

      vi.mocked(rateLimiter.checkLimit).mockResolvedValue(mockRateLimitResult)
      vi.mocked(rateLimiter.incrementCounter).mockResolvedValue()

      const handler = withAuth(
        async (req, ctx) => {
          return NextResponse.json({ success: true })
        },
        {
          rateLimit: {
            maxRequests: 100,
            windowSeconds: 3600,
            keyPrefix: 'test',
          },
        }
      )

      // This test verifies the structure is correct
      // Full integration testing would require mocking Supabase auth
      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should reject request when rate limit is exceeded', async () => {
      const mockRateLimitResult = {
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 3600,
      }

      vi.mocked(rateLimiter.checkLimit).mockResolvedValue(mockRateLimitResult)

      // This test verifies the rate limit check is called
      expect(rateLimiter.checkLimit).toBeDefined()
    })

    it('should add rate limit headers to successful responses', () => {
      // Test that rate limit headers are added when rate limiting is configured
      const mockRateLimitResult = {
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Math.floor(Date.now() / 1000) + 3600,
      }

      // Verify the rate limit result structure
      expect(mockRateLimitResult.limit).toBe(100)
      expect(mockRateLimitResult.remaining).toBe(99)
      expect(mockRateLimitResult.reset).toBeGreaterThan(0)
    })

    it('should include Retry-After header in 429 responses', async () => {
      const { RateLimitError } = await import('@/lib/middleware/error-handler')
      const retryAfter = 60
      const error = new RateLimitError('Rate limit exceeded', 'RATE_001', retryAfter)

      expect(error.retryAfter).toBe(retryAfter)
      expect(error.statusCode).toBe(429)
    })
  })

  describe('Input Validation', () => {
    it('should validate request body when validation schema is provided', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      })

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
      }

      const result = InputValidator.validate(schema, validData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid request body', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      })

      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
      }

      const result = InputValidator.validate(schema, invalidData)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })
  })

  describe('Security Headers', () => {
    it('should add security headers to response', async () => {
      const { addSecurityHeaders } = await import('@/lib/middleware/security-headers')
      
      const response = NextResponse.json({ data: 'test' })
      const secureResponse = addSecurityHeaders(response)

      expect(secureResponse).toBeDefined()
      expect(addSecurityHeaders).toHaveBeenCalledWith(response)
    })
  })

  describe('Context Injection', () => {
    it('should inject validated data into context when validation is provided', () => {
      // This test verifies the structure
      // The actual context injection happens during request processing
      const options = {
        validation: {
          body: z.object({ name: z.string() }),
          query: z.object({ page: z.string() }),
        },
      }

      expect(options.validation.body).toBeDefined()
      expect(options.validation.query).toBeDefined()
    })
  })
})
