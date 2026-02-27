/**
 * Role Checker Helper — Dynamic RBAC
 * All checks go through user_roles → role_permissions → permissions
 * NO hardcoded role arrays — everything is driven by DB
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Check if user has full access (can see all conversations)
 * Dynamic: checks for 'chat.view.all' or 'chat.view_all' permission
 */
export async function userHasFullAccess(userId: string): Promise<boolean> {
  return await userHasAnyPermission(userId, ['chat.view.all', 'chat.view_all'])
}

/**
 * Check if user has admin-level access
 * Dynamic: checks for 'admin.access' permission
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  return await userHasPermissionServer(userId, 'admin.access')
}

/**
 * Check if user has management-level access
 * Dynamic: checks for 'admin.access', 'chat.assign', or 'user.manage_roles' permission
 */
export async function isUserManagement(userId: string): Promise<boolean> {
  return await userHasAnyPermission(userId, ['admin.access', 'chat.assign', 'user.manage_roles'])
}

/**
 * Check if user has agent-level role (can handle conversations)
 * Dynamic: checks for 'chat.reply' or 'chat.view' permission
 */
export async function isUserAgent(userId: string): Promise<boolean> {
  return await userHasAnyPermission(userId, ['chat.reply', 'chat.view'])
}

/**
 * Get user's role name from dynamic RBAC
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .limit(1)

  return (userRoles as any)?.[0]?.roles?.role_name || null
}

/**
 * Check if user has specific role by name
 */
export async function userHasRole(
  userId: string,
  roleName: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)

  return userRoles?.some((ur: any) =>
    ur.roles?.role_name === roleName
  ) || false
}

/**
 * Check if user has any of the specified roles
 */
export async function userHasAnyRole(
  userId: string,
  roleNames: string[]
): Promise<boolean> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)

  return userRoles?.some((ur: any) =>
    roleNames.includes(ur.roles?.role_name)
  ) || false
}

/**
 * Check if user has a specific permission (server-side)
 * Queries: user_roles → roles → role_permissions → permissions
 */
export async function userHasPermissionServer(userId: string, permissionKey: string): Promise<boolean> {
  const supabase = await createClient()

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
      .eq('user_id', userId)

    if (error || !data) return false

    for (const ur of data) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key === permissionKey) {
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
 * Check if user has any of the given permissions (server-side)
 */
export async function userHasAnyPermission(userId: string, permissionKeys: string[]): Promise<boolean> {
  const supabase = await createClient()

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
      .eq('user_id', userId)

    if (error || !data) return false

    for (const ur of data) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (permissionKeys.includes(rp.permissions?.permission_key)) {
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
 * Get IDs of users who have a specific permission
 * Useful for finding "agents" dynamically (users with 'chat.send' permission)
 */
export async function getUserIdsWithPermission(permissionKey: string): Promise<string[]> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
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

    if (error || !data) return []

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
