'use client'

// React Hook for Permission Checks
// Hook untuk mengecek permission di client component

import { useEffect, useState, useCallback, useMemo } from 'react'
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

  // Create supabase client once, outside of useCallback
  const supabase = useMemo(() => createClient(), [])

  // Load permissions
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get user permissions via direct query (avoids RPC function overload issue)
      const { data: userRolesData, error: urError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles!inner (
            role_name,
            role_permissions (
              permissions (
                id,
                permission_key,
                permission_name,
                module,
                page,
                action,
                description,
                created_at
              )
            )
          )
        `)
        .eq('user_id', user.id)

      if (urError) throw urError

      // Extract permissions from roles
      const permMap = new Map<string, Permission>()
      const roleList: any[] = []

      for (const ur of (userRolesData || [])) {
        const role = (ur as any).roles
        if (role) {
          roleList.push({ role_id: ur.role_id, role_name: role.role_name })
          for (const rp of (role.role_permissions || [])) {
            if (rp.permissions) {
              permMap.set(rp.permissions.permission_key, rp.permissions)
            }
          }
        }
      }

      const permArray = Array.from(permMap.values())
      setPermissions(permArray)
      setPermissionSet(createPermissionSet(permArray))
      setRoles(roleList)
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Permission check functions — fully dynamic via DB
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
    return roles.some(role => role.role_name === roleKey || role.role_key === roleKey)
  }, [roles])

  const hasAnyRole = useCallback((roleKeys: string[]): boolean => {
    return roles.some(role => roleKeys.includes(role.role_name) || roleKeys.includes(role.role_key))
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
