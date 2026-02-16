// Permission Service - Database-Driven Permission Management
// Replaces hardcoded permission checks with dynamic database queries

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Permission {
  permission_key: string
  permission_name: string
  module: string
  resource: string | null
  action: string
  description: string | null
}

export interface Role {
  role_id: string
  role_key: string
  role_name: string
  description: string | null
}

export interface PermissionCheckResult {
  granted: boolean
  reason?: string
}

/**
 * Permission Service
 * Provides database-driven permission checking
 */
export class PermissionService {
  private supabase: SupabaseClient
  private userId: string | null = null
  private permissionCache: Map<string, boolean> = new Map()
  private cacheExpiry: number = 5 * 60 * 1000 // 5 minutes
  private lastCacheUpdate: number = 0

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient()
  }

  /**
   * Initialize service with user ID
   */
  async init(userId?: string): Promise<void> {
    if (userId) {
      this.userId = userId
    } else {
      const { data: { user } } = await this.supabase.auth.getUser()
      this.userId = user?.id || null
    }
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear()
    this.lastCacheUpdate = 0
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(): boolean {
    return Date.now() - this.lastCacheUpdate > this.cacheExpiry
  }

  /**
   * Get all permissions for current user
   */
  async getUserPermissions(): Promise<Permission[]> {
    if (!this.userId) {
      throw new Error('User not initialized')
    }

    const { data, error } = await this.supabase
      .rpc('get_user_permissions', { p_user_id: this.userId })

    if (error) {
      console.error('Error fetching user permissions:', error)
      throw error
    }

    return data || []
  }

  /**
   * Get all roles for current user
   */
  async getUserRoles(): Promise<Role[]> {
    if (!this.userId) {
      throw new Error('User not initialized')
    }

    const { data, error } = await this.supabase
      .rpc('get_user_roles', { p_user_id: this.userId })

    if (error) {
      console.error('Error fetching user roles:', error)
      throw error
    }

    return data || []
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permissionKey: string): Promise<boolean> {
    if (!this.userId) {
      return false
    }

    // Check cache first
    const cacheKey = `${this.userId}:${permissionKey}`
    if (!this.isCacheExpired() && this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!
    }

    // Query database
    const { data, error } = await this.supabase
      .rpc('user_has_permission', {
        p_user_id: this.userId,
        p_permission_key: permissionKey
      })

    if (error) {
      console.error('Error checking permission:', error)
      return false
    }

    // Update cache
    this.permissionCache.set(cacheKey, data || false)
    this.lastCacheUpdate = Date.now()

    return data || false
  }

  /**
   * Check if user has any of the permissions
   */
  async hasAnyPermission(permissionKeys: string[]): Promise<boolean> {
    if (!this.userId || permissionKeys.length === 0) {
      return false
    }

    const { data, error } = await this.supabase
      .rpc('user_has_any_permission', {
        p_user_id: this.userId,
        p_permission_keys: permissionKeys
      })

    if (error) {
      console.error('Error checking any permission:', error)
      return false
    }

    return data || false
  }

  /**
   * Check if user has all of the permissions
   */
  async hasAllPermissions(permissionKeys: string[]): Promise<boolean> {
    if (!this.userId || permissionKeys.length === 0) {
      return false
    }

    // Check each permission
    const results = await Promise.all(
      permissionKeys.map(key => this.hasPermission(key))
    )

    return results.every(result => result === true)
  }

  /**
   * Check resource-level permission
   * For fine-grained access control (e.g., can edit specific conversation)
   */
  async hasResourcePermission(
    resourceType: string,
    resourceId: string,
    permissionKey: string
  ): Promise<boolean> {
    if (!this.userId) {
      return false
    }

    const { data, error } = await this.supabase
      .rpc('user_has_resource_permission', {
        p_user_id: this.userId,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_permission_key: permissionKey
      })

    if (error) {
      console.error('Error checking resource permission:', error)
      return false
    }

    return data || false
  }

  /**
   * Check if user has specific role
   */
  async hasRole(roleKey: string): Promise<boolean> {
    if (!this.userId) {
      return false
    }

    const roles = await this.getUserRoles()
    return roles.some(role => role.role_key === roleKey)
  }

  /**
   * Check if user has any of the roles
   */
  async hasAnyRole(roleKeys: string[]): Promise<boolean> {
    if (!this.userId || roleKeys.length === 0) {
      return false
    }

    const roles = await this.getUserRoles()
    return roles.some(role => roleKeys.includes(role.role_key))
  }

  /**
   * Grant resource-level permission to user
   */
  async grantResourcePermission(
    userId: string,
    resourceType: string,
    resourceId: string,
    permissionKey: string,
    expiresAt?: Date
  ): Promise<void> {
    const { error } = await this.supabase
      .from('resource_permissions')
      .insert({
        user_id: userId,
        resource_type: resourceType,
        resource_id: resourceId,
        permission_key: permissionKey,
        granted_by: this.userId,
        expires_at: expiresAt?.toISOString()
      })

    if (error) {
      console.error('Error granting resource permission:', error)
      throw error
    }
  }

  /**
   * Revoke resource-level permission from user
   */
  async revokeResourcePermission(
    userId: string,
    resourceType: string,
    resourceId: string,
    permissionKey: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('resource_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('permission_key', permissionKey)

    if (error) {
      console.error('Error revoking resource permission:', error)
      throw error
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string, expiresAt?: Date): Promise<void> {
    // Check if current user has permission to assign roles
    const canAssign = await this.hasPermission('role.assign')
    if (!canAssign) {
      throw new Error('Permission denied: Cannot assign roles')
    }

    const { error } = await this.supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: this.userId,
        expires_at: expiresAt?.toISOString()
      })

    if (error) {
      console.error('Error assigning role:', error)
      throw error
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId: string, roleId: string): Promise<void> {
    // Check if current user has permission to assign roles
    const canAssign = await this.hasPermission('role.assign')
    if (!canAssign) {
      throw new Error('Permission denied: Cannot revoke roles')
    }

    const { error } = await this.supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)

    if (error) {
      console.error('Error revoking role:', error)
      throw error
    }
  }

  /**
   * Audit permission check
   */
  async auditPermissionCheck(
    permissionKey: string,
    result: boolean,
    resourceType?: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('permission_audit_log')
        .insert({
          user_id: this.userId,
          action: 'check',
          permission_key: permissionKey,
          resource_type: resourceType,
          resource_id: resourceId,
          result,
          ip_address: ipAddress,
          user_agent: userAgent
        })
    } catch (error) {
      // Don't throw on audit errors, just log
      console.error('Error auditing permission check:', error)
    }
  }
}

