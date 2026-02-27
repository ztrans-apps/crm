/**
 * Chat-specific permission helpers using dynamic RBAC system
 * All permission checks go through user_roles → role_permissions → permissions
 * NO hardcoded role names - everything is driven by DB permissions
 */

import { createClient } from '@/lib/supabase/client'

/** @deprecated Use string type directly - roles are dynamic from DB */
export type UserRole = string

interface Conversation {
  id: string
  status: 'open' | 'closed'
  assigned_to: string | null
  workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
}

/**
 * Check if user has a specific permission via dynamic RBAC
 * Queries: user_roles → roles → role_permissions → permissions
 */
export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const supabase = createClient()
  
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
 * Get all permission keys for a user (cached per call)
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const supabase = createClient()
  const permissions = new Set<string>()
  
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

    if (error || !data) return permissions

    for (const ur of data) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key) {
          permissions.add(rp.permissions.permission_key)
        }
      }
    }
  } catch {
    // Return empty set on error
  }

  return permissions
}

/**
 * Get user's primary role name from dynamic RBAC
 * Returns actual role name from DB, not a hardcoded mapping
 */
export async function getUserRoleName(userId: string): Promise<string> {
  const supabase = createClient()
  
  try {
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('roles(role_name)')
      .eq('user_id', userId)
      .limit(1)

    if (!userRoles || userRoles.length === 0) {
      return 'User'
    }

    return (userRoles[0] as any)?.roles?.role_name || 'User'
  } catch {
    return 'User'
  }
}

/**
 * Get user role (backward compatible alias)
 * Returns actual role name from DB
 */
export async function getUserRole(userId: string): Promise<string> {
  return getUserRoleName(userId)
}

/**
 * Check if user can send message to conversation
 * Uses dynamic permissions instead of hardcoded role names
 */
export async function canSendMessageToConversation(
  userId: string,
  conversation: Conversation
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  
  // Check if conversation is closed
  if (conversation.status === 'closed' || conversation.workflow_status === 'done') {
    return permissions.has('conversation.manage') || permissions.has('chat.send')
  }
  
  // Check if conversation is unassigned
  if (!conversation.assigned_to) {
    return permissions.has('conversation.manage') || permissions.has('conversation.assign')
  }
  
  // If user is assigned, they can send
  if (conversation.assigned_to === userId) {
    return permissions.has('chat.send')
  }

  // Users with conversation.manage can send to any conversation
  return permissions.has('conversation.manage')
}

/**
 * Check if user can view conversation
 * Uses permission-aware logic
 */
export function canViewConversation(
  _role: string,
  userId: string,
  conversation: Conversation
): boolean {
  // Sync backward-compat: allow based on assignment
  // For full permission check, use canViewConversationAsync
  return !conversation.assigned_to || conversation.assigned_to === userId
}

/**
 * Async version with full permission check
 */
export async function canViewConversationAsync(
  userId: string,
  conversation: Conversation
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  
  if (permissions.has('conversation.view.all') || permissions.has('conversation.manage')) {
    return true
  }
  
  return !conversation.assigned_to || conversation.assigned_to === userId
}

/**
 * Get available actions for conversation based on dynamic permissions
 */
export async function getAvailableActions(
  userId: string,
  conversation: Conversation
) {
  const permissions = await getUserPermissions(userId)
  const canSend = await canSendMessageToConversation(userId, conversation)
  const hasManage = permissions.has('conversation.manage')
  const hasAssign = permissions.has('conversation.assign')
  
  return {
    canSendMessage: canSend,
    canPick: !hasManage && !conversation.assigned_to && conversation.status === 'open' && permissions.has('chat.send'),
    canAssign: hasManage || hasAssign,
    canHandover: conversation.assigned_to === userId,
    canClose: hasManage || permissions.has('conversation.close'),
    canEditContact: permissions.has('contact.edit') || permissions.has('contact.manage'),
    canApplyLabel: permissions.has('chat.send') || hasManage,
    canCreateNote: permissions.has('chat.send') || hasManage,
    canChangeStatus: permissions.has('chat.send') || hasManage,
  }
}
