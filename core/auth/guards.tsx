// Route guards for client-side protection
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/rbac/chat-permissions'

interface RouteGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
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
 * Protect routes that require specific roles
 */
export function RoleGuard({ 
  children, 
  allowedRoles = [],
  redirectTo = '/unauthorized',
  fallback = <LoadingScreen />
}: RouteGuardProps) {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    checkRole()
  }, [])

  const checkRole = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Get user profile with role
      // @ts-ignore - Supabase type issue
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (!profile) {
        router.push('/login')
        return
      }

      // Check if user is active
      // @ts-ignore
      if (profile.is_active === false) {
        router.push('/inactive')
        return
      }

      // Check if user has required role
      // @ts-ignore
      if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role as UserRole)) {
        router.push(redirectTo)
        return
      }

      setHasAccess(true)
    } catch (error) {
      console.error('Role check error:', error)
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
 * Protect owner-only routes
 */
export function OwnerGuard({ children, ...props }: Omit<RouteGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['owner']} {...props}>
      {children}
    </RoleGuard>
  )
}

/**
 * Protect agent-only routes
 */
export function AgentGuard({ children, ...props }: Omit<RouteGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['agent']} {...props}>
      {children}
    </RoleGuard>
  )
}

/**
 * Protect supervisor-only routes
 */
export function SupervisorGuard({ children, ...props }: Omit<RouteGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['supervisor']} {...props}>
      {children}
    </RoleGuard>
  )
}

/**
 * Protect routes for owner or supervisor
 */
export function OwnerOrSupervisorGuard({ children, ...props }: Omit<RouteGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['owner', 'supervisor']} {...props}>
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
