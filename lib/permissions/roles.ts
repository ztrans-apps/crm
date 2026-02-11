// Role definitions and permissions
export type UserRole = 'owner' | 'agent' | 'supervisor'

export interface RolePermissions {
  // Conversation permissions
  canViewAllConversations: boolean
  canViewAssignedOnly: boolean
  canPickConversation: boolean
  canAssignConversation: boolean
  canHandoverConversation: boolean
  canCloseConversation: boolean
  
  // Message permissions
  canSendMessage: boolean
  canSendToClosedConversation: boolean
  canSendToUnassignedConversation: boolean
  
  // Contact permissions
  canEditContact: boolean
  canViewContactDetails: boolean
  
  // Label permissions
  canCreateLabel: boolean
  canApplyLabel: boolean
  canRemoveLabel: boolean
  
  // Note permissions
  canCreateNote: boolean
  canViewNotes: boolean
  canEditOwnNotes: boolean
  canEditAllNotes: boolean
  
  // Workflow permissions
  canChangeWorkflowStatus: boolean
  canViewSLA: boolean
  
  // Analytics permissions
  canViewAnalytics: boolean
  canViewOwnAnalytics: boolean
  canViewTeamAnalytics: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    // Conversation permissions
    canViewAllConversations: true,
    canViewAssignedOnly: false,
    canPickConversation: false,
    canAssignConversation: true,
    canHandoverConversation: false,
    canCloseConversation: true,
    
    // Message permissions
    canSendMessage: true,
    canSendToClosedConversation: true,
    canSendToUnassignedConversation: true,
    
    // Contact permissions
    canEditContact: true,
    canViewContactDetails: true,
    
    // Label permissions
    canCreateLabel: true,
    canApplyLabel: true,
    canRemoveLabel: true,
    
    // Note permissions
    canCreateNote: true,
    canViewNotes: true,
    canEditOwnNotes: true,
    canEditAllNotes: true,
    
    // Workflow permissions
    canChangeWorkflowStatus: true,
    canViewSLA: true,
    
    // Analytics permissions
    canViewAnalytics: true,
    canViewOwnAnalytics: true,
    canViewTeamAnalytics: true,
  },
  
  agent: {
    // Conversation permissions
    canViewAllConversations: false,
    canViewAssignedOnly: true,
    canPickConversation: true,
    canAssignConversation: false,
    canHandoverConversation: true,
    canCloseConversation: false,
    
    // Message permissions
    canSendMessage: true,
    canSendToClosedConversation: false,
    canSendToUnassignedConversation: false,
    
    // Contact permissions
    canEditContact: true,
    canViewContactDetails: true,
    
    // Label permissions
    canCreateLabel: false,
    canApplyLabel: true,
    canRemoveLabel: true,
    
    // Note permissions
    canCreateNote: true,
    canViewNotes: true,
    canEditOwnNotes: true,
    canEditAllNotes: false,
    
    // Workflow permissions
    canChangeWorkflowStatus: true,
    canViewSLA: true,
    
    // Analytics permissions
    canViewAnalytics: true,
    canViewOwnAnalytics: true,
    canViewTeamAnalytics: false,
  },
  
  supervisor: {
    // Conversation permissions
    canViewAllConversations: true,
    canViewAssignedOnly: false,
    canPickConversation: true,
    canAssignConversation: true,
    canHandoverConversation: true,
    canCloseConversation: true,
    
    // Message permissions
    canSendMessage: true,
    canSendToClosedConversation: false,
    canSendToUnassignedConversation: true,
    
    // Contact permissions
    canEditContact: true,
    canViewContactDetails: true,
    
    // Label permissions
    canCreateLabel: true,
    canApplyLabel: true,
    canRemoveLabel: true,
    
    // Note permissions
    canCreateNote: true,
    canViewNotes: true,
    canEditOwnNotes: true,
    canEditAllNotes: true,
    
    // Workflow permissions
    canChangeWorkflowStatus: true,
    canViewSLA: true,
    
    // Analytics permissions
    canViewAnalytics: true,
    canViewOwnAnalytics: true,
    canViewTeamAnalytics: true,
  },
}

/**
 * Get permissions for a specific role
 */
export function getPermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: keyof RolePermissions
): boolean {
  return ROLE_PERMISSIONS[role][permission]
}
