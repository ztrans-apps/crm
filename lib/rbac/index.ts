// RBAC System Exports - CLIENT SIDE
// Central export file untuk RBAC system
// NOTE: For server-side functions, import directly from './middleware'

// Types
export type {
  Role,
  Permission,
  UserRole,
  RolePermission,
  RoleWithPermissions,
  UserWithRoles,
  PermissionCheck,
  PermissionContext,
  RoleAssignmentForm,
  RoleForm,
  PermissionMatrix,
  GroupedPermissions,
} from './types'

// Client-side functions
export {
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  groupPermissionsByModule,
  createPermissionSet,
  can,
  canAny,
  canAll,
} from './permissions'

// Hooks
export {
  usePermissions,
  usePermission,
  usePermissionCheck,
} from './hooks/usePermissions'

// Components
export {
  PermissionGuard,
  Can,
  Cannot,
} from './components/PermissionGuard'

// NOTE: Server-side middleware functions are NOT exported here
// to avoid "next/headers" errors in client components.
// Import them directly from './middleware' in server components/API routes:
// import { checkPermission, requirePermission } from '@/lib/rbac/middleware'
