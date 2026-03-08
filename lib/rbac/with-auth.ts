/**
 * Centralized Auth + RBAC wrapper for API routes
 * 
 * Eliminates duplicated auth boilerplate across all API routes.
 * Provides auth, permission checking, and tenant resolution in one place.
 * 
 * @example
 * // Basic auth only (any authenticated user)
 * export const GET = withAuth(async (req, ctx) => {
 *   const data = await ctx.supabase.from('contacts').select('*').eq('tenant_id', ctx.tenantId)
 *   return NextResponse.json(data)
 * })
 * 
 * @example
 * // With permission check
 * export const POST = withAuth(async (req, ctx) => {
 *   // ...
 * }, { permission: 'contact.create' })
 * 
 * @example
 * // With any-of permission check
 * export const GET = withAuth(async (req, ctx) => {
 *   // ...
 * }, { anyPermission: ['analytics.view', 'analytics.view.all'] })
 * 
 * @example
 * // Admin only (role-based)
 * export const POST = withAuth(async (req, ctx) => {
 *   // ...
 * }, { roles: ['owner', 'admin'] })
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { rateLimiter } from '@/lib/middleware/rate-limiter'
import { InputValidator } from '@/lib/middleware/input-validator'
import { ErrorHandler, RateLimitError, ValidationError, AuthenticationError, AuthorizationError } from '@/lib/middleware/error-handler'
import { RequestLogger } from '@/lib/middleware/request-logger'
import { addSecurityHeaders } from '@/lib/middleware/security-headers'
import type { WithAuthOptions, AuthContext } from '@/lib/middleware/types'
import { randomBytes } from 'crypto'
import { APIKeyManager } from '@/lib/security/api-key-manager'
import { PerformanceMonitor } from '@/lib/monitoring/performance-monitor'

// Create singleton instance of API key manager
const apiKeyManager = new APIKeyManager()

// Create singleton instance of performance monitor
const performanceMonitor = PerformanceMonitor.getInstance()

// Re-export types for backward compatibility
export type { AuthContext, WithAuthOptions }

type AuthHandler = (
  request: NextRequest,
  ctx: AuthContext,
  params?: any
) => Promise<NextResponse> | NextResponse

/**
 * Wrap an API route handler with auth + RBAC + rate limiting + validation
 * 
 * Enhanced middleware that provides:
 * - Authentication and authorization (RBAC)
 * - Rate limiting (Redis-based with fallback)
 * - Input validation (Zod schemas)
 * - Request logging
 * - Error handling and sanitization
 * - Security headers
 * 
 * Requirements: 2.1, 2.2, 2.5, 2.6, 2.7
 */
