'use client'

// Permission Guard Component
// Component untuk protect UI elements berdasarkan permission

import { ReactNode } from 'react'
import { usePermissions } from '../hooks/usePermissions'

interface PermissionGuardProps {
  permission: string | string[]
  mode?: 'any' | 'all' // any = has any permission, all = has all permissions
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Guard component that shows children only if user has required permission(s)
 * 
 * @example
 * <PermissionGuard permission="chat.reply">
 *   <button>Send Message</button>
 * </PermissionGuard>
 * 
 * @example
 * <PermissionGuard permission={["chat.assign", "chat.close"]} mode="any">
 *   <button>Manage Chat</button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  mode = 'all',
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  if (loading) {
    return <>{fallback}</>
  }

  // Single permission check
  if (typeof permission === 'string') {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
  }

  // Multiple permissions check
  const hasAccess = mode === 'any' 
    ? hasAnyPermission(permission)
    : hasAllPermissions(permission)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * Show content only if user has permission
 */
export function Can({ 
  permission, 
  children, 
  fallback 
}: { 
  permission: string
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard permission={permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * Show content only if user does NOT have permission
 */
export function Cannot({ 
  permission, 
  children 
}: { 
  permission: string
  children: ReactNode
}) {
  const { hasPermission, loading } = usePermissions()

  if (loading) return null

  return !hasPermission(permission) ? <>{children}</> : null
}
