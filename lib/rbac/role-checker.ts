/**
 * Role Checker Helper
 * Helper functions to check user roles
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Full access roles (can see all conversations)
 * Based on role hierarchy:
 * - Owner (typically highest level)
 * - Supervisor (Level 7+)
 * - Super Admin (Level 10)
 * - Admin (Level 9)
 * - Manager (Level 8)
 */
export const FULL_ACCESS_ROLES = ['Owner', 'Supervisor', 'Super Admin', 'Admin', 'Manager'] as const

/**
 * Admin-level roles (hierarchy level >= 8)
 * Can manage system settings and assignments
 */
export const ADMIN_ROLES = ['Super Admin', 'Admin', 'Manager'] as const

/**
 * Management-level roles (hierarchy level >= 7)
 * Includes admin roles + Team Lead
 */
export const MANAGEMENT_ROLES = [...ADMIN_ROLES, 'Team Lead'] as const

/**
 * Agent-level roles (hierarchy level >= 4)
 * All roles that can handle conversations
 */
export const AGENT_ROLES = [
  ...MANAGEMENT_ROLES,
  'Senior Agent',
  'Agent',
  'Junior Agent'
] as const

/**
 * Check if user has full access role (Owner, Supervisor, Admin, etc.)
 * These roles can see all conversations without assignment
 */
export async function userHasFullAccess(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)

  return userRoles?.some((ur: any) =>
    FULL_ACCESS_ROLES.includes(ur.roles?.role_name)
  ) || false
}

/**
 * Check if user has admin-level role
 * Admin roles: Super Admin, Admin, Manager (level >= 8)
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)

  return userRoles?.some((ur: any) =>
    ADMIN_ROLES.includes(ur.roles?.role_name)
  ) || false
}

/**
 * Check if user has management-level role
 * Management roles: Super Admin, Admin, Manager, Team Lead (level >= 7)
 */
export async function isUserManagement(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)

  return userRoles?.some((ur: any) =>
    MANAGEMENT_ROLES.includes(ur.roles?.role_name)
  ) || false
}

/**
 * Check if user has agent-level role
 * Agent roles: All roles that can handle conversations (level >= 4)
 */
export async function isUserAgent(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)

  return userRoles?.some((ur: any) =>
    AGENT_ROLES.includes(ur.roles?.role_name)
  ) || false
}

/**
 * Get user's role name
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .limit(1)

  return userRoles?.[0]?.roles?.role_name || null
}

/**
 * Check if user has specific role
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