export function withAuth(handler: AuthHandler, options?: WithAuthOptions) {
  return async (request: NextRequest, routeContext?: any) => {
    const startTime = Date.now()
    const requestId = randomBytes(16).toString('hex')
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Track concurrent requests
    performanceMonitor.incrementConcurrentRequests()
    
    // Declare rateLimitResult outside try block so it's accessible in catch
    let rateLimitResult: any = null
    let tenantId: string = ''
    let userId: string | undefined
    
    try {
      const supabase = await createClient()

      // Check for API key authentication first
      const authHeader = request.headers.get('authorization')
      let isAPIKeyAuth = false
      let apiKeyData: any = null
      
      if (authHeader?.startsWith('Bearer sk_')) {
        // API key authentication
        const apiKey = authHeader.replace('Bearer ', '')
        const validationResult = await apiKeyManager.validateAPIKey(apiKey)
        
        if (!validationResult.valid) {
          // Log authentication failure
          RequestLogger.logSecurityEvent({
            type: 'auth_failure',
            ip,
            details: {
              endpoint: request.nextUrl.pathname,
              authType: 'api_key',
              reason: validationResult.reason,
            },
            timestamp: new Date().toISOString(),
          })
          
          throw new AuthenticationError(
            `Invalid API key: ${validationResult.reason}`,
            'AUTH_002'
          )
        }
        
        apiKeyData = validationResult.keyData
        isAPIKeyAuth = true
        
        // Check IP whitelist
        if (apiKeyData.ip_whitelist && apiKeyData.ip_whitelist.length > 0) {
          if (!apiKeyManager.isIPWhitelisted(ip, apiKeyData.ip_whitelist)) {
            RequestLogger.logSecurityEvent({
              type: 'auth_failure',
              tenantId: apiKeyData.tenant_id,
              ip,
              details: {
                endpoint: request.nextUrl.pathname,
                authType: 'api_key',
                reason: 'IP not whitelisted',
                whitelist: apiKeyData.ip_whitelist,
              },
              timestamp: new Date().toISOString(),
            })
            
            throw new AuthorizationError(
              'IP address not whitelisted for this API key',
              'AUTHZ_003'
            )
          }
        }
        
        // Log API key usage
        RequestLogger.logSecurityEvent({
          type: 'api_key_usage',
          tenantId: apiKeyData.tenant_id,
          ip,
          details: {
            endpoint: request.nextUrl.pathname,
            keyId: apiKeyData.id,
            keyName: apiKeyData.name,
          },
          timestamp: new Date().toISOString(),
        })
      }

      // 2. Auth check (skip if API key auth)
      let user: any = null
      let profile: any = null
      
      if (isAPIKeyAuth) {
        // For API key auth, create a synthetic user context
        user = {
          id: apiKeyData.id, // Use API key ID as user ID
          email: `api-key-${apiKeyData.id}@system`,
        }
        profile = {
          id: apiKeyData.id,
          tenant_id: apiKeyData.tenant_id,
          role: 'api_key',
        }
      } else {
        // Regular session-based authentication
        const { data: { user: sessionUser }, error: userError } = await supabase.auth.getUser()
        if (userError || !sessionUser) {
          // Log authentication failure
          RequestLogger.logSecurityEvent({
            type: 'auth_failure',
            ip,
            details: {
              endpoint: request.nextUrl.pathname,
              error: userError?.message || 'No user found',
            },
            timestamp: new Date().toISOString(),
          })
          
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        user = sessionUser

        // 3. Get profile (always needed for tenant_id and role)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, tenant_id, role, full_name')
          .eq('id', user.id)
          .single()

        if (!profileData && !options?.skipTenant) {
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }
        
        profile = profileData
      }

      const tenantId = profile?.tenant_id || 
        process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || 
        '00000000-0000-0000-0000-000000000001'
      
      // Capture userId for performance tracking
      userId = user.id

      // Create service client early — needed for reliable permission checks
      const serviceClient = createServiceRoleClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      // 4. Rate limiting check (after authentication, using tenant ID)
      if (options?.rateLimit) {
        rateLimitResult = await rateLimiter.checkLimit({
          maxRequests: options.rateLimit.maxRequests,
          windowSeconds: options.rateLimit.windowSeconds,
          keyPrefix: options.rateLimit.keyPrefix || request.nextUrl.pathname,
          identifier: tenantId, // Use tenantId for authenticated requests
        })
        
        if (!rateLimitResult.allowed) {
          // Log rate limit violation
          RequestLogger.logSecurityEvent({
            type: 'rate_limit',
            userId: user.id,
            tenantId,
            ip,
            details: {
              endpoint: request.nextUrl.pathname,
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              reset: rateLimitResult.reset,
            },
            timestamp: new Date().toISOString(),
          })
          
          throw new RateLimitError(
            'Rate limit exceeded. Please try again later.',
            'RATE_001',
            rateLimitResult.reset - Math.floor(Date.now() / 1000)
          )
        }
        
        // Increment counter after successful check
        await rateLimiter.incrementCounter({
          maxRequests: options.rateLimit.maxRequests,
          windowSeconds: options.rateLimit.windowSeconds,
          keyPrefix: options.rateLimit.keyPrefix || request.nextUrl.pathname,
          identifier: tenantId,
        })
      }

      // 5. Check permissions from middleware header (set by middleware.ts)
      const headerPermission = request.headers.get('X-Required-Permission')
      const permissionMode = request.headers.get('X-Permission-Mode')

      if (headerPermission) {
        const permissions = headerPermission.split(',')
        if (permissionMode === 'any') {
          const allowed = await checkUserAnyPermission(serviceClient, user.id, permissions)
          if (!allowed) {
            // Log authorization failure
            RequestLogger.logSecurityEvent({
              type: 'authz_failure',
              userId: user.id,
              tenantId,
              ip,
              details: {
                endpoint: request.nextUrl.pathname,
                requiredPermissions: permissions,
                mode: 'any',
              },
              timestamp: new Date().toISOString(),
            })
            
            return NextResponse.json(
              { error: 'Forbidden', message: `One of these permissions required: ${headerPermission}` },
              { status: 403 }
            )
          }
        } else {
          const allowed = await checkUserPermission(serviceClient, user.id, permissions[0])
          if (!allowed) {
            // Log authorization failure
            RequestLogger.logSecurityEvent({
              type: 'authz_failure',
              userId: user.id,
              tenantId,
              ip,
              details: {
                endpoint: request.nextUrl.pathname,
                requiredPermission: permissions[0],
              },
              timestamp: new Date().toISOString(),
            })
            
            return NextResponse.json(
              { error: 'Forbidden', message: `Permission '${permissions[0]}' required` },
              { status: 403 }
            )
          }
        }
      }

      // 6. Check permissions from options (handler-level override)
      if (options?.permission) {
        // For API keys, check scopes instead of permissions
        if (isAPIKeyAuth) {
          if (!apiKeyManager.hasScope(apiKeyData, options.permission)) {
            RequestLogger.logSecurityEvent({
              type: 'authz_failure',
              tenantId,
              ip,
              details: {
                endpoint: request.nextUrl.pathname,
                authType: 'api_key',
                requiredScope: options.permission,
                availableScopes: apiKeyData.scopes,
              },
              timestamp: new Date().toISOString(),
            })
            
            throw new AuthorizationError(
              `API key does not have required scope: ${options.permission}`,
              'AUTHZ_002'
            )
          }
        } else {
          const allowed = await checkUserPermission(serviceClient, user.id, options.permission)
          if (!allowed) {
            // Log authorization failure
            RequestLogger.logSecurityEvent({
              type: 'authz_failure',
              userId: user.id,
              tenantId,
              ip,
              details: {
                endpoint: request.nextUrl.pathname,
                requiredPermission: options.permission,
              },
              timestamp: new Date().toISOString(),
            })
            
            return NextResponse.json(
              { error: 'Forbidden', message: `Permission '${options.permission}' required` },
              { status: 403 }
            )
          }
        }
      }

      if (options?.anyPermission) {
        // For API keys, check if any of the scopes match
        if (isAPIKeyAuth) {
          const hasAnyScope = options.anyPermission.some(scope => 
            apiKeyManager.hasScope(apiKeyData, scope)
          )
          
          if (!hasAnyScope) {
            RequestLogger.logSecurityEvent({
              type: 'authz_failure',
              tenantId,
              ip,
              details: {
                endpoint: request.nextUrl.pathname,
                authType: 'api_key',
                requiredScopes: options.anyPermission,
                availableScopes: apiKeyData.scopes,
                mode: 'any',
              },
              timestamp: new Date().toISOString(),
            })
            
            throw new AuthorizationError(
              `API key requires one of these scopes: ${options.anyPermission.join(', ')}`,
              'AUTHZ_002'
            )
          }
        } else {
          const allowed = await checkUserAnyPermission(serviceClient, user.id, options.anyPermission)
          if (!allowed) {
            // Log authorization failure
            RequestLogger.logSecurityEvent({
              type: 'authz_failure',
              userId: user.id,
              tenantId,
              ip,
              details: {
                endpoint: request.nextUrl.pathname,
                requiredPermissions: options.anyPermission,
                mode: 'any',
              },
              timestamp: new Date().toISOString(),
            })
            
            return NextResponse.json(
              { error: 'Forbidden', message: `One of these permissions required: ${options.anyPermission.join(', ')}` },
              { status: 403 }
            )
          }
        }
      }

      if (options?.allPermissions) {
        // For API keys, check if all scopes are present
        if (isAPIKeyAuth) {
          const hasAllScopes = options.allPermissions.every(scope => 
            apiKeyManager.hasScope(apiKeyData, scope)
          )
          
          if (!hasAllScopes) {
            RequestLogger.logSecurityEvent({
              type: 'authz_failure',
              tenantId,
              ip,
              details: {
                endpoint: request.nextUrl.pathname,
                authType: 'api_key',
                requiredScopes: options.allPermissions,
                availableScopes: apiKeyData.scopes,
                mode: 'all',
              },
              timestamp: new Date().toISOString(),
            })
            
            throw new AuthorizationError(
              `API key requires all of these scopes: ${options.allPermissions.join(', ')}`,
              'AUTHZ_002'
            )
          }
        } else {
          for (const perm of options.allPermissions) {
            const allowed = await checkUserPermission(serviceClient, user.id, perm)
            if (!allowed) {
              // Log authorization failure
              RequestLogger.logSecurityEvent({
                type: 'authz_failure',
                userId: user.id,
                tenantId,
                ip,
                details: {
                  endpoint: request.nextUrl.pathname,
                  requiredPermission: perm,
                  mode: 'all',
                },
                timestamp: new Date().toISOString(),
              })
              
              return NextResponse.json(
                { error: 'Forbidden', message: `Permission '${perm}' required` },
                { status: 403 }
              )
            }
          }
        }
      }

      // 7. Role check (if required) — skip for API keys
      if (options?.roles && options.roles.length > 0 && !isAPIKeyAuth) {
        // Query user's actual roles from user_roles → roles  
        const { data: userRolesData } = await serviceClient
          .from('user_roles')
          .select('roles(role_name)')
          .eq('user_id', user.id)

        const userRoleNames = (userRolesData || []).map((ur: any) => ur.roles?.role_name?.toLowerCase()).filter(Boolean)
        const hasRole = options.roles.some(r => 
          userRoleNames.includes(r.toLowerCase())
        )
        if (!hasRole) {
          // Log authorization failure
          RequestLogger.logSecurityEvent({
            type: 'authz_failure',
            userId: user.id,
            tenantId,
            ip,
            details: {
              endpoint: request.nextUrl.pathname,
              requiredRoles: options.roles,
              userRoles: userRoleNames,
            },
            timestamp: new Date().toISOString(),
          })
          
          return NextResponse.json(
            { error: 'Forbidden', message: `Role must be one of: ${options.roles.join(', ')}` },
            { status: 403 }
          )
        }
      }

      // 8. Input validation (if schemas provided)
      let validatedBody: any
      let validatedQuery: any
      let validatedParams: any
      
      if (options?.validation) {
        // Validate request body
        if (options.validation.body) {
          try {
            const body = await request.json().catch(() => ({}))
            const bodyResult = InputValidator.validate(options.validation.body, body)
            
            if (!bodyResult.success) {
              throw new ValidationError(
                `Invalid request body: ${bodyResult.errors?.map(e => e.message).join(', ')}`,
                'VAL_001'
              )
            }
            
            validatedBody = bodyResult.data
          } catch (error) {
            if (error instanceof ValidationError) {
              throw error
            }
            // If JSON parsing fails, throw validation error
            throw new ValidationError('Invalid JSON in request body', 'VAL_001')
          }
        }
        
        // Validate query parameters
        if (options.validation.query) {
          const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries())
          const queryResult = InputValidator.validate(options.validation.query, queryParams)
          
          if (!queryResult.success) {
            throw new ValidationError(
              `Invalid query parameters: ${queryResult.errors?.map(e => e.message).join(', ')}`,
              'VAL_001'
            )
          }
          
          validatedQuery = queryResult.data
        }
        
        // Validate path parameters
        if (options.validation.params && routeContext?.params) {
          const paramsResult = InputValidator.validate(options.validation.params, routeContext.params)
          
          if (!paramsResult.success) {
            throw new ValidationError(
              `Invalid path parameters: ${paramsResult.errors?.map(e => e.message).join(', ')}`,
              'VAL_001'
            )
          }
          
          validatedParams = paramsResult.data
        }
      }

      // 9. Call handler with context
      const ctx: AuthContext = {
        user: { id: user.id, email: user.email },
        profile: profile || { id: user.id, tenant_id: tenantId, role: 'user' },
        tenantId,
        supabase,
        serviceClient,
        validatedBody,
        validatedQuery,
        validatedParams,
      }

      const response = await handler(request, ctx, routeContext?.params)
      
      // 10. Add security headers to response
      const secureResponse = addSecurityHeaders(response)
      
      // 11. Add rate limit headers (if rate limiting is configured)
      if (options?.rateLimit && rateLimitResult) {
        secureResponse.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
        secureResponse.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
        secureResponse.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
      }
      
      // 12. Log successful request
      const duration = Date.now() - startTime
      RequestLogger.logRequest({
        requestId,
        timestamp: new Date().toISOString(),
        method: request.method,
        path: request.nextUrl.pathname,
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
        userId: user.id,
        tenantId,
        ip,
        userAgent,
        statusCode: secureResponse.status,
        duration,
      })
      
      // 13. Record performance metric
      await performanceMonitor.recordMetric({
        endpoint: request.nextUrl.pathname,
        method: request.method,
        duration,
        statusCode: secureResponse.status,
        tenantId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      })
      
      // 14. Decrement concurrent requests counter
      performanceMonitor.decrementConcurrentRequests()
      
      return secureResponse
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      // Log error
      ErrorHandler.logError(error, {
        requestId,
        path: request.nextUrl.pathname,
        method: request.method,
        ip,
        userAgent,
      })
      
      // Log failed request
      RequestLogger.logRequest({
        requestId,
        timestamp: new Date().toISOString(),
        method: request.method,
        path: request.nextUrl.pathname,
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
        ip,
        userAgent,
        statusCode: error.statusCode || 500,
        duration,
        error: error.message,
      })
      
      // Record performance metric for error
      await performanceMonitor.recordMetric({
        endpoint: request.nextUrl.pathname,
        method: request.method,
        duration,
        statusCode: error.statusCode || 500,
        tenantId: tenantId || 'unknown',
        userId,
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
      })
      
      // Decrement concurrent requests counter
      performanceMonitor.decrementConcurrentRequests()
      
      // Handle error and return sanitized response
      const errorResponse = ErrorHandler.handle(error, requestId)
      
      // Add rate limit headers to error response if rate limiting was configured
      if (options?.rateLimit && rateLimitResult) {
        errorResponse.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
        errorResponse.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
        errorResponse.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
      }
      
      // Add security headers to error response
      return addSecurityHeaders(errorResponse)
    }
  }
}

// ---- Internal helpers ----

async function checkUserPermission(
  client: SupabaseClient,
  userId: string,
  permissionKey: string
): Promise<boolean> {
  try {
    // Direct query instead of RPC to avoid function overload ambiguity
    // Check: user_roles → role_permissions → permissions
    const { data, error } = await client
      .from('user_roles')
      .select(`
        role_id,
        roles!inner (
          role_permissions!inner (
            permissions!inner (
              permission_key
            )
          )
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('[withAuth] Permission check error:', error)
      return false
    }

    // Flatten and check if permissionKey exists
    for (const ur of (data || [])) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key === permissionKey) {
          return true
        }
      }
    }

    return false
  } catch {
    return false
  }
}

async function checkUserAnyPermission(
  supabase: SupabaseClient,
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  for (const key of permissionKeys) {
    const allowed = await checkUserPermission(supabase, userId, key)
    if (allowed) return true
  }
  return false
}
