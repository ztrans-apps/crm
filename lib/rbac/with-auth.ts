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

export interface AuthContext {
  user: { id: string; email?: string }
  profile: { id: string; tenant_id: string; role?: string; full_name?: string }
  tenantId: string
  supabase: SupabaseClient
  /** Service role Supabase client (bypasses RLS). Only use when necessary. */
  serviceClient: SupabaseClient
}

interface WithAuthOptions {
  /** Require a specific permission key */
  permission?: string
  /** Require any of these permission keys */
  anyPermission?: string[]
  /** Require all of these permission keys */
  allPermissions?: string[]
  /** Restrict to specific roles (checked against profile.role and user_roles) */
  roles?: string[]
  /** Skip tenant resolution (for routes that don't need it) */
  skipTenant?: boolean
}

type AuthHandler = (
  request: NextRequest,
  ctx: AuthContext,
  params?: any
) => Promise<NextResponse> | NextResponse

/**
 * Wrap an API route handler with auth + RBAC
 */
export function withAuth(handler: AuthHandler, options?: WithAuthOptions) {
  return async (request: NextRequest, routeContext?: any) => {
    try {
      const supabase = await createClient()

      // 1. Auth check
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // 2. Get profile (always needed for tenant_id and role)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id, role, full_name')
        .eq('id', user.id)
        .single()

      if (!profile && !options?.skipTenant) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }

      const tenantId = profile?.tenant_id || 
        process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || 
        '00000000-0000-0000-0000-000000000001'

      // Create service client early — needed for reliable permission checks
      const serviceClient = createServiceRoleClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      // 3. Check permissions from middleware header (set by middleware.ts)
      const headerPermission = request.headers.get('X-Required-Permission')
      const permissionMode = request.headers.get('X-Permission-Mode')

      if (headerPermission) {
        const permissions = headerPermission.split(',')
        if (permissionMode === 'any') {
          const allowed = await checkUserAnyPermission(serviceClient, user.id, permissions)
          if (!allowed) {
            return NextResponse.json(
              { error: 'Forbidden', message: `One of these permissions required: ${headerPermission}` },
              { status: 403 }
            )
          }
        } else {
          const allowed = await checkUserPermission(serviceClient, user.id, permissions[0])
          if (!allowed) {
            return NextResponse.json(
              { error: 'Forbidden', message: `Permission '${permissions[0]}' required` },
              { status: 403 }
            )
          }
        }
      }

      // 4. Check permissions from options (handler-level override)
      if (options?.permission) {
        const allowed = await checkUserPermission(serviceClient, user.id, options.permission)
        if (!allowed) {
          return NextResponse.json(
            { error: 'Forbidden', message: `Permission '${options.permission}' required` },
            { status: 403 }
          )
        }
      }

      if (options?.anyPermission) {
        const allowed = await checkUserAnyPermission(serviceClient, user.id, options.anyPermission)
        if (!allowed) {
          return NextResponse.json(
            { error: 'Forbidden', message: `One of these permissions required: ${options.anyPermission.join(', ')}` },
            { status: 403 }
          )
        }
      }

      if (options?.allPermissions) {
        for (const perm of options.allPermissions) {
          const allowed = await checkUserPermission(serviceClient, user.id, perm)
          if (!allowed) {
            return NextResponse.json(
              { error: 'Forbidden', message: `Permission '${perm}' required` },
              { status: 403 }
            )
          }
        }
      }

      // 5. Role check (if required) — uses dynamic user_roles, not profile.role
      if (options?.roles && options.roles.length > 0) {
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
          return NextResponse.json(
            { error: 'Forbidden', message: `Role must be one of: ${options.roles.join(', ')}` },
            { status: 403 }
          )
        }
      }

      // 6. Call handler with context

      const ctx: AuthContext = {
        user: { id: user.id, email: user.email },
        profile: profile || { id: user.id, tenant_id: tenantId, role: 'user' },
        tenantId,
        supabase,
        serviceClient,
      }

      return await handler(request, ctx, routeContext?.params)
    } catch (error: any) {
      console.error('[withAuth] Unhandled error:', error)
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
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
