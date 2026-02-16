// Permission Middleware
// Server-side permission checking untuk API routes dan server components

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Permission } from './types'

/**
 * Create permission set from array for fast lookup
 */
export function createPermissionSet(permissions: Permission[]): Set<string> {
  return new Set(permissions.map(p => p.permission_key))
}

/**
 * Check permission from a permission set (for server-side checks)
 */
export function can(permissionSet: Set<string>, permissionKey: string): boolean {
  return permissionSet.has(permissionKey)
}

/**
 * Check if has any permission from set
 */
export function canAny(permissionSet: Set<string>, permissionKeys: string[]): boolean {
  return permissionKeys.some(key => permissionSet.has(key))
}

/**
 * Check if has all permissions from set
 */
export function canAll(permissionSet: Set<string>, permissionKeys: string[]): boolean {
  return permissionKeys.every(key => permissionSet.has(key))
}

/**
 * Check if current user has permission
 * For use in API routes and server components
 */
export async function checkPermission(permissionKey: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase
    // @ts-ignore - Supabase type issue
    .rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission_key: permissionKey
    })

  if (error) {
    console.error('Error checking permission:', error)
    return false
  }

  return data || false
}

/**
 * Require permission middleware for API routes
 * Returns 403 if user doesn't have permission
 * 
 * @example
 * export async function POST(request: Request) {
 *   const hasPermission = await requirePermission('chat.reply')
 *   if (!hasPermission) return hasPermission // Returns 403 response
 *   
 *   // Your logic here
 * }
 */
export async function requirePermission(permissionKey: string) {
  const hasPermission = await checkPermission(permissionKey)
  
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden', message: `Permission '${permissionKey}' required` },
      { status: 403 }
    )
  }

  return true
}

/**
 * Require any of the permissions
 */
export async function requireAnyPermission(permissionKeys: string[]) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check each permission
  for (const key of permissionKeys) {
    // @ts-ignore - Supabase type issue
    const { data } = await supabase
      // @ts-ignore - Supabase type issue
      .rpc('user_has_permission', {
        p_user_id: user.id,
        p_permission_key: key
      })
    
    if (data) return true
  }

  return NextResponse.json(
    { error: 'Forbidden', message: `One of these permissions required: ${permissionKeys.join(', ')}` },
    { status: 403 }
  )
}

/**
 * Require all of the permissions
 */
export async function requireAllPermissions(permissionKeys: string[]) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check each permission
  for (const key of permissionKeys) {
    // @ts-ignore - Supabase type issue
    const { data } = await supabase
      // @ts-ignore - Supabase type issue
      .rpc('user_has_permission', {
        p_user_id: user.id,
        p_permission_key: key
      })
    
    if (!data) {
      return NextResponse.json(
        { error: 'Forbidden', message: `All permissions required: ${permissionKeys.join(', ')}` },
        { status: 403 }
      )
    }
  }

  return true
}

/**
 * Get current user's permissions
 * For use in server components
 */
export async function getUserPermissions() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase
    // @ts-ignore - Supabase type issue
    .rpc('get_user_permissions', { p_user_id: user.id })

  if (error) {
    console.error('Error fetching permissions:', error)
    return []
  }

  return data || []
}

/**
 * Get current user's roles
 */
export async function getUserRoles() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase
    // @ts-ignore - Supabase type issue
    .rpc('get_user_roles', { p_user_id: user.id })

  if (error) {
    console.error('Error fetching roles:', error)
    return []
  }

  return data || []
}
