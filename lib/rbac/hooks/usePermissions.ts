'use client'

// Re-export from provider for backward compatibility
export { usePermissions, type PermissionContextType as PermissionContext } from '../providers/PermissionProvider'

/**
 * Hook to check single permission
 */
export function usePermission(permissionKey: string): boolean {
  const { hasPermission, loading } = usePermissions()
  
  if (loading) return false
  return hasPermission(permissionKey)
}

/**
 * Hook to check if user has specific role
 */
export function useRole(roleKey: string): boolean {
  const { hasRole, loading } = usePermissions()
  
  if (loading) return false
  return hasRole(roleKey)
}
