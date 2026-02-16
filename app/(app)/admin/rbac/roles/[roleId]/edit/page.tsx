'use client'

// Edit Role Page
// Form untuk edit existing role dan permissions

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  ArrowLeft, 
  Save, 
  AlertCircle,
  Check,
  Search,
  Trash2
} from 'lucide-react'
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'
import { createClient } from '@/lib/supabase/client'

interface Permission {
  id: string
  permission_key: string
  permission_name: string
  module: string
  resource: string | null
  action: string
  description: string | null
}

interface Role {
  id: string
  role_key: string
  role_name: string
  description: string | null
  is_system_role: boolean
  is_active: boolean
  permissions: Permission[]
}

export default function EditRolePage() {
  const router = useRouter()
  const params = useParams()
  const roleId = params.roleId as string
  
  const { hasPermission } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [role, setRole] = useState<Role | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleKey, setRoleKey] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  
  // Data state
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()
  const canEdit = hasPermission('role.edit')
  const canDelete = hasPermission('role.delete')

  useEffect(() => {
    loadData()
  }, [roleId])

  async function loadData() {
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
      setRoleName(roleWithPerms.role_name)
      setRoleKey(roleWithPerms.role_key)
      setDescription(roleWithPerms.description || '')
      setSelectedPermissions(new Set(roleWithPerms.permissions.map((p: Permission) => p.permission_key)))

      // Load all permissions
      const { data: permsData, error: permsError } = await supabase
        .from('permissions')
        .select('*')
        .order('module, permission_name')

      if (permsError) throw permsError
      setAllPermissions(permsData || [])

    } catch (err: any) {
      console.error('Error loading role:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(permissionKey: string) {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionKey)) {
      newSelected.delete(permissionKey)
    } else {
      newSelected.add(permissionKey)
    }
    setSelectedPermissions(newSelected)
  }

  function toggleModule(module: string) {
    const modulePerms = allPermissions
      .filter(p => p.module === module)
      .map(p => p.permission_key)
    
    const allSelected = modulePerms.every(key => selectedPermissions.has(key))
    const newSelected = new Set(selectedPermissions)
    
    if (allSelected) {
      modulePerms.forEach(key => newSelected.delete(key))
    } else {
      modulePerms.forEach(key => newSelected.add(key))
    }
    
    setSelectedPermissions(newSelected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!canEdit) {
      setError('You do not have permission to edit roles')
      return
    }

    if (!roleName) {
      setError('Role name is required')
      return
    }

    if (selectedPermissions.size === 0) {
      setError('Please select at least one permission')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Update role
      const { error: roleError } = await supabase
        .from('roles')
        .update({
          role_name: roleName,
          description: description || null
        })
        .eq('id', roleId)

      if (roleError) throw roleError

      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      if (deleteError) throw deleteError

      // Get permission IDs
      const permissionIds = allPermissions
        .filter(p => selectedPermissions.has(p.permission_key))
        .map(p => p.id)

      // Assign new permissions
      const rolePermissions = permissionIds.map(permId => ({
        role_id: roleId,
        permission_id: permId
      }))

      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions)

      if (permError) throw permError

      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/rbac')
      }, 1500)

    } catch (err: any) {
      console.error('Error updating role:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!canDelete) {
      setError('You do not have permission to delete roles')
      return
    }

    if (role?.is_system_role) {
      setError('Cannot delete system roles')
      return
    }

    if (!confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error

      router.push('/admin/rbac')
    } catch (err: any) {
      console.error('Error deleting role:', err)
      setError(err.message)
      setSaving(false)
    }
  }

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = []
    }
    acc[perm.module].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Filter permissions by search
  const filteredModules = Object.entries(permissionsByModule).reduce((acc, [module, perms]) => {
    const filtered = perms.filter(p => 
      p.permission_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.permission_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (filtered.length > 0) {
      acc[module] = filtered
    }
    return acc
  }, {} as Record<string, Permission[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading role...</p>
        </div>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              You don't have permission to edit roles.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/admin/rbac')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to RBAC
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin/rbac')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to RBAC
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Edit Role
            </h1>
            <p className="text-gray-600 mt-2">
              Modify role details and permissions
            </p>
          </div>
          
          {canDelete && !role?.is_system_role && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Role
            </Button>
          )}
        </div>
      </div>

      {success && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <p>Role updated successfully! Redirecting...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Role Details</CardTitle>
              <CardDescription>
                Basic information about the role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {role?.is_system_role && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    This is a system role. Role key cannot be changed.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g., Customer Support Agent"
                  disabled={saving}
                />
              </div>

              <div>
                <Label htmlFor="roleKey">Role Key</Label>
                <Input
                  id="roleKey"
                  value={roleKey}
                  disabled={true}
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Role key cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the role's purpose and responsibilities"
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">
                  Selected Permissions: {selectedPermissions.size}
                </p>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || selectedPermissions.size === 0}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Permissions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                Select permissions for this role
              </CardDescription>
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search permissions..."
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(filteredModules).map(([module, perms]) => {
                  const allSelected = perms.every(p => selectedPermissions.has(p.permission_key))
                  const someSelected = perms.some(p => selectedPermissions.has(p.permission_key))
                  
                  return (
                    <div key={module} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleModule(module)}
                            className={someSelected && !allSelected ? 'opacity-50' : ''}
                          />
                          <h3 className="font-semibold capitalize">{module} Module</h3>
                          <Badge variant="secondary">
                            {perms.filter(p => selectedPermissions.has(p.permission_key)).length} / {perms.length}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 ml-6">
                        {perms.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded"
                          >
                            <Checkbox
                              checked={selectedPermissions.has(perm.permission_key)}
                              onCheckedChange={() => togglePermission(perm.permission_key)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {perm.permission_key}
                                </code>
                                <Badge variant="outline" className="text-xs">
                                  {perm.action}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mt-1">
                                {perm.permission_name}
                              </p>
                              {perm.description && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
