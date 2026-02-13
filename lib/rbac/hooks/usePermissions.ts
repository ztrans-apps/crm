'use client'

// React Hook for Permission Checks
// Hook untuk mengecek permission di client component

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Permission, PermissionContext } from '../types'
import { createPermissionSet } from '../permissions'

export function usePermissions(): PermissionContext {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionSet, setPermissionSet] = useState<Set<string>>(new Set())
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Load permissions
  useEffect(() => {
    async function loadPermissions() {
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
    }

    loadPermissions()
  }, [])

  // Check single permission
  const hasPermission = useCallback((key: string): boolean => {
    return permissionSet.has(key)
  }, [permissionSet])

  // Check if has any of the permissions
  const hasAnyPermission = useCallback((keys: string[]): boolean => {
    return keys.some(key => permissionSet.has(key))
  }, [permissionSet])

  // Check if has all permissions
  const hasAllPermissions = useCallback((keys: string[]): boolean => {
    if (!keys || keys.length === 0) return false
    return keys.every(key => permissionSet.has(key))
  }, [permissionSet])

  // Alias for hasPermission
  const can = hasPermission

  return {
    permissions: permissionSet,
    roles,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
  }
}

/**
 * Hook to check specific permission
 * Returns boolean indicating if user has permission
 */
export function usePermission(permissionKey: string): boolean {
  const { hasPermission, loading } = usePermissions()
  
  if (loading) return false
  return hasPermission(permissionKey)
}

/**
 * Hook to check multiple permissions
 * Returns object with permission keys as properties
 */
export function usePermissionCheck(permissionKeys: string[]): Record<string, boolean> {
  const { hasPermission, loading } = usePermissions()
  
  if (loading) {
    return permissionKeys.reduce((acc, key) => {
      acc[key] = false
      return acc
    }, {} as Record<string, boolean>)
  }

  return permissionKeys.reduce((acc, key) => {
    acc[key] = hasPermission(key)
    return acc
  }, {} as Record<string, boolean>)
}
