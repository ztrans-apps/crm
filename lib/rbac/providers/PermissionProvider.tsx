'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Permission } from '../types'

export interface PermissionContextType {
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

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

function createPermissionSet(permissions: Permission[]): Set<string> {
  return new Set(permissions.map(p => p.permission_key))
}

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionSet, setPermissionSet] = useState<Set<string>>(new Set())
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const loadPermissions = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isInitialized && loading) return
    
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPermissions([])
        setPermissionSet(new Set())
        setRoles([])
        setLoading(false)
        setIsInitialized(true)
        return
      }

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

      if (urError) {
        console.error('Error loading permissions:', urError)
        setPermissions([])
        setPermissionSet(new Set())
        setRoles([])
        setLoading(false)
        setIsInitialized(true)
        return
      }

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
      setIsInitialized(true)
    } catch (error) {
      console.error('Error loading permissions:', error)
      setPermissions([])
      setPermissionSet(new Set())
      setRoles([])
      setIsInitialized(true)
    } finally {
      setLoading(false)
    }
  }, [supabase, isInitialized, loading])

  useEffect(() => {
    if (!isInitialized) {
      loadPermissions()
    }
  }, [isInitialized, loadPermissions])

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

  const value = useMemo(() => ({
    permissions,
    roles,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    refresh: loadPermissions
  }), [permissions, roles, loading, hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole, loadPermissions])

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within PermissionProvider')
  }
  return context
}
