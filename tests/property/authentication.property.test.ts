import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import type { AuthContext } from '@/lib/middleware/types'
import { createClient } from '@/lib/supabase/server'
import { RequestLogger } from '@/lib/middleware/request-logger'

/**
 * Property-Based Tests for Authentication Requirement
 * 
 * **Validates: Requirements 2.1**
 * 
 * These tests verify that the withAuth middleware correctly rejects
 * unauthenticated requests to protected endpoints with a 401 status code.
 */

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Supabase JS client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Mock rate limiter
vi.mock('@/lib/middleware/rate-limiter', () => ({
  rateLimiter: {
    checkLimit: vi.fn().mockResolvedValue({ allowed: true, limit: 100, remaining: 99, reset: Date.now() + 3600 }),
    incrementCounter: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock request logger
vi.mock('@/lib/middleware/request-logger', () => ({
  RequestLogger: {
    logRequest: vi.fn(),
    logSecurityEvent: vi.fn(),
  },
}))

// Mock error handler
vi.mock('@/lib/middleware/error-handler', () => ({
  ErrorHandler: {
    handle: vi.fn((error: any) => {
      return NextResponse.json(
        { error: error.message || 'Internal Server Error' },
        { status: error.statusCode || 500 }
      )
    }),
    logError: vi.fn(),
  },
  RateLimitError: class RateLimitError extends Error {
    constructor(message: string, public code: string, public retryAfter: number) {
      super(message)
      this.name = 'RateLimitError'
    }
    statusCode = 429
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string, public code: string) {
      super(message)
      this.name = 'ValidationError'
    }
    statusCode = 400
  },
}))

// Mock security headers
vi.mock('@/lib/middleware/security-headers', () => ({
  addSecurityHeaders: vi.fn((response: NextResponse) => response),
}))

describe('Feature: security-optimization, Property 6: Authentication Requirement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set up default mock implementation for createClient
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'No user found' },
        }),
      },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  /**
   * Property Test: Unauthenticated requests should be rejected with 401
   * 
   * This test generates random API endpoint paths and HTTP methods,
   * then verifies that requests without valid authentication are rejected
   * with a 401 status code.
   * 
   * The property being tested: For any protected endpoint, when a request
   * is made without valid authentication, the system should return 401.
   */
  it('should reject unauthenticated requests to protected endpoints with 401 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts',
            '/api/conversations',
            '/api/users'
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        }),
        async ({ path, method }) => {
          // Create a protected handler
          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            }
          )

          // Create a mock request
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({
                'content-type': 'application/json',
              }),
            }
          )

          // Execute the handler
          const response = await protectedHandler(request)

          // Verify 401 status
          expect(response.status).toBe(401)

          // Verify error message
          const body = await response.json()
          expect(body).toHaveProperty('error')
          expect(body.error).toBe('Unauthorized')
        }
      ),
      { numRuns: 5 }
    )
  })

  /**
   * Property Test: Missing authentication token should be rejected
   */
  it('should reject requests with missing authentication token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          path: fc.constantFrom('/api/contacts', '/api/messages', '/api/broadcasts'),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        }),
        async ({ path, method }) => {
          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ data: 'protected' })
            }
          )

          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({ 'content-type': 'application/json' }),
            }
          )

          const response = await protectedHandler(request)

          expect(response.status).toBe(401)
          const body = await response.json()
          expect(body.error).toBe('Unauthorized')
        }
      ),
      { numRuns: 5 }
    )
  })

  /**
   * Property Test: Expired authentication should be rejected
   */
  it('should reject requests with expired authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          path: fc.constantFrom('/api/contacts', '/api/messages', '/api/broadcasts'),
          method: fc.constantFrom('GET', 'POST'),
        }),
        async ({ path, method }) => {
          // Mock expired session
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: null },
                error: { message: 'Session expired' },
              }),
            },
            from: vi.fn(),
          }
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ data: 'protected' })
            }
          )

          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({ 'content-type': 'application/json' }),
            }
          )

          const response = await protectedHandler(request)

          expect(response.status).toBe(401)
          const body = await response.json()
          expect(body.error).toBe('Unauthorized')
        }
      ),
      { numRuns: 5 }
    )
  })

  /**
   * Property Test: Invalid authentication token should be rejected
   */
  it('should reject requests with invalid authentication token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          path: fc.constantFrom('/api/contacts', '/api/messages', '/api/broadcasts'),
          method: fc.constantFrom('GET', 'POST', 'PUT'),
          invalidToken: fc.oneof(
            fc.constant('invalid-token'),
            fc.constant(''),
            fc.constant('Bearer '),
          ),
        }),
        async ({ path, method }) => {
          // Mock invalid token
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: null },
                error: { message: 'Invalid token' },
              }),
            },
            from: vi.fn(),
          }
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ data: 'protected' })
            }
          )

          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({ 'content-type': 'application/json' }),
            }
          )

          const response = await protectedHandler(request)

          expect(response.status).toBe(401)
          const body = await response.json()
          expect(body.error).toBe('Unauthorized')
        }
      ),
      { numRuns: 5 }
    )
  })

  /**
   * Property Test: Authentication failure should be logged
   */
  it('should log authentication failures for security monitoring', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          path: fc.constantFrom('/api/contacts', '/api/messages'),
          method: fc.constantFrom('GET', 'POST'),
        }),
        async ({ path, method }) => {
          // Clear mocks before each property test iteration
          vi.clearAllMocks()
          
          // Set up mock for this iteration
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { user: null },
                error: { message: 'No user found' },
              }),
            },
            from: vi.fn(),
          }
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ data: 'protected' })
            }
          )

          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({ 'content-type': 'application/json' }),
            }
          )

          await protectedHandler(request)

          // Verify that security event was logged
          expect(RequestLogger.logSecurityEvent).toHaveBeenCalled()

          // Verify the logged event contains authentication failure details
          const logCalls = vi.mocked(RequestLogger.logSecurityEvent).mock.calls
          const authFailureLog = logCalls.find(call => call[0].type === 'auth_failure')

          expect(authFailureLog).toBeDefined()
          if (authFailureLog) {
            expect(authFailureLog[0]).toMatchObject({
              type: 'auth_failure',
              ip: expect.any(String),
              details: expect.objectContaining({
                endpoint: path,
              }),
              timestamp: expect.any(String),
            })
          }
        }
      ),
      { numRuns: 5 }
    )
  })
})
