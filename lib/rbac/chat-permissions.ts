/**
 * Chat-specific permission helpers using RBAC system
 */

import { createClient } from '@/lib/supabase/client'

export type UserRole = 'owner' | 'supervisor' | 'agent'

interface Conversation {
  id: string
  status: 'open' | 'closed'
  assigned_to: string | null
  workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
}

/**
 * Get user's primary role from database
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createClient()
  
  try {
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role:roles(role_key, hierarchy_level)')
      .eq('user_id', userId)
      .order('role(hierarchy_level)', { ascending: false })
      .limit(1)
    
    if (!userRoles || userRoles.length === 0) {
      return 'agent'
    }
    
    const roleKey = userRoles[0]?.role?.role_key
    
    if (roleKey === 'owner' || roleKey?.includes('owner')) {
      return 'owner'
    } else if (roleKey === 'supervisor' || roleKey?.includes('supervisor')) {
      return 'supervisor'
    } else {
      return 'agent'
    }
  } catch (error) {
    console.error('Error getting user role:', error)
    return 'agent'
  }
}

/**
 * Check if user can send message to conversation
 */
export async function canSendMessageToConversation(
  userId: string,
  conversation: Conversation
): Promise<boolean> {
  const role = await getUserRole(userId)
  
  // Check if conversation is closed
  if (conversation.status === 'closed' || conversation.workflow_status === 'done') {
    return role === 'owner' // Only owner can send to closed
  }
  
  // Check if conversation is unassigned
  if (!conversation.assigned_to) {
    return role === 'owner' || role === 'supervisor' // Owner and supervisor can send to unassigned
  }
  
  // For agents, must be assigned to them
  if (role === 'agent') {
    return conversation.assigned_to === userId
  }
  
  return true
}

/**
 * Check if user can view conversation
 */
export function canViewConversation(
  role: UserRole,
  userId: string,
  conversation: Conversation
): boolean {
  // Owner and supervisor can view all
  if (role === 'owner' || role === 'supervisor') {
    return true
  }
  
  // Agents can view unassigned or assigned to them
  return !conversation.assigned_to || conversation.assigned_to === userId
}

/**
 * Get available actions for conversation
 */
export async function getAvailableActions(
  userId: string,
  conversation: Conversation
) {
  const role = await getUserRole(userId)
  const canSend = await canSendMessageToConversation(userId, conversation)
  
  return {
    canSendMessage: canSend,
    canPick: role !== 'owner' && !conversation.assigned_to && conversation.status === 'open',
    canAssign: role === 'owner' || role === 'supervisor',
    canHandover: conversation.assigned_to === userId,
    canClose: role === 'owner' || role === 'supervisor',
    canEditContact: true,
    canApplyLabel: true,
    canCreateNote: true,
    canChangeStatus: true,
  }
}
