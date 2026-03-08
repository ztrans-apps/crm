import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Property-Based Tests for CORS Header Configuration
 * 
 * **Validates: Requirements 8.1, 8.4, 8.5**
 * 
 * These tests verify that the middleware correctly configures CORS headers
 * for cross-origin requests, including Access-Control-Allow-Origin,
 * Access-Control-Allow-Methods, Access-Control-Allow-Headers, and
 * Access-Control-Allow-Credentials.
 */

// Mock request logger
vi.mock('@/lib/middleware/request-logger', () => ({
  RequestLogger: {
    logRequest: vi.fn(),
    logSecurityEvent: vi.fn(),
  },
}))

// Mock Supabase middleware
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(async (request: NextRequest) => {
    return NextResponse.next()
  }),
}))

describe('Feature: security-optimization, Property 28: CORS Header Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  /**
   * Property Test: Allowed origins should receive CORS headers
   * 
   * This test generates various allowed origins and verifies that
   * cross-origin requests from these origins receive appropriate
   * CORS headers including Access-Control-Allow-Origin and
   * Access-Control-Allow-Credentials.
   * 
   * The property being tested: For any allowed origin, when a cross-origin
   * request is made, the response should include appropriate CORS headers.
   */
  it('should include CORS headers for allowed origins', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate allowed origins based on environment
          origin: fc.oneof(
            // Development origins
            fc.constantFrom(
              'http://localhost:3000',
              'http://localhost:3001',
              'http://127.0.0.1:3000',
              'http://127.0.0.1:3001'
            ),
            // Production origins (if ALLOWED_ORIGINS is set)
            fc.constant('https://app.example.com')
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts',
            '/api/conversations',
            '/api/users'
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
        }),
        async ({ origin, path, method }) => {
          // Set environment for development (allows localhost)
          process.env.NODE_ENV = 'development'
          
          // Re-import middleware to pick up environment changes
          vi.resetModules()
          const { middleware } = await import('@/middleware')

          // Create a cross-origin request
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({
                'origin': origin,
                'content-type': 'application/json',
              }),
            }
          )

          // Execute middleware
          const response = await middleware(request)

          // Verify CORS headers are present for allowed origins
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            // Development origins should always be allowed
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
            expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Preflight OPTIONS requests should include additional headers
   * 
   * This test verifies that preflight OPTIONS requests receive additional
   * CORS headers including Access-Control-Allow-Methods,
   * Access-Control-Allow-Headers, and Access-Control-Max-Age.
   * 
   * The property being tested: For any preflight OPTIONS request from an
   * allowed origin, the response should include all required CORS headers
   * for preflight handling.
   */
  it('should include additional CORS headers for preflight OPTIONS requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          origin: fc.constantFrom(
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts'
          ),
        }),
        async ({ origin, path }) => {
          // Set environment for development
          process.env.NODE_ENV = 'development'
          
          // Re-import middleware
          vi.resetModules()
          const { middleware } = await import('@/middleware')

          // Create a preflight OPTIONS request
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method: 'OPTIONS',
              headers: new Headers({
                'origin': origin,
                'access-control-request-method': 'POST',
                'access-control-request-headers': 'content-type,authorization',
              }),
            }
          )

          // Execute middleware
          const response = await middleware(request)

          // Verify preflight response
          expect(response.status).toBe(200)

          // Verify basic CORS headers
          expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
          expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')

          // Verify preflight-specific headers
          const allowedMethods = response.headers.get('Access-Control-Allow-Methods')
          expect(allowedMethods).toBeDefined()
          expect(allowedMethods).toContain('GET')
          expect(allowedMethods).toContain('POST')
          expect(allowedMethods).toContain('PUT')
          expect(allowedMethods).toContain('DELETE')
          expect(allowedMethods).toContain('PATCH')
          expect(allowedMethods).toContain('OPTIONS')

          const allowedHeaders = response.headers.get('Access-Control-Allow-Headers')
          expect(allowedHeaders).toBeDefined()
          expect(allowedHeaders).toContain('Content-Type')
          expect(allowedHeaders).toContain('Authorization')

          const maxAge = response.headers.get('Access-Control-Max-Age')
          expect(maxAge).toBeDefined()
          expect(maxAge).toBe('86400') // 24 hours
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: CORS headers should match request origin
   * 
   * This test verifies that the Access-Control-Allow-Origin header
   * matches the exact origin from the request (not a wildcard),
   * which is required when using credentials.
   * 
   * The property being tested: For any allowed origin, the
   * Access-Control-Allow-Origin header should match the request origin
   * exactly (not use wildcard '*').
   */
  it('should set Access-Control-Allow-Origin to match request origin exactly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          origin: fc.constantFrom(
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages'
          ),
          method: fc.constantFrom('GET', 'POST'),
        }),
        async ({ origin, path, method }) => {
          // Set environment for development
          process.env.NODE_ENV = 'development'
          
          // Re-import middleware
          vi.resetModules()
          const { middleware } = await import('@/middleware')

          // Create request
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({
                'origin': origin,
                'content-type': 'application/json',
              }),
            }
          )

          // Execute middleware
          const response = await middleware(request)

          // Verify that Access-Control-Allow-Origin matches the request origin exactly
          const allowOrigin = response.headers.get('Access-Control-Allow-Origin')
          expect(allowOrigin).toBe(origin)
          expect(allowOrigin).not.toBe('*') // Should not use wildcard when credentials are allowed
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Non-whitelisted origins should not receive CORS headers
   * 
   * This test verifies that requests from non-whitelisted origins
   * do not receive CORS headers, effectively blocking cross-origin access.
   * 
   * The property being tested: For any non-whitelisted origin, the
   * response should not include CORS headers.
   */
  it('should not include CORS headers for non-whitelisted origins', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          origin: fc.constantFrom(
            'https://malicious.com',
            'https://evil.example.com',
            'http://attacker.net',
            'https://phishing-site.org'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts'
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT'),
        }),
        async ({ origin, path, method }) => {
          // Set environment for production (stricter origin checking)
          process.env.NODE_ENV = 'production'
          process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'
          
          // Re-import middleware
          vi.resetModules()
          const { middleware } = await import('@/middleware')

          // Create request from non-whitelisted origin
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({
                'origin': origin,
                'content-type': 'application/json',
              }),
            }
          )

          // Execute middleware
          const response = await middleware(request)

          // Verify that CORS headers are NOT present
          expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
          expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Same-origin requests should not include CORS headers
   * 
   * This test verifies that same-origin requests (no Origin header)
   * do not receive CORS headers, as they are not needed.
   * 
   * The property being tested: For any request without an Origin header,
   * the response should not include CORS headers.
   */
  it('should not include CORS headers for same-origin requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts'
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        }),
        async ({ path, method }) => {
          // Set environment for development
          process.env.NODE_ENV = 'development'
          
          // Re-import middleware
          vi.resetModules()
          const { middleware } = await import('@/middleware')

          // Create same-origin request (no Origin header)
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({
                'content-type': 'application/json',
              }),
            }
          )

          // Execute middleware
          const response = await middleware(request)

          // Verify that CORS headers are NOT present for same-origin requests
          expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: CORS headers should be consistent across HTTP methods
   * 
   * This test verifies that CORS headers are consistently applied
   * across different HTTP methods for the same origin.
   * 
   * The property being tested: For any allowed origin, CORS headers
   * should be consistent regardless of the HTTP method used.
   */
  it('should apply CORS headers consistently across HTTP methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          origin: fc.constant('http://localhost:3000'),
          path: fc.constant('/api/contacts'),
          methods: fc.constant(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
        }),
        async ({ origin, path, methods }) => {
          // Set environment for development
          process.env.NODE_ENV = 'development'
          
          // Re-import middleware
          vi.resetModules()
          const { middleware } = await import('@/middleware')

          const responses: NextResponse[] = []

          // Test each HTTP method
          for (const method of methods) {
            const request = new NextRequest(
              new URL(path, 'http://localhost:3000'),
              {
                method,
                headers: new Headers({
                  'origin': origin,
                  'content-type': 'application/json',
                }),
              }
            )

            const response = await middleware(request)
            responses.push(response)
          }

          // Verify all responses have the same CORS headers
          const firstAllowOrigin = responses[0].headers.get('Access-Control-Allow-Origin')
          const firstAllowCredentials = responses[0].headers.get('Access-Control-Allow-Credentials')

          for (const response of responses) {
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe(firstAllowOrigin)
            expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(firstAllowCredentials)
          }

          // Verify the headers are correct
          expect(firstAllowOrigin).toBe(origin)
          expect(firstAllowCredentials).toBe('true')
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Preflight requests should return 200 status
   * 
   * This test verifies that preflight OPTIONS requests from allowed
   * origins return a 200 status code without executing endpoint logic.
   * 
   * The property being tested: For any preflight OPTIONS request from
   * an allowed origin, the response should have a 200 status code.
   */
  it('should return 200 status for preflight OPTIONS requests from allowed origins', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          origin: fc.constantFrom(
            'http://localhost:3000',
            'http://127.0.0.1:3000'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts',
            '/api/conversations'
          ),
        }),
        async ({ origin, path }) => {
          // Set environment for development
          process.env.NODE_ENV = 'development'
          
          // Re-import middleware
          vi.resetModules()
          const { middleware } = await import('@/middleware')

          // Create preflight OPTIONS request
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method: 'OPTIONS',
              headers: new Headers({
                'origin': origin,
                'access-control-request-method': 'POST',
              }),
            }
          )

          // Execute middleware
          const response = await middleware(request)

          // Verify 200 status for preflight
          expect(response.status).toBe(200)

          // Verify CORS headers are present
          expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
          expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Preflight requests from non-whitelisted origins should be rejected
   * 
   * This test verifies that preflight OPTIONS requests from non-whitelisted
   * origins are rejected with a 403 status code.
   * 
   * The property being tested: For any preflight OPTIONS request from a
   * non-whitelisted origin, the response should have a 403 status code.
   */
  it('should reject preflight OPTIONS requests from non-whitelisted origins with 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          origin: fc.constantFrom(
            'https://malicious.com',
            'https://attacker.net',
            'http://evil.example.com'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages'
          ),
        }),
        async ({ origin, path }) => {
          // Set environment for production
          process.env.NODE_ENV = 'production'
          process.env.ALLOWED_ORIGINS = 'https://app.example.com'
          
          // Re-import middleware
          vi.resetModules()
          const { middleware } = await import('@/middleware')

          // Create preflight OPTIONS request from non-whitelisted origin
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method: 'OPTIONS',
              headers: new Headers({
                'origin': origin,
                'access-control-request-method': 'POST',
              }),
            }
          )

          // Execute middleware
          const response = await middleware(request)

          // Verify 403 status for rejected preflight
          expect(response.status).toBe(403)

          // Verify no CORS headers are present
          expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
        }
      ),
      { numRuns: 2 }
    )
  })
})
