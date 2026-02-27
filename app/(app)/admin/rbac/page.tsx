'use client'

// RBAC Management Page
// Admin interface untuk manage roles dan permissions

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Users, 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  AlertCircle 
} from 'lucide-react'
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';
import { createClient } from '@/lib/supabase/client'

interface Role {
  id: string
  role_name: string
  description: string | null
  is_master_template: boolean
  permissions: Permission[]
}

interface Permission {
  id: string
  permission_key: string
  permission_name: string
  module: string
  page: string | null
  action: string
  description: string | null
}

interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_at: string
  user: {
    full_name: string
  }
  role: {
    role_name: string
  }
}

export default function RBACManagementPage() {
  const router = useRouter()
  const { hasPermission, loading: permLoading } = usePermissions()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Check permissions
  const canViewRoles = hasPermission('role.view')
  const canCreateRoles = hasPermission('role.create')
  const canEditRoles = hasPermission('role.edit')
  const canDeleteRoles = hasPermission('role.delete')
  const canAssignRoles = hasPermission('role.assign')

  useEffect(() => {
    if (!permLoading) {
      loadData()
    }
  }, [permLoading])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      // Load roles with permissions
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            permission:permissions (*)
          )
        `)
        .order('role_name')

      if (rolesError) throw rolesError

      // Transform data
      const rolesWithPermissions = (rolesData as any[])?.map((role: any) => ({
        ...role,
        permissions: role.role_permissions?.map((rp: any) => rp.permission) || []
      }))

      setRoles(rolesWithPermissions || [])

      // Load all permissions
      const { data: permsData, error: permsError } = await supabase
        .from('permissions')
        .select('*')
        .order('module, permission_name')

      if (permsError) throw permsError
      setPermissions(permsData || [])

      // Load user role assignments
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          *,
          user:profiles!user_roles_user_id_fkey (
            full_name
          ),
          role:roles!user_roles_role_id_fkey (
            role_name
          )
        `)
        .order('assigned_at', { ascending: false })

      if (userRolesError) throw userRolesError
      setUserRoles(userRolesData as any || [])

    } catch (err: any) {
      console.error('Error loading RBAC data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = []
    }
    acc[perm.module].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vx-text mx-auto"></div>
          <p className="mt-4 text-vx-text-secondary">Loading RBAC data...</p>
        </div>
      </div>
    )
  }

  if (!canViewRoles) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-vx-text-secondary">
              You don't have permission to view roles and permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PermissionGuard 
      permission={['role.view']}
      fallback={
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      }
    >
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          RBAC Management
        </h1>
        <p className="text-vx-text-secondary mt-2">
          Manage roles, permissions, and user access control
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Permissions ({permissions.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Assignments ({userRoles.length})
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Roles</h2>
              <p className="text-sm text-vx-text-secondary">
                Manage user roles and their permissions
              </p>
            </div>
            {canCreateRoles && (
              <Button onClick={() => router.push('/admin/rbac/roles/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {role.role_name}
                        {role.is_master_template && (
                          <Badge variant="secondary">Master Template</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {role.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {canEditRoles && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/admin/rbac/roles/${role.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Permissions ({role.permissions.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.slice(0, 10).map((perm) => (
                        <Badge key={perm.id} variant="outline">
                          {perm.permission_key}
                        </Badge>
                      ))}
                      {role.permissions.length > 10 && (
                        <Badge variant="secondary">
                          +{role.permissions.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Permissions</h2>
            <p className="text-sm text-vx-text-secondary">
              All available permissions in the system
            </p>
          </div>

          <div className="space-y-6">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <Card key={module}>
                <CardHeader>
                  <CardTitle className="capitalize">{module} Module</CardTitle>
                  <CardDescription>
                    {perms.length} permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-vx-surface-hover"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-vx-surface-hover px-2 py-1 rounded">
                              {perm.permission_key}
                            </code>
                            <Badge variant="outline" className="text-xs">
                              {perm.action}
                            </Badge>
                          </div>
                          <p className="text-sm text-vx-text-secondary mt-1">
                            {perm.permission_name}
                          </p>
                          {perm.description && (
                            <p className="text-xs text-vx-text-muted mt-1">
                              {perm.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">User Role Assignments</h2>
              <p className="text-sm text-vx-text-secondary">
                View and manage user role assignments
              </p>
            </div>
            {canAssignRoles && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Role
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {userRoles.map((ur) => (
                  <div
                    key={ur.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-vx-surface-hover"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{ur.user?.full_name || 'Unknown User'}</p>
                      <p className="text-sm text-vx-text-secondary">User ID: {ur.user_id.slice(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge>{ur.role.role_name}</Badge>
                      <p className="text-xs text-vx-text-muted">
                        {new Date(ur.assigned_at).toLocaleDateString()}
                      </p>
                      {canAssignRoles && (
                        <Button variant="outline" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGuard>
  )
}
