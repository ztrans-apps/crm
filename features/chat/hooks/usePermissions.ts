// Hook for checking user permissions
import { useMemo, useEffect, useState } from 'react'
import { UserRole, getAvailableActions } from '@/lib/rbac/chat-permissions'

interface UsePermissionsProps {
  role: UserRole
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
    canViewAllConversations: role === 'owner' || role === 'supervisor',
    canManageAgents: role === 'owner' || role === 'supervisor',
  }), [role])
  
  return {
    permissions,
    conversationActions,
  }
}
