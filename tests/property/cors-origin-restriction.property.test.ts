import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest } from 'next/server'

/**
 * Property-Based Tests for CORS Origin Restriction
 * 
 * **Validates: Requirement 8.2**
 * 
 * These tests verify that in production mode, only whitelisted origins
 * receive CORS headers, and non-whitelisted origins are rejected by
 * not including CORS headers in the response. This ensures that
 * cross-origin requests from unauthorized domains are blocked.
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
    const { NextResponse } = await import('next/server')
    return NextResponse.next()
  }),
}))

describe('Feature: security-optimization, Property 29: CORS Origin Restriction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property Test: Non-whitelisted origins should not receive CORS headers in production
   * 
   * This test verifies that in production mode, requests from non-whitelisted
   * origins do not receive CORS headers (Access-Control-Allow-Origin,
   * Access-Control-Allow-Credentials), effectively blocking cross-origin access.
   * 
   * The property being tested: For any non-whitelisted origin in production,
   * the response should not include CORS headers.
   */
  it('should reject non-whitelisted origins by not including CORS headers in production', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate various non-whitelisted origins
          origin: fc.constantFrom(
            'https://malicious.com',
            'https://evil.example.com',
            'http://attacker.net',
            'https://phishing-site.org',
            'https://unauthorized-domain.com',
            'http://random-site.io'
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
          // Set environment for production with specific whitelist
          const originalNodeEnv = process.env.NODE_ENV
          const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
          
          try {
            // Set environment variables
            process.env.NODE_ENV = 'production'
            process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'
            
            // Import middleware (will use current environment)
            const { middleware } = await import('@/middleware')

            // Create a cross-origin request from non-whitelisted origin
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

            // Verify that CORS headers are NOT present for non-whitelisted origins
            const allowOrigin = response.headers.get('Access-Control-Allow-Origin')
            const allowCredentials = response.headers.get('Access-Control-Allow-Credentials')
            
            // Non-whitelisted origins should NOT receive CORS headers
            expect(allowOrigin).toBeNull()
            expect(allowCredentials).toBeNull()
          } finally {
            // Restore original environment
            process.env.NODE_ENV = originalNodeEnv
            if (originalAllowedOrigins !== undefined) {
              process.env.ALLOWED_ORIGINS = originalAllowedOrigins
            } else {
              delete process.env.ALLOWED_ORIGINS
            }
          }
        }
      ),
      { numRuns: 2, timeout: 10000 }
    )
  }, 15000)

  /**
   * Property Test: Whitelisted origins should receive CORS headers in production
   * 
   * This test verifies that in production mode, requests from whitelisted
   * origins DO receive appropriate CORS headers.
   * 
   * The property being tested: For any whitelisted origin in production,
   * the response should include CORS headers.
   */
  it('should allow whitelisted origins by including CORS headers in production', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Use only whitelisted origins
          origin: fc.constantFrom(
            'https://app.example.com',
            'https://admin.example.com'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts'
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        }),
        async ({ origin, path, method }) => {
          // Set environment for production
          const originalNodeEnv = process.env.NODE_ENV
          const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
          
          try {
            process.env.NODE_ENV = 'production'
            process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'
            
            // Import middleware
            const { middleware } = await import('@/middleware')

            // Create request from whitelisted origin
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

            // Verify that CORS headers ARE present for whitelisted origins
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
            expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
          } finally {
            // Restore original environment
            process.env.NODE_ENV = originalNodeEnv
            if (originalAllowedOrigins !== undefined) {
              process.env.ALLOWED_ORIGINS = originalAllowedOrigins
            } else {
              delete process.env.ALLOWED_ORIGINS
            }
          }
        }
      ),
      { numRuns: 2, timeout: 10000 }
    )
  }, 15000)

  /**
   * Property Test: Localhost origins should be rejected in production
   * 
   * This test verifies that localhost origins (commonly used in development)
   * are rejected in production mode by not including CORS headers.
   * 
   * The property being tested: For any localhost origin in production,
   * the response should not include CORS headers.
   */
  it('should reject localhost origins in production', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate various localhost origins
          origin: fc.constantFrom(
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://localhost:8080',
            'http://127.0.0.1:8080'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts'
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT'),
        }),
        async ({ origin, path, method }) => {
          // Set environment for production
          const originalNodeEnv = process.env.NODE_ENV
          const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
          
          try {
            process.env.NODE_ENV = 'production'
            process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'
            
            // Import middleware
            const { middleware } = await import('@/middleware')

            // Create request from localhost origin
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

            // Verify that localhost origins are rejected in production
            expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
            expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
          } finally {
            // Restore original environment
            process.env.NODE_ENV = originalNodeEnv
            if (originalAllowedOrigins !== undefined) {
              process.env.ALLOWED_ORIGINS = originalAllowedOrigins
            } else {
              delete process.env.ALLOWED_ORIGINS
            }
          }
        }
      ),
      { numRuns: 2, timeout: 10000 }
    )
  }, 15000)

  /**
   * Property Test: CORS violations should be logged
   * 
   * This test verifies that when a non-whitelisted origin attempts to
   * make a cross-origin request, the violation is logged for security
   * monitoring purposes.
   * 
   * The property being tested: For any non-whitelisted origin in production,
   * the CORS violation should be logged with appropriate details.
   */
  it('should log CORS violations for non-whitelisted origins', async () => {
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
          method: fc.constantFrom('GET', 'POST'),
        }),
        async ({ origin, path, method }) => {
          // Set environment for production
          const originalNodeEnv = process.env.NODE_ENV
          const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
          
          try {
            process.env.NODE_ENV = 'production'
            process.env.ALLOWED_ORIGINS = 'https://app.example.com'
            
            // Import middleware and mock
            const { RequestLogger } = await import('@/lib/middleware/request-logger')
            const { middleware } = await import('@/middleware')

            // Clear previous calls
            vi.mocked(RequestLogger.logSecurityEvent).mockClear()

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
            await middleware(request)

            // Verify that CORS violation was logged
            expect(RequestLogger.logSecurityEvent).toHaveBeenCalled()
            
            // Get the logged events
            const logCalls = vi.mocked(RequestLogger.logSecurityEvent).mock.calls
            
            // Find a CORS violation log that matches our request
            const corsViolationLog = logCalls.find(call => 
              call[0].details?.event === 'cors_violation' &&
              call[0].details?.path === path &&
              call[0].details?.method === method
            )
            
            // Verify the log contains appropriate details
            expect(corsViolationLog).toBeDefined()
            if (corsViolationLog) {
              expect(corsViolationLog[0].type).toBe('suspicious_activity')
              expect(corsViolationLog[0].details?.reason).toBe('origin_not_whitelisted')
            }
          } finally {
            // Restore original environment
            process.env.NODE_ENV = originalNodeEnv
            if (originalAllowedOrigins !== undefined) {
              process.env.ALLOWED_ORIGINS = originalAllowedOrigins
            } else {
              delete process.env.ALLOWED_ORIGINS
            }
          }
        }
      ),
      { numRuns: 2, timeout: 10000 }
    )
  }, 15000)

  /**
   * Property Test: Preflight requests from non-whitelisted origins should be rejected
   * 
   * This test verifies that preflight OPTIONS requests from non-whitelisted
   * origins are rejected with a 403 status code in production.
   * 
   * The property being tested: For any preflight OPTIONS request from a
   * non-whitelisted origin in production, the response should have a 403
   * status code and no CORS headers.
   */
  it('should reject preflight OPTIONS requests from non-whitelisted origins in production', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          origin: fc.constantFrom(
            'https://malicious.com',
            'https://attacker.net',
            'http://evil.example.com',
            'http://localhost:3000' // localhost should also be rejected in production
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts'
          ),
        }),
        async ({ origin, path }) => {
          // Set environment for production
          const originalNodeEnv = process.env.NODE_ENV
          const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
          
          try {
            process.env.NODE_ENV = 'production'
            process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'
            
            // Import middleware
            const { middleware } = await import('@/middleware')

            // Create preflight OPTIONS request from non-whitelisted origin
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

            // Verify 403 status for rejected preflight
            expect(response.status).toBe(403)

            // Verify no CORS headers are present
            expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
            expect(response.headers.get('Access-Control-Allow-Methods')).toBeNull()
            expect(response.headers.get('Access-Control-Allow-Headers')).toBeNull()
          } finally {
            // Restore original environment
            process.env.NODE_ENV = originalNodeEnv
            if (originalAllowedOrigins !== undefined) {
              process.env.ALLOWED_ORIGINS = originalAllowedOrigins
            } else {
              delete process.env.ALLOWED_ORIGINS
            }
          }
        }
      ),
      { numRuns: 2, timeout: 10000 }
    )
  }, 15000)

  /**
   * Property Test: Empty ALLOWED_ORIGINS should reject all origins in production
   * 
   * This test verifies that when ALLOWED_ORIGINS is empty or not set in
   * production, all cross-origin requests are rejected.
   * 
   * The property being tested: For any origin when ALLOWED_ORIGINS is empty
   * in production, the response should not include CORS headers.
   */
  it('should reject all origins when ALLOWED_ORIGINS is empty in production', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          origin: fc.constantFrom(
            'https://app.example.com',
            'https://admin.example.com',
            'http://localhost:3000'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages'
          ),
          method: fc.constantFrom('GET', 'POST'),
        }),
        async ({ origin, path, method }) => {
          // Set environment for production with empty ALLOWED_ORIGINS
          const originalNodeEnv = process.env.NODE_ENV
          const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
          
          try {
            process.env.NODE_ENV = 'production'
            process.env.ALLOWED_ORIGINS = '' // Empty whitelist
            
            // Import middleware
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

            // Verify that all origins are rejected when whitelist is empty
            expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
            expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
          } finally {
            // Restore original environment
            process.env.NODE_ENV = originalNodeEnv
            if (originalAllowedOrigins !== undefined) {
              process.env.ALLOWED_ORIGINS = originalAllowedOrigins
            } else {
              delete process.env.ALLOWED_ORIGINS
            }
          }
        }
      ),
      { numRuns: 2, timeout: 10000 }
    )
  }, 15000)
})
