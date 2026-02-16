'use client'

// Admin Page: Role Management
// Halaman untuk manage roles dan permissions

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PermissionGuard } from '@/lib/rbac'
import type { Role, Permission } from '@/lib/rbac/types'

interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      // Load roles
      const rolesRes = await fetch('/api/rbac/roles')
      const rolesData = await rolesRes.json()
      setRoles(rolesData.roles || [])

      // Load all permissions
      const { data: perms } = await supabase
        .from('permissions')
        .select('*')
        .order('module, action')
      
      setAllPermissions(perms || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      const res = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete role')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Failed to delete role')
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <PermissionGuard 
      permission="role.view"
      fallback={
        <div className="p-8">
          <div className="text-center text-red-600">
            You don't have permission to view roles
          </div>
        </div>
      }
    >
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Role Management</h1>
          
          <PermissionGuard permission="role.create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Role
            </button>
          </PermissionGuard>
        </div>

        <div className="grid gap-6">
          {roles.map((role) => (
            <div key={role.id} className="border rounded-lg p-6 bg-white shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{role.role_name}</h2>
                  {role.description && (
                    <p className="text-gray-600 mt-1">{role.description}</p>
                  )}
                  {role.is_master_template && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Master Template
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <PermissionGuard permission="role.edit">
                    <button
                      onClick={() => setSelectedRole(role)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Edit
                    </button>
                  </PermissionGuard>

                  <PermissionGuard permission="role.delete">
                    {!role.is_master_template && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded"
                      >
                        Delete
                      </button>
                    )}
                  </PermissionGuard>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Permissions ({role.permissions.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.slice(0, 10).map((perm) => (
                    <span
                      key={perm.id}
                      className="px-2 py-1 text-xs bg-gray-100 rounded"
                    >
                      {perm.permission_key}
                    </span>
                  ))}
                  {role.permissions.length > 10 && (
                    <span className="px-2 py-1 text-xs text-gray-500">
                      +{role.permissions.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Role Modal */}
        {selectedRole && (
          <RoleEditModal
            role={selectedRole}
            allPermissions={allPermissions}
            permissionsByModule={permissionsByModule}
            onClose={() => setSelectedRole(null)}
            onSave={() => {
              setSelectedRole(null)
              loadData()
            }}
          />
        )}

        {/* Create Role Modal */}
        {showCreateModal && (
          <RoleCreateModal
            allPermissions={allPermissions}
            permissionsByModule={permissionsByModule}
            onClose={() => setShowCreateModal(false)}
            onSave={() => {
              setShowCreateModal(false)
              loadData()
            }}
          />
        )}
      </div>
    </PermissionGuard>
  )
}

// Role Edit Modal Component
function RoleEditModal({
  role,
  allPermissions,
  permissionsByModule,
  onClose,
  onSave,
}: {
  role: RoleWithPermissions
  allPermissions: Permission[]
  permissionsByModule: Record<string, Permission[]>
  onClose: () => void
  onSave: () => void
}) {
  const [roleName, setRoleName] = useState(role.role_name)
  const [description, setDescription] = useState(role.description || '')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role.permissions.map(p => p.id))
  )
  const [saving, setSaving] = useState(false)

  function togglePermission(permId: string) {
    const newSet = new Set(selectedPermissions)
    if (newSet.has(permId)) {
      newSet.delete(permId)
    } else {
      newSet.add(permId)
    }
    setSelectedPermissions(newSet)
  }

  function toggleModule(module: string) {
    const modulePerms = permissionsByModule[module]
    const allSelected = modulePerms.every(p => selectedPermissions.has(p.id))
    
    const newSet = new Set(selectedPermissions)
    modulePerms.forEach(p => {
      if (allSelected) {
        newSet.delete(p.id)
      } else {
        newSet.add(p.id)
      }
    })
    setSelectedPermissions(newSet)
  }

  async function handleSave() {
    try {
      setSaving(true)

      const res = await fetch(`/api/rbac/roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: roleName,
          description,
          permission_ids: Array.from(selectedPermissions),
        }),
      })

      if (res.ok) {
        onSave()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold">Edit Role: {role.role_name}</h2>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Role Name</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              disabled={role.is_master_template}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Permissions</h3>
            
            {Object.entries(permissionsByModule).map(([module, perms]) => {
              const allSelected = perms.every(p => selectedPermissions.has(p.id))
              const someSelected = perms.some(p => selectedPermissions.has(p.id))

              return (
                <div key={module} className="mb-4 border rounded p-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected
                      }}
                      onChange={() => toggleModule(module)}
                      className="mr-2"
                    />
                    <h4 className="font-medium capitalize">{module}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 ml-6">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="mr-2"
                        />
                        <span className="text-sm">{perm.permission_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Role Create Modal Component
function RoleCreateModal({
  allPermissions,
  permissionsByModule,
  onClose,
  onSave,
}: {
  allPermissions: Permission[]
  permissionsByModule: Record<string, Permission[]>
  onClose: () => void
  onSave: () => void
}) {
  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  function togglePermission(permId: string) {
    const newSet = new Set(selectedPermissions)
    if (newSet.has(permId)) {
      newSet.delete(permId)
    } else {
      newSet.add(permId)
    }
    setSelectedPermissions(newSet)
  }

  function toggleModule(module: string) {
    const modulePerms = permissionsByModule[module]
    const allSelected = modulePerms.every(p => selectedPermissions.has(p.id))
    
    const newSet = new Set(selectedPermissions)
    modulePerms.forEach(p => {
      if (allSelected) {
        newSet.delete(p.id)
      } else {
        newSet.add(p.id)
      }
    })
    setSelectedPermissions(newSet)
  }

  async function handleCreate() {
    if (!roleName.trim()) {
      alert('Role name is required')
      return
    }

    try {
      setSaving(true)

      const res = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: roleName,
          description,
          permission_ids: Array.from(selectedPermissions),
        }),
      })

      if (res.ok) {
        onSave()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create role')
      }
    } catch (error) {
      console.error('Error creating role:', error)
      alert('Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold">Create New Role</h2>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Role Name</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., Team Lead"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={3}
              placeholder="Describe the role's purpose..."
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Permissions</h3>
            
            {Object.entries(permissionsByModule).map(([module, perms]) => {
              const allSelected = perms.every(p => selectedPermissions.has(p.id))
              const someSelected = perms.some(p => selectedPermissions.has(p.id))

              return (
                <div key={module} className="mb-4 border rounded p-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected
                      }}
                      onChange={() => toggleModule(module)}
                      className="mr-2"
                    />
                    <h4 className="font-medium capitalize">{module}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 ml-6">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="mr-2"
                        />
                        <span className="text-sm">{perm.permission_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}
