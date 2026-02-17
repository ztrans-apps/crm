'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, Trash2, Search } from 'lucide-react'

interface Permission {
  id: string
  permission_key: string
  permission_name: string
  module: string
  resource: string
  action: string
  description: string
}

interface Role {
  id: string
  role_key: string
  role_name: string
  description: string
  permissions: Permission[]
}

export default function EditRolePage() {
  const router = useRouter()
  const params = useParams()
  const roleId = params.roleId as string
  
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('role.edit')
  const canDelete = hasPermission('role.delete')

  const [role, setRole] = useState<Role | null>(null)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [roleId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load role with permissions
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            permission:permissions (*)
          )
        `)
        .eq('id', roleId)
        .single()

      if (roleError) throw roleError

      const roleWithPerms = {
        ...roleData,
        permissions: roleData.role_permissions?.map((rp: any) => rp.permission) || []
      }

      setRole(roleWithPerms)
      setSelectedPermissions(new Set(roleWithPerms.permissions.map((p: Permission) => p.id)))

      // Load all permissions
      const { data: perms, error: permsError } = await supabase
        .from('permissions')
        .select('*')
        .order('module, permission_name')

      if (permsError) throw permsError
      setAllPermissions(perms || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!canEdit) {
      setError('You do not have permission to edit roles')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('roles')
        .update({
          role_name: role?.role_name,
          description: role?.description,
        })
        .eq('id', roleId)

      if (updateError) throw updateError

      // Update permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      if (selectedPermissions.size > 0) {
        const rolePermissions = Array.from(selectedPermissions).map(permId => ({
          role_id: roleId,
          permission_id: permId,
        }))

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(rolePermissions)

        if (permError) throw permError
      }

      router.push('/admin/rbac')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete) {
      setError('You do not have permission to delete roles')
      return
    }

    if (!confirm(`Are you sure you want to delete role "${role?.role_name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error
      router.push('/admin/rbac')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const togglePermission = (permId: string) => {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permId)) {
      newSelected.delete(permId)
    } else {
      newSelected.add(permId)
    }
    setSelectedPermissions(newSelected)
  }

  // Group permissions by module
  const modules = Array.from(new Set(allPermissions.map(p => p.module)))
  const modulePermissions = modules.map(module => ({
    module,
    count: allPermissions.filter(p => p.module === module).length,
    permissions: allPermissions.filter(p => p.module === module)
  }))

  // Filter permissions
  const filteredModules = modulePermissions.filter(m => {
    if (selectedModule && m.module !== selectedModule) return false
    if (searchQuery) {
      return m.permissions.some(p => 
        p.permission_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return true
  })

  const displayedPermissions = selectedModule
    ? allPermissions.filter(p => p.module === selectedModule)
    : allPermissions

  const filteredPermissions = displayedPermissions.filter(p => {
    if (!searchQuery) return true
    return p.permission_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading role...</p>
        </div>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">You don't have permission to edit roles.</p>
            <Button onClick={() => router.push('/admin/rbac')} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/rbac')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Role: {role?.role_name}</h1>
            <p className="text-gray-600 mt-1">Manage role permissions</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Module Filter */}
            <div className="col-span-3 border-r pr-6">
              <div className="mb-4">
                <Input
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedModule(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedModule === null
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  All Modules ({allPermissions.length})
                </button>
                {modulePermissions.map(({ module, count }) => (
                  <button
                    key={module}
                    onClick={() => setSelectedModule(module)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedModule === module
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="capitalize">{module}</span>
                      <span className="text-xs text-gray-500">({count})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Content - Permissions */}
            <div className="col-span-9">
              <div className="mb-4">
                <h3 className="text-lg font-semibold capitalize">
                  {selectedModule || 'All'} Permissions
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedPermissions.size} of {allPermissions.length} permissions selected
                </p>
              </div>

              <div className="space-y-3">
                {filteredPermissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {permission.permission_name}
                      </div>
                      {permission.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {permission.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {permission.permission_key}
                      </div>
                    </div>
                    <Switch
                      checked={selectedPermissions.has(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                  </div>
                ))}

                {filteredPermissions.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No permissions found matching your search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
