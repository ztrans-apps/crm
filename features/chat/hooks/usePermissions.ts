// Hook for checking user permissions — Dynamic RBAC
import { useMemo, useEffect, useState } from 'react'
import { getAvailableActions, getUserPermissions } from '@/lib/rbac/chat-permissions'

interface UsePermissionsProps {
  role: string  // kept for backward compat but not used for access control
  userId: string | null
  conversation?: any
}

export function usePermissions({ role, userId, conversation }: UsePermissionsProps) {
  const [conversationActions, setConversationActions] = useState({
    canSendMessage: false,
    canPick: false,
    canAssign: false,
    canHandover: false,
    canClose: false,
    canEditContact: false,
    canApplyLabel: false,
    canCreateNote: false,
    canChangeStatus: false,
  })
  
  const [userPerms, setUserPerms] = useState<Set<string>>(new Set())
  
  // Load user permissions dynamically from DB
  useEffect(() => {
    if (!userId) return
    getUserPermissions(userId).then(setUserPerms)
  }, [userId])
  
  useEffect(() => {
    if (!conversation || !userId) {
      setConversationActions({
        canSendMessage: false,
        canPick: false,
        canAssign: false,
        canHandover: false,
        canClose: false,
        canEditContact: false,
        canApplyLabel: false,
        canCreateNote: false,
        canChangeStatus: false,
      })
      return
    }
    
    getAvailableActions(userId, conversation).then(setConversationActions)
  }, [userId, conversation])
  
  const permissions = useMemo(() => ({
    // Dynamic permission checks — no hardcoded role names
    canViewAllConversations: userPerms.has('chat.view.all') || userPerms.has('chat.view_all'),
    canManageAgents: userPerms.has('chat.assign') || userPerms.has('user.manage_roles'),
    canEditContact: conversationActions.canEditContact,
    canApplyLabel: conversationActions.canApplyLabel,
    canCreateNote: conversationActions.canCreateNote,
    canChangeWorkflowStatus: conversationActions.canChangeStatus,
    canClose: conversationActions.canClose,
  }), [userPerms, conversationActions])
  
  return {
    permissions,
    conversationActions,
    userPermissions: userPerms,
  }
}
