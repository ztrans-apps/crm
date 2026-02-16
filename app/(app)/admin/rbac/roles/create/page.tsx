'use client'

// Create Role Page
// Form untuk create custom role dengan permission assignment

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Search
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

interface RoleTemplate {
  name: string
  description: string
  permissions: string[]
}

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Customer Support Agent',
    description: 'Basic agent with conversation and contact access',
    permissions: [
      'chat.view.assigned',
      'chat.reply',
      'chat.pick',
      'chat.handover',
      'contact.view',
      'contact.edit',
      'label.view',
      'label.apply',
      'note.view',
      'note.create',
      'note.edit.own',
      'analytics.view.own'
    ]
  },
  {
    name: 'Team Lead',
    description: 'Supervisor with team management capabilities',
    permissions: [
      'chat.view.all',
      'chat.view.team',
      'chat.reply',
      'chat.assign',
      'chat.close',
      'chat.reopen',
      'contact.view',
      'contact.create',
      'contact.edit',
      'label.view',
      'label.create',
      'label.apply',
      'note.view',
      'note.create',
      'note.edit.all',
      'broadcast.view',
      'broadcast.create',
      'broadcast.send',
      'analytics.view.team',
      'analytics.view.all'
    ]
  },
  {
    name: 'Marketing Manager',
    description: 'Focused on broadcast and analytics',
    permissions: [
      'contact.view',
      'contact.create',
      'contact.edit',
      'contact.import',
      'contact.export',
      'broadcast.view',
      'broadcast.create',
      'broadcast.edit',
      'broadcast.send',
      'broadcast.schedule',
      'analytics.view.all',
      'analytics.export'
    ]
  },
  {
    name: 'Read-Only Viewer',
    description: 'View-only access for monitoring',
    permissions: [
      'chat.view.all',
      'contact.view',
      'label.view',
      'note.view',
      'broadcast.view',
      'analytics.view.all'
    ]
  }
]

export default function CreateRolePage() {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [roleName, setRoleName] = useState('')
  const [roleKey, setRoleKey] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  
  // Data state
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const supabase = createClient()
  const canCreate = hasPermission('role.create')

  useEffect(() => {
    loadPermissions()
  }, [])

  // Auto-generate role key from name
  useEffect(() => {
    if (roleName && !roleKey) {
      const key = roleName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
      setRoleKey(key)
    }
  }, [roleName])

  async function loadPermissions() {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module, permission_name')

      if (error) throw error
      setPermissions(data || [])
    } catch (err: any) {
      console.error('Error loading permissions:', err)
      setError(err.message)
    }
  }

  function applyTemplate(template: RoleTemplate) {
    setRoleName(template.name)
    setDescription(template.description)
    setSelectedPermissions(new Set(template.permissions))
    setSelectedTemplate(template.name)
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
    const modulePerms = permissions
      .filter(p => p.module === module)
      .map(p => p.permission_key)
    
    const allSelected = modulePerms.every(key => selectedPermissions.has(key))
    const newSelected = new Set(selectedPermissions)
    
    if (allSelected) {
      // Deselect all
      modulePerms.forEach(key => newSelected.delete(key))
    } else {
      // Select all
      modulePerms.forEach(key => newSelected.add(key))
    }
    
    setSelectedPermissions(newSelected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!canCreate) {
      setError('You do not have permission to create roles')
      return
    }

    if (!roleName || !roleKey) {
      setError('Role name and key are required')
      return
    }

    if (selectedPermissions.size === 0) {
      setError('Please select at least one permission')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create role
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .insert({
          role_key: roleKey,
          role_name: roleName,
          description: description || null,
          is_system_role: false,
          is_active: true
        })
        .select()
        .single()

      if (roleError) throw roleError

      // Get permission IDs
      const permissionIds = permissions
        .filter(p => selectedPermissions.has(p.permission_key))
        .map(p => p.id)

      // Assign permissions to role
      const rolePermissions = permissionIds.map(permId => ({
        role_id: role.id,
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
      console.error('Error creating role:', err)
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

  if (!canCreate) {
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
              You don't have permission to create roles.
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
        
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Create New Role
        </h1>
        <p className="text-gray-600 mt-2">
          Create a custom role with specific permissions
        </p>
      </div>

      {success && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <p>Role created successfully! Redirecting...</p>
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
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Details</CardTitle>
              <CardDescription>
                Basic information about the role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g., Customer Support Agent"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="roleKey">Role Key *</Label>
                <Input
                  id="roleKey"
                  value={roleKey}
                  onChange={(e) => setRoleKey(e.target.value)}
                  placeholder="e.g., customer_support_agent"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier (auto-generated from name)
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
                  disabled={loading}
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">
                  Selected Permissions: {selectedPermissions.size}
                </p>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || selectedPermissions.size === 0}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Role'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Role Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Role Templates</CardTitle>
              <CardDescription>
                Start with a pre-configured template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ROLE_TEMPLATES.map((template) => (
                <button
                  key={template.name}
                  onClick={() => applyTemplate(template)}
                  className={`w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                    selectedTemplate === template.name ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  disabled={loading}
                >
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {template.permissions.length} permissions
                  </p>
                </button>
              ))}
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
