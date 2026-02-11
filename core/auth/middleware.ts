// Auth middleware - inspired by reference project's validateUser/validateAgent
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/permissions/roles'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
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
 * Similar to validateUser in reference project
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient()
    
    // Get current session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return null
    }

    // Get user profile with role
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

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      is_active: profile.is_active,
    }
  } catch (error) {
    console.error('getAuthUser error:', error)
    return null
  }
}

/**
 * Require authentication
 * Throws error if user is not authenticated
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
 * Require specific role
 * Similar to role check in reference project's middleware
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthContext> {
  const context = await requireAuth()
  
  if (!allowedRoles.includes(context.user.role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
  }

  return context
}

/**
 * Require owner role
 */
export async function requireOwner(): Promise<AuthContext> {
  return requireRole(['owner'])
}

/**
 * Require agent role
 */
export async function requireAgent(): Promise<AuthContext> {
  return requireRole(['agent'])
}

/**
 * Require supervisor role
 */
export async function requireSupervisor(): Promise<AuthContext> {
  return requireRole(['supervisor'])
}

/**
 * Require owner or supervisor
 */
export async function requireOwnerOrSupervisor(): Promise<AuthContext> {
  return requireRole(['owner', 'supervisor'])
}

/**
 * Get owner info for agent
 * Similar to reference project's agent middleware that attaches owner info
 */
export async function getAgentOwner(agentId: string) {
  try {
    const supabase = createClient()
    
    // Get agent info
    // @ts-ignore - Supabase type issue
    const { data: agent, error: agentError } = await supabase
      .from('profiles')
      .select('owner_id')
      .eq('id', agentId)
      .eq('role', 'agent')
      .single()

    if (agentError || !agent) {
      throw new Error('Agent not found')
    }

    // Get owner info
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', agent.owner_id)
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
 * Check if user has permission
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  // This can be extended with more complex permission logic
  // For now, we use role-based permissions from lib/permissions
  return true
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
 * Middleware wrapper with role requirement
 * Usage: export const GET = withRole(['owner'], async (req, context) => { ... })
 */
export function withRole<T = any>(
  allowedRoles: UserRole[],
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
