// Auth middleware - uses dynamic RBAC for all permission checks
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/** @deprecated UserRole is now dynamic string from DB */
export type UserRole = string

export interface AuthUser {
  id: string
  email: string
  role: string      // Display role from profiles, NOT used for access control
  full_name?: string
  avatar_url?: string
  is_active?: boolean
}

export interface AuthContext {
  user: AuthUser
  supabase: SupabaseClient
}

/**
 * Get authenticated user from Supabase
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return null
    }

    // @ts-ignore - Supabase type issue
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, avatar_url, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return null
    }

    const profileData = profile as any
    return {
      id: profileData.id,
      email: profileData.email,
      role: profileData.role || 'user',  // Display only, not for access control
      full_name: profileData.full_name,
      avatar_url: profileData.avatar_url,
      is_active: profileData.is_active,
    }
  } catch (error) {
    console.error('getAuthUser error:', error)
    return null
  }
}

/**
 * Require authentication
 */
export async function requireAuth(): Promise<AuthContext> {
  const user = await getAuthUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }

  if (user.is_active === false) {
    throw new Error('User account is inactive')
  }

  return {
    user,
    supabase: createClient(),
  }
}

/**
 * @deprecated Use dynamic permission checks via withAuth in lib/rbac/with-auth.ts instead
 * Keeping for backward compatibility but checks are best-effort
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthContext> {
  const context = await requireAuth()
  // Note: This checks profiles.role for backward compat
  // New code should use permission-based checks via withAuth
  if (allowedRoles.length > 0 && !allowedRoles.includes(context.user.role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
  }
  return context
}

/**
 * Check if user has permission (dynamic, via DB)
 */
export async function hasPermission(user: AuthUser, permission: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        roles!inner (
          role_permissions!inner (
            permissions!inner (
              permission_key
            )
          )
        )
      `)
      .eq('user_id', user.id)

    if (error || !data) return false

    for (const ur of data) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key === permission) {
          return true
        }
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Get owner info for agent
 */
export async function getAgentOwner(agentId: string) {
  try {
    const supabase = createClient()
    
    // @ts-ignore - Supabase type issue
    const { data: agent, error: agentError } = await supabase
      .from('profiles')
      .select('owner_id')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      throw new Error('Agent not found')
    }

    const agentData = agent as any
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', agentData.owner_id)
      .single()

    if (ownerError || !owner) {
      throw new Error('Owner not found')
    }

    return owner
  } catch (error) {
    console.error('getAgentOwner error:', error)
    throw error
  }
}

/**
 * Middleware wrapper for API routes
 * Usage: export const GET = withAuth(async (req, context) => { ... })
 */
export function withAuth<T = any>(
  handler: (req: Request, context: AuthContext) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      const context = await requireAuth()
      return await handler(req, context)
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Authentication failed',
          logout: true,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}

/**
 * @deprecated Use withAuth from lib/rbac/with-auth.ts with permission option instead
 * Middleware wrapper with role requirement (backward compat)
 */
export function withRole<T = any>(
  allowedRoles: string[],
  handler: (req: Request, context: AuthContext) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      const context = await requireRole(allowedRoles)
      return await handler(req, context)
    } catch (error: any) {
      const status = error.message.includes('Authentication') ? 401 : 403
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Access denied',
          logout: status === 401,
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
