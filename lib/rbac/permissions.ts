// Permission Helper Functions
// Core functions untuk check permission (CLIENT-SIDE ONLY)

import { createClient } from '@/lib/supabase/client'
import type { Permission } from './types'

/**
 * Get all permissions for current user (CLIENT-SIDE)
 * For server-side, use getServerUserPermissions from middleware
 */
export async function getUserPermissions(): Promise<Permission[]> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase
    // @ts-ignore - Supabase type issue
    .rpc('get_user_permissions', { p_user_id: user.id })

  if (error) {
    console.error('Error fetching user permissions:', error)
    return []
  }

  return data || []
}

/**
 * Check if user has specific permission (CLIENT-SIDE)
 * For server-side, use checkPermission from middleware
 */
export async function hasPermission(permissionKey: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase
    // @ts-ignore - Supabase type issue
    .rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission_key: permissionKey
    })

  if (error) {
    console.error('Error checking permission:', error)
    return false
  }

  return data || false
}

/**
 * Check if user has any of the specified permissions (CLIENT-SIDE)
 */
export async function hasAnyPermission(permissionKeys: string[]): Promise<boolean> {
  const permissions = await getUserPermissions()
  const userPermissionKeys = new Set(permissions.map(p => p.permission_key))
  
  return permissionKeys.some(key => userPermissionKeys.has(key))
}

/**
 * Check if user has all of the specified permissions (CLIENT-SIDE)
 */
export async function hasAllPermissions(permissionKeys: string[]): Promise<boolean> {
  const permissions = await getUserPermissions()
  const userPermissionKeys = new Set(permissions.map(p => p.permission_key))
  
  return permissionKeys.every(key => userPermissionKeys.has(key))
}

/**
 * Get permissions grouped by module
 */
export function groupPermissionsByModule(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)
}

/**
 * Create permission set from array for fast lookup
 */
export function createPermissionSet(permissions: Permission[]): Set<string> {
  return new Set(permissions.map(p => p.permission_key))
}

/**
 * Check permission from a permission set (for client-side checks)
 */
export function can(permissionSet: Set<string>, permissionKey: string): boolean {
  return permissionSet.has(permissionKey)
}

/**
 * Check if has any permission from set
 */
export function canAny(permissionSet: Set<string>, permissionKeys: string[]): boolean {
  return permissionKeys.some(key => permissionSet.has(key))
}

/**
 * Check if has all permissions from set
 */
export function canAll(permissionSet: Set<string>, permissionKeys: string[]): boolean {
  return permissionKeys.every(key => permissionSet.has(key))
}
