// lib/rbac/client-helpers.ts
// Client-side RBAC helpers for dynamic permission checking
// Uses browser Supabase client - do NOT use in server components

import { createClient } from '@/lib/supabase/client'

/**
 * Check if a user has a specific permission (client-side)
 * Queries: user_roles → roles → role_permissions → permissions
 */
export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles!inner (
          role_permissions!inner (
            permissions!inner (
              permission_key
            )
          )
        )
      `)
      .eq('user_id', userId)

    if (!data) return false

    for (const ur of data) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key === permissionKey) return true
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Get all permissions for a user (client-side)
 * Returns a Set<string> of permission keys
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const supabase = createClient()
  const perms = new Set<string>()

  try {
    const { data } = await supabase
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
      .eq('user_id', userId)

    if (!data) return perms

    for (const ur of data) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key) {
          perms.add(rp.permissions.permission_key)
        }
      }
    }
  } catch {
    // Silent fail - return empty set
  }

  return perms
}

/**
 * Get user IDs who have a specific permission (client-side)
 * Useful for finding "agents" dynamically (users with 'chat.send' permission)
 */
export async function getUserIdsWithPermission(permissionKey: string): Promise<string[]> {
  const supabase = createClient()

  try {
    const { data } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles!inner (
          role_permissions!inner (
            permissions!inner (
              permission_key
            )
          )
        )
      `)

    if (!data) return []

    const userIds = new Set<string>()
    for (const ur of data) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key === permissionKey) {
          userIds.add((ur as any).user_id)
        }
      }
    }
    return Array.from(userIds)
  } catch {
    return []
  }
}

/**
 * Get user IDs who have ANY role assigned
 * Alternative to .eq('role', 'agent') for finding operational users
 */
export async function getAllRoleUserIds(): Promise<string[]> {
  const supabase = createClient()

  try {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id')

    if (!data) return []
    return [...new Set(data.map((ur: any) => ur.user_id))]
  } catch {
    return []
  }
}

/**
 * Inline helper: get user IDs with permission using a provided supabase client
 * Use when you already have a supabase client instance (e.g., in API routes)
 */
export async function getUserIdsWithPermissionFromClient(
  supabase: any,
  permissionKey: string
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles!inner (
          role_permissions!inner (
            permissions!inner (
              permission_key
            )
          )
        )
      `)

    if (!data) return []

    const userIds = new Set<string>()
    for (const ur of data) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key === permissionKey) {
          userIds.add((ur as any).user_id)
        }
      }
    }
    return Array.from(userIds)
  } catch {
    return []
  }
}