/**
 * Create permission service instance
 */
export async function createPermissionService(userId?: string): Promise<PermissionService> {
  const service = new PermissionService()
  await service.init(userId)
  return service
}

/**
 * Helper: Require permission (throws if not granted)
 */
export async function requirePermission(
  permissionKey: string,
  userId?: string
): Promise<void> {
  const service = await createPermissionService(userId)
  const hasPermission = await service.hasPermission(permissionKey)
  
  if (!hasPermission) {
    throw new Error(`Permission denied: ${permissionKey}`)
  }
}

/**
 * Helper: Require any permission (throws if none granted)
 */
export async function requireAnyPermission(
  permissionKeys: string[],
  userId?: string
): Promise<void> {
  const service = await createPermissionService(userId)
  const hasAny = await service.hasAnyPermission(permissionKeys)
  
  if (!hasAny) {
    throw new Error(`Permission denied: Requires one of ${permissionKeys.join(', ')}`)
  }
}

/**
 * Helper: Require all permissions (throws if any missing)
 */
export async function requireAllPermissions(
  permissionKeys: string[],
  userId?: string
): Promise<void> {
  const service = await createPermissionService(userId)
  const hasAll = await service.hasAllPermissions(permissionKeys)
  
  if (!hasAll) {
    throw new Error(`Permission denied: Requires all of ${permissionKeys.join(', ')}`)
  }
}

/**
 * Helper: Require role (throws if not granted)
 */
export async function requireRole(
  roleKey: string,
  userId?: string
): Promise<void> {
  const service = await createPermissionService(userId)
  const hasRole = await service.hasRole(roleKey)
  
  if (!hasRole) {
    throw new Error(`Permission denied: Requires role ${roleKey}`)
  }
}
