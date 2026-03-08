import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import type { AuthContext } from '@/lib/middleware/types'

/**
 * Property-Based Tests for Permission-Based Authorization
 * 
 * **Validates: Requirements 2.5, 2.9**
 * 
 * These tests verify that the withAuth middleware correctly rejects
 * requests from users without required permissions with a 403 status code,
 * and that authorization failures are logged for security monitoring.
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
    handle: vi.fn((error: any, requestId: string) => {
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

describe('Feature: security-optimization, Property 8: Permission-Based Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property Test: Users without required permissions should be rejected with 403
   * 
   * This test generates random permission requirements and verifies that
   * authenticated users without the required permissions are rejected
   * with a 403 Forbidden status code.
   * 
   * The property being tested: For any protected endpoint requiring specific
   * permissions, when an authenticated user without the required permission
   * attempts access, the system should return 403.
   */
  it('should reject requests without required permissions with 403 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate various permission requirements
          requiredPermission: fc.constantFrom(
            'contact.create',
            'contact.update',
            'contact.delete',
            'message.send',
            'message.view',
            'broadcast.create',
            'broadcast.send',
            'analytics.view',
            'user.manage',
            'settings.update'
          ),
          // Generate API endpoint paths
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts',
            '/api/analytics',
            '/api/settings'
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          // Generate user data (authenticated but without permissions)
          userId: fc.uuid(),
          tenantId: fc.uuid(),
        }),
        async ({ requiredPermission, path, method, userId, tenantId }) => {
          // Mock Supabase client to return authenticated user
          const { createClient } = await import('@/lib/supabase/server')
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { 
                  user: { 
                    id: userId, 
                    email: 'test@example.com' 
                  } 
                },
                error: null,
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'profiles') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: userId,
                      tenant_id: tenantId,
                      role: 'user',
                      full_name: 'Test User',
                    },
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          // Mock service role client to return no permissions for the user
          const { createClient: createServiceRoleClient } = await import('@supabase/supabase-js')
          const mockServiceClient = {
            from: vi.fn((table: string) => {
              if (table === 'user_roles') {
                // Return empty permissions (user has no permissions)
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockResolvedValue({
                    data: [], // No roles/permissions
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createServiceRoleClient).mockReturnValue(mockServiceClient as any)

          // Create a protected handler with permission requirement
          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              // This should never be reached for unauthorized requests
              return NextResponse.json({ success: true })
            },
            { permission: requiredPermission }
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

          // Verify that the response is 403 Forbidden
          expect(response.status).toBe(403)

          // Verify that the response body contains an error message
          const body = await response.json()
          expect(body).toHaveProperty('error')
          expect(body.error).toBe('Forbidden')
          expect(body).toHaveProperty('message')
          expect(body.message).toContain(requiredPermission)

          // Verify that the handler was never called (authorization failed before reaching handler)
          // This is implicit - if we got 403, the handler wasn't executed
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Users with required permissions should be allowed access
   * 
   * This test verifies that authenticated users WITH the required permissions
   * are allowed to access protected endpoints (positive test case).
   */
  it('should allow requests with required permissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requiredPermission: fc.constantFrom(
            'contact.view',
            'message.view',
            'broadcast.view'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts'
          ),
          method: fc.constantFrom('GET', 'POST'),
          userId: fc.uuid(),
          tenantId: fc.uuid(),
        }),
        async ({ requiredPermission, path, method, userId, tenantId }) => {
          // Mock Supabase client to return authenticated user
          const { createClient } = await import('@/lib/supabase/server')
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { 
                  user: { 
                    id: userId, 
                    email: 'test@example.com' 
                  } 
                },
                error: null,
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'profiles') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: userId,
                      tenant_id: tenantId,
                      role: 'user',
                      full_name: 'Test User',
                    },
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          // Mock service role client to return the required permission
          const { createClient: createServiceRoleClient } = await import('@supabase/supabase-js')
          const mockServiceClient = {
            from: vi.fn((table: string) => {
              if (table === 'user_roles') {
                // Return the required permission
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        role_id: 'role-1',
                        roles: {
                          role_permissions: [
                            {
                              permissions: {
                                permission_key: requiredPermission,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createServiceRoleClient).mockReturnValue(mockServiceClient as any)

          // Create a protected handler with permission requirement
          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true, data: 'protected resource' })
            },
            { permission: requiredPermission }
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

          // Verify that the response is 200 OK (or other success status)
          expect(response.status).toBeLessThan(400)

          // Verify that the handler was called successfully
          const body = await response.json()
          expect(body).toHaveProperty('success')
          expect(body.success).toBe(true)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Authorization failures should be logged
   * 
   * Tests that authorization failures (403 responses) are logged for
   * security monitoring. This verifies Requirement 2.9 (log authorization failures).
   */
  it('should log authorization failures for security monitoring', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requiredPermission: fc.constantFrom(
            'contact.delete',
            'message.send',
            'broadcast.send'
          ),
          path: fc.constantFrom(
            '/api/contacts',
            '/api/messages',
            '/api/broadcasts'
          ),
          method: fc.constantFrom('POST', 'DELETE'),
          userId: fc.uuid(),
          tenantId: fc.uuid(),
        }),
        async ({ requiredPermission, path, method, userId, tenantId }) => {
          // Clear mocks before each property test run
          vi.clearAllMocks()
          
          // Mock Supabase client to return authenticated user
          const { createClient } = await import('@/lib/supabase/server')
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { 
                  user: { 
                    id: userId, 
                    email: 'test@example.com' 
                  } 
                },
                error: null,
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'profiles') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: userId,
                      tenant_id: tenantId,
                      role: 'user',
                      full_name: 'Test User',
                    },
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          // Mock service role client to return no permissions
          const { createClient: createServiceRoleClient } = await import('@supabase/supabase-js')
          const mockServiceClient = {
            from: vi.fn((table: string) => {
              if (table === 'user_roles') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockResolvedValue({
                    data: [], // No permissions
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createServiceRoleClient).mockReturnValue(mockServiceClient as any)

          // Get the mocked RequestLogger
          const { RequestLogger } = await import('@/lib/middleware/request-logger')

          // Create protected handler
          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ data: 'protected' })
            },
            { permission: requiredPermission }
          )

          // Create request
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({
                'content-type': 'application/json',
              }),
            }
          )

          // Execute handler
          await protectedHandler(request)

          // Verify that security event was logged
          expect(RequestLogger.logSecurityEvent).toHaveBeenCalled()

          // Verify the logged event contains authorization failure details
          const logCalls = vi.mocked(RequestLogger.logSecurityEvent).mock.calls
          const authzFailureLog = logCalls.find(call => 
            call[0].type === 'authz_failure' &&
            call[0].userId === userId &&
            call[0].tenantId === tenantId
          )

          expect(authzFailureLog).toBeDefined()
          if (authzFailureLog) {
            expect(authzFailureLog[0]).toMatchObject({
              type: 'authz_failure',
              userId: userId,
              tenantId: tenantId,
              ip: expect.any(String),
              details: expect.objectContaining({
                endpoint: path,
                requiredPermission: requiredPermission,
              }),
              timestamp: expect.any(String),
            })
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Multiple permission requirements (anyPermission)
   * 
   * Tests that when multiple permissions are specified with anyPermission,
   * users without ANY of the required permissions are rejected with 403.
   */
  it('should reject requests when user lacks all permissions in anyPermission list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requiredPermissions: fc.constant(['analytics.view', 'analytics.view.all']),
          path: fc.constant('/api/analytics'),
          method: fc.constantFrom('GET', 'POST'),
          userId: fc.uuid(),
          tenantId: fc.uuid(),
        }),
        async ({ requiredPermissions, path, method, userId, tenantId }) => {
          // Mock Supabase client to return authenticated user
          const { createClient } = await import('@/lib/supabase/server')
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { 
                  user: { 
                    id: userId, 
                    email: 'test@example.com' 
                  } 
                },
                error: null,
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'profiles') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: userId,
                      tenant_id: tenantId,
                      role: 'user',
                      full_name: 'Test User',
                    },
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          // Mock service role client to return no permissions
          const { createClient: createServiceRoleClient } = await import('@supabase/supabase-js')
          const mockServiceClient = {
            from: vi.fn((table: string) => {
              if (table === 'user_roles') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockResolvedValue({
                    data: [], // No permissions
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createServiceRoleClient).mockReturnValue(mockServiceClient as any)

          // Create protected handler with anyPermission requirement
          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            },
            { anyPermission: requiredPermissions }
          )

          // Create request
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({
                'content-type': 'application/json',
              }),
            }
          )

          // Execute handler
          const response = await protectedHandler(request)

          // Verify 403 response
          expect(response.status).toBe(403)

          // Verify error message mentions the required permissions
          const body = await response.json()
          expect(body).toHaveProperty('error')
          expect(body.error).toBe('Forbidden')
          expect(body.message).toContain('analytics.view')
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Role-based authorization
   * 
   * Tests that when specific roles are required, users without those roles
   * are rejected with 403.
   */
  it('should reject requests when user lacks required role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requiredRoles: fc.constant(['admin', 'owner']),
          path: fc.constant('/api/settings'),
          method: fc.constantFrom('PUT', 'DELETE'),
          userId: fc.uuid(),
          tenantId: fc.uuid(),
        }),
        async ({ requiredRoles, path, method, userId, tenantId }) => {
          // Mock Supabase client to return authenticated user
          const { createClient } = await import('@/lib/supabase/server')
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: { 
                  user: { 
                    id: userId, 
                    email: 'test@example.com' 
                  } 
                },
                error: null,
              }),
            },
            from: vi.fn((table: string) => {
              if (table === 'profiles') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: userId,
                      tenant_id: tenantId,
                      role: 'user', // Regular user, not admin/owner
                      full_name: 'Test User',
                    },
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          // Mock service role client to return user role (not admin/owner)
          const { createClient: createServiceRoleClient } = await import('@supabase/supabase-js')
          const mockServiceClient = {
            from: vi.fn((table: string) => {
              if (table === 'user_roles') {
                return {
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        role_id: 'role-1',
                        roles: {
                          role_name: 'user', // Not admin or owner
                        },
                      },
                    ],
                    error: null,
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
              }
            }),
          }
          vi.mocked(createServiceRoleClient).mockReturnValue(mockServiceClient as any)

          // Create protected handler with role requirement
          const protectedHandler = withAuth(
            async (req: NextRequest, ctx: AuthContext) => {
              return NextResponse.json({ success: true })
            },
            { roles: requiredRoles }
          )

          // Create request
          const request = new NextRequest(
            new URL(path, 'http://localhost:3000'),
            {
              method,
              headers: new Headers({
                'content-type': 'application/json',
              }),
            }
          )

          // Execute handler
          const response = await protectedHandler(request)

          // Verify 403 response
          expect(response.status).toBe(403)

          // Verify error message mentions the required roles
          const body = await response.json()
          expect(body).toHaveProperty('error')
          expect(body.error).toBe('Forbidden')
          expect(body.message).toContain('admin')
        }
      ),
      { numRuns: 2 }
    )
  })
})
