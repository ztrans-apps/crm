'use client'

// React Hook for Permission Checks
// Hook untuk mengecek permission di client component

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Permission } from '../types'

export interface PermissionContext {
  permissions: Permission[]
  roles: any[]
  loading: boolean
  hasPermission: (key: string) => boolean
  hasAnyPermission: (keys: string[]) => boolean
  hasAllPermissions: (keys: string[]) => boolean
  hasRole: (roleKey: string) => boolean
  hasAnyRole: (roleKeys: string[]) => boolean
  refresh: () => Promise<void>
}

/**
 * Create permission set from array for fast lookup
 */
function createPermissionSet(permissions: Permission[]): Set<string> {
  return new Set(permissions.map(p => p.permission_key))
}

export function usePermissions(): PermissionContext {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionSet, setPermissionSet] = useState<Set<string>>(new Set())
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Load permissions
  const loadPermissions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get user permissions
      // @ts-ignore - Supabase type issue
      const { data: perms, error: permError } = await supabase
        // @ts-ignore - Supabase type issue
        .rpc('get_user_permissions', { p_user_id: user.id })

      if (permError) throw permError

      // Get user roles
      // @ts-ignore - Supabase type issue
      const { data: userRoles, error: roleError } = await supabase
        // @ts-ignore - Supabase type issue
        .rpc('get_user_roles', { p_user_id: user.id })

      if (roleError) throw roleError

      setPermissions(perms || [])
      setPermissionSet(createPermissionSet(perms || []))
      setRoles(userRoles || [])
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Permission check functions
  const hasPermission = useCallback((key: string): boolean => {
    return permissionSet.has(key)
  }, [permissionSet])

  const hasAnyPermission = useCallback((keys: string[]): boolean => {
    return keys.some(key => permissionSet.has(key))
  }, [permissionSet])

  const hasAllPermissions = useCallback((keys: string[]): boolean => {
    return keys.every(key => permissionSet.has(key))
  }, [permissionSet])

  const hasRole = useCallback((roleKey: string): boolean => {
    return roles.some(role => role.role_key === roleKey)
  }, [roles])

  const hasAnyRole = useCallback((roleKeys: string[]): boolean => {
    return roles.some(role => roleKeys.includes(role.role_key))
  }, [roles])

  return {
    permissions,
    roles,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    refresh: loadPermissions
  }
}

/**
 * Hook to check single permission
 */
export function usePermission(permissionKey: string): boolean {
  const { hasPermission, loading } = usePermissions()
  
  if (loading) return false
  return hasPermission(permissionKey)
}

/**
 * Hook to check if user has specific role
 */
export function useRole(roleKey: string): boolean {
  const { hasRole, loading } = usePermissions()
  
  if (loading) return false
  return hasRole(roleKey)
}
