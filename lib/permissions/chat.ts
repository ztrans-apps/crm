// Chat-specific permission checks
import { UserRole, getPermissions } from './roles'

interface Conversation {
  id: string
  status: 'open' | 'closed'
  assigned_to: string | null
  workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
}

/**
 * Check if user can send message to a conversation
 */
export function canSendMessageToConversation(
  role: UserRole,
  userId: string,
  conversation: Conversation
): boolean {
  const permissions = getPermissions(role)
  
  // Check if user can send messages at all
  if (!permissions.canSendMessage) return false
  
  // Check if conversation is closed
  if (conversation.status === 'closed' || conversation.workflow_status === 'done') {
    return permissions.canSendToClosedConversation
  }
  
  // Check if conversation is unassigned
  if (!conversation.assigned_to) {
    return permissions.canSendToUnassignedConversation
  }
  
  // For agents, check if conversation is assigned to them
  if (role === 'agent') {
    return conversation.assigned_to === userId
  }
  
  return true
}

/**
 * Check if user can view a conversation
 */
export function canViewConversation(
  role: UserRole,
  userId: string,
  conversation: Conversation
): boolean {
  const permissions = getPermissions(role)
  
  // Owners and supervisors can view all
  if (permissions.canViewAllConversations) return true
  
  // Agents can view unassigned or assigned to them
  if (permissions.canViewAssignedOnly) {
    return !conversation.assigned_to || conversation.assigned_to === userId
  }
  
  return false
}

/**
 * Check if user can pick/assign conversation
 */
export function canPickConversation(
  role: UserRole,
  conversation: Conversation
): boolean {
  const permissions = getPermissions(role)
  
  // Must be unassigned and open
  if (conversation.assigned_to || conversation.status === 'closed') {
    return false
  }
  
  return permissions.canPickConversation
}

/**
 * Check if user can assign conversation to another agent
 */
export function canAssignToAgent(role: UserRole): boolean {
  const permissions = getPermissions(role)
  return permissions.canAssignConversation
}

/**
 * Check if user can handover conversation
 */
export function canHandover(
  role: UserRole,
  userId: string,
  conversation: Conversation
): boolean {
  const permissions = getPermissions(role)
  
  if (!permissions.canHandoverConversation) return false
  
  // Must be assigned to current user
  return conversation.assigned_to === userId
}

/**
 * Check if user can close conversation
 */
export function canCloseConversation(
  role: UserRole,
  conversation: Conversation
): boolean {
  const permissions = getPermissions(role)
  
  if (!permissions.canCloseConversation) return false
  
  // Must be open
  return conversation.status === 'open'
}

/**
 * Get available actions for a conversation
 */
export function getAvailableActions(
  role: UserRole,
  userId: string,
  conversation: Conversation
) {
  return {
    canSendMessage: canSendMessageToConversation(role, userId, conversation),
    canPick: canPickConversation(role, conversation),
    canAssign: canAssignToAgent(role),
    canHandover: canHandover(role, userId, conversation),
    canClose: canCloseConversation(role, conversation),
    canEditContact: getPermissions(role).canEditContact,
    canApplyLabel: getPermissions(role).canApplyLabel,
    canCreateNote: getPermissions(role).canCreateNote,
    canChangeStatus: getPermissions(role).canChangeWorkflowStatus,
  }
}
