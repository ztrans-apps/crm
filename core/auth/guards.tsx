// Route guards for client-side protection — Dynamic RBAC
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RouteGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requiredPermission?: string | string[]
  redirectTo?: string
  fallback?: React.ReactNode
}

/**
 * Protect routes that require authentication
 */
export function AuthGuard({ 
  children, 
  redirectTo = '/login',
  fallback = <LoadingScreen />
}: Omit<RouteGuardProps, 'allowedRoles'>) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push(redirectTo)
        return
      }

      setIsAuthenticated(true)
    } catch (error) {
      console.error('Auth check error:', error)
      router.push(redirectTo)
    }
  }

  if (isAuthenticated === null) {
    return <>{fallback}</>
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

/**
 * Protect routes that require specific roles or permissions
 * Uses dynamic RBAC: user_roles → role_permissions → permissions
 */
export function RoleGuard({ 
  children, 
  allowedRoles = [],
  requiredPermission,
  redirectTo = '/unauthorized',
  fallback = <LoadingScreen />
}: RouteGuardProps) {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is active
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', user.id)
        .single()

      if (!profile || (profile as any).is_active === false) {
        router.push('/inactive')
        return
      }

      // Check permission dynamically via user_roles → role_permissions → permissions
      if (requiredPermission) {
        const permKeys = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission]
        
        const { data: userRolesData } = await supabase
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

        const userPermissions = new Set<string>()
        for (const ur of (userRolesData || [])) {
          const role = (ur as any).roles
          if (!role?.role_permissions) continue
          for (const rp of role.role_permissions) {
            if (rp.permissions?.permission_key) {
              userPermissions.add(rp.permissions.permission_key)
            }
          }
        }

        const hasPermission = permKeys.some(key => userPermissions.has(key))
        if (!hasPermission) {
          router.push(redirectTo)
          return
        }
      }

      // Check role dynamically via user_roles if allowedRoles specified
      if (allowedRoles.length > 0) {
        const { data: userRolesData } = await supabase
          .from('user_roles')
          .select('roles(role_name)')
          .eq('user_id', user.id)

        const userRoleNames = (userRolesData || []).map((ur: any) => ur.roles?.role_name).filter(Boolean)
        const hasRole = allowedRoles.some(r => 
          userRoleNames.some((rn: string) => rn.toLowerCase() === r.toLowerCase())
        )
        
        if (!hasRole) {
          router.push(redirectTo)
          return
        }
      }

      setHasAccess(true)
    } catch (error) {
      console.error('Access check error:', error)
      router.push(redirectTo)
    }
  }

  if (hasAccess === null) {
    return <>{fallback}</>
  }

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}

/**
 * @deprecated Use RoleGuard with requiredPermission or PermissionGuard from lib/rbac/components/PermissionGuard
 * Protect owner-only routes — now checks 'admin.access' permission dynamically
 */
export function OwnerGuard({ children, ...props }: Omit<RouteGuardProps, 'allowedRoles' | 'requiredPermission'>) {
  return (
    <RoleGuard requiredPermission="admin.access" {...props}>
      {children}
    </RoleGuard>
  )
}

/**
 * @deprecated Use RoleGuard with requiredPermission or PermissionGuard from lib/rbac/components/PermissionGuard
 * Protect agent-only routes — now checks 'chat.view' permission dynamically
 */
export function AgentGuard({ children, ...props }: Omit<RouteGuardProps, 'allowedRoles' | 'requiredPermission'>) {
  return (
    <RoleGuard requiredPermission="chat.view" {...props}>
      {children}
    </RoleGuard>
  )
}

/**
 * @deprecated Use RoleGuard with requiredPermission or PermissionGuard from lib/rbac/components/PermissionGuard
 * Protect supervisor-only routes — now checks 'conversation.manage' permission dynamically
 */
export function SupervisorGuard({ children, ...props }: Omit<RouteGuardProps, 'allowedRoles' | 'requiredPermission'>) {
  return (
    <RoleGuard requiredPermission="conversation.manage" {...props}>
      {children}
    </RoleGuard>
  )
}

/**
 * @deprecated Use RoleGuard with requiredPermission or PermissionGuard from lib/rbac/components/PermissionGuard
 */
export function OwnerOrSupervisorGuard({ children, ...props }: Omit<RouteGuardProps, 'allowedRoles' | 'requiredPermission'>) {
  return (
    <RoleGuard requiredPermission={['admin.access', 'conversation.manage']} {...props}>
      {children}
    </RoleGuard>
  )
}

/**
 * Loading screen component
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-vx-surface-elevated">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vx-purple mx-auto mb-4"></div>
        <p className="text-vx-text-secondary">Loading...</p>
      </div>
    </div>
  )
}

/**
 * Hook to get current user with role
 */
export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        setUser(null)
        return
      }

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(profile)
    } catch (error) {
      console.error('Load user error:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, reload: loadUser }
}
