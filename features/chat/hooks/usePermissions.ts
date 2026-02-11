// Hook for checking user permissions
import { useMemo } from 'react'
import { UserRole, getPermissions } from '@/lib/permissions/roles'
import { getAvailableActions } from '@/lib/permissions/chat'

interface UsePermissionsProps {
  role: UserRole
  userId: string | null
  conversation?: any
}

export function usePermissions({ role, userId, conversation }: UsePermissionsProps) {
  const permissions = useMemo(() => getPermissions(role), [role])
  
  const conversationActions = useMemo(() => {
    if (!conversation || !userId) {
      return {
        canSendMessage: false,
        canPick: false,
        canAssign: false,
        canHandover: false,
        canClose: false,
        canEditContact: false,
        canApplyLabel: false,
        canCreateNote: false,
        canChangeStatus: false,
      }
    }
    
    return getAvailableActions(role, userId, conversation)
  }, [role, userId, conversation])
  
  return {
    permissions,
    conversationActions,
  }
}
