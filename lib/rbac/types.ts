// RBAC System Types
// Type definitions untuk Role-Based Access Control

export interface Role {
  id: string
  role_name: string
  description: string | null
  is_master_template: boolean
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  permission_key: string
  permission_name: string
  module: string
  page: string | null
  action: string
  description: string | null
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_at: string
  assigned_by: string | null
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

// Extended types with relations
export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export interface UserWithRoles {
  id: string
  email: string
  full_name: string
  roles: Role[]
  permissions: Permission[]
}

// Permission check result
export interface PermissionCheck {
  hasPermission: boolean
  reason?: string
}

// Permission context for components
export interface PermissionContext {
  permissions: Set<string>
  roles: Role[]
  loading: boolean
  hasPermission: (key: string) => boolean
  hasAnyPermission: (keys: string[]) => boolean
  hasAllPermissions: (keys: string[]) => boolean
  can: (key: string) => boolean
}

// Role assignment form
export interface RoleAssignmentForm {
  user_id: string
  role_ids: string[]
}

// Role creation form
export interface RoleForm {
  role_name: string
  description: string
  permission_ids: string[]
}

// Permission matrix for UI
export interface PermissionMatrix {
  module: string
  permissions: {
    [action: string]: {
      permission: Permission
      granted: boolean
    }
  }
}

// Grouped permissions for display
export interface GroupedPermissions {
  [module: string]: Permission[]
}
