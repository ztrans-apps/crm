'use client'

// Admin Page: Role Management
// Halaman untuk manage roles dan permissions

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PermissionGuard } from '@/lib/rbac'
import type { Role, Permission } from '@/lib/rbac/types'
import { toast } from '@/lib/stores/toast-store'

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
        toast.error(error.error || 'Failed to delete role')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      toast.error('Failed to delete role')
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
          <div className="text-center text-red-600 dark:text-red-400">
            You don't have permission to view roles
          </div>
        </div>
      }
    >
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-vx-text">Role Management</h1>
            <p className="text-vx-text-secondary mt-1">Manage roles and their permissions</p>
          </div>
          
          <PermissionGuard permission="role.create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 bg-vx-purple text-white rounded-lg hover:bg-vx-purple/90 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Role
            </button>
          </PermissionGuard>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-vx-surface rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-vx-text-secondary mb-1">Total Roles</p>
                <p className="text-3xl font-bold text-vx-text">{roles.length}</p>
              </div>
              <div className="w-12 h-12 bg-vx-purple/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-vx-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-vx-surface rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-vx-text-secondary mb-1">Total Permissions</p>
                <p className="text-3xl font-bold text-vx-text">{allPermissions.length}</p>
              </div>
              <div className="w-12 h-12 bg-vx-teal/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-vx-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-vx-surface rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-vx-text-secondary mb-1">Master Templates</p>
                <p className="text-3xl font-bold text-vx-text">
                  {roles.filter(r => r.is_master_template).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-vx-purple/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-vx-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div className="bg-vx-surface rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-vx-surface-elevated border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vx-border">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-vx-surface-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {role.role_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-vx-text">
                            {role.role_name}
                          </div>
                          {role.description && (
                            <div className="text-xs text-vx-text-muted truncate max-w-[200px]">
                              {role.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-vx-text max-w-xs truncate">
                        {role.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-vx-purple/10 text-vx-purple">
                          {role.permissions.length} permissions
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {role.is_master_template ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-vx-purple/10 text-vx-purple">
                          Master Template
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-vx-surface-hover text-vx-text">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGuard permission="role.edit">
                          <button
                            onClick={() => setSelectedRole(role)}
                            className="inline-flex items-center px-3 py-1.5 border border-vx-border rounded-md text-sm font-medium text-vx-text-secondary bg-vx-surface hover:bg-vx-surface-hover transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        </PermissionGuard>

                        <PermissionGuard permission="role.delete">
                          {!role.is_master_template && (
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-600 dark:text-red-400 bg-vx-surface hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {roles.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-vx-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-vx-text">No roles</h3>
              <p className="mt-1 text-sm text-vx-text-muted">Get started by creating a new role.</p>
            </div>
          )}
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  function togglePermission(permId: string) {
    const newSet = new Set(selectedPermissions)
    if (newSet.has(permId)) {
      newSet.delete(permId)
    } else {
      newSet.add(permId)
    }
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
        toast.error(error.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  // Get modules with counts
  const modules = Object.keys(permissionsByModule).map(module => ({
    name: module,
    count: permissionsByModule[module].length
  }))

  // Filter permissions
  const displayedPermissions = selectedModule
    ? permissionsByModule[selectedModule] || []
    : allPermissions

  const filteredPermissions = displayedPermissions.filter(p => {
    if (!searchQuery) return true
    return p.permission_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-vx-surface rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Edit Role: {role.role_name}</h2>
            <button
              onClick={onClose}
              className="text-vx-text-muted hover:text-vx-text-secondary"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-vx-text-secondary mt-1">
            Manage role permissions. Use Search to filter the permissions below.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Sidebar - Module Filter */}
          <div className="w-64 border-r p-4 overflow-y-auto">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search for..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div className="space-y-1">
              <button
                onClick={() => setSelectedModule(null)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedModule === null
                    ? 'bg-vx-purple/5 text-vx-purple font-medium'
                    : 'hover:bg-vx-surface-hover text-vx-text-secondary'
                }`}
              >
                All Modules ({allPermissions.length})
              </button>
              
              {modules.map(({ name, count }) => (
                <button
                  key={name}
                  onClick={() => setSelectedModule(name)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedModule === name
                      ? 'bg-vx-purple/5 text-vx-purple font-medium'
                      : 'hover:bg-vx-surface-hover text-vx-text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{name}</span>
                    <span className="text-xs text-vx-text-muted">({count})</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Content - Permissions */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-lg font-semibold capitalize">
                {selectedModule || 'All'} Module
              </h3>
              <p className="text-sm text-vx-text-secondary">
                {selectedPermissions.size} of {allPermissions.length} permissions selected
              </p>
            </div>

            <div className="space-y-3">
              {filteredPermissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-vx-surface-hover transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-vx-text">
                      {permission.permission_name}
                    </div>
                    {permission.description && (
                      <div className="text-sm text-vx-text-secondary mt-1">
                        {permission.description}
                      </div>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.has(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-vx-surface-hover peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-vx-purple/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-vx-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vx-purple"></div>
                  </label>
                </div>
              ))}

              {filteredPermissions.length === 0 && (
                <div className="text-center py-12 text-vx-text-muted">
                  No permissions found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded hover:bg-vx-surface-hover"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-vx-purple text-white rounded hover:bg-vx-purple/90 disabled:opacity-50"
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  function togglePermission(permId: string) {
    const newSet = new Set(selectedPermissions)
    if (newSet.has(permId)) {
      newSet.delete(permId)
    } else {
      newSet.add(permId)
    }
    setSelectedPermissions(newSet)
  }

  async function handleCreate() {
    if (!roleName.trim()) {
      toast.warning('Role name is required')
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
        toast.error(error.error || 'Failed to create role')
      }
    } catch (error) {
      console.error('Error creating role:', error)
      toast.error('Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  // Get modules with counts
  const modules = Object.keys(permissionsByModule).map(module => ({
    name: module,
    count: permissionsByModule[module].length
  }))

  // Filter permissions
  const displayedPermissions = selectedModule
    ? permissionsByModule[selectedModule] || []
    : allPermissions

  const filteredPermissions = displayedPermissions.filter(p => {
    if (!searchQuery) return true
    return p.permission_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-vx-surface rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Role</h2>
              <p className="text-sm text-vx-text-secondary mt-1">
                Set up a new role with specific permissions
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-vx-text-muted hover:text-vx-text-secondary"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="p-6 border-b space-y-4">
          <div>
            <label className="block text-sm font-medium text-vx-text-secondary mb-2">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g., Team Lead"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-vx-purple/30 focus:border-vx-purple"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-vx-text-secondary mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role's purpose..."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-vx-purple/30 focus:border-vx-purple"
            />
          </div>
        </div>

        {/* Permissions Section */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Sidebar - Module Filter */}
          <div className="w-64 border-r p-4 overflow-y-auto">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div className="space-y-1">
              <button
                onClick={() => setSelectedModule(null)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedModule === null
                    ? 'bg-vx-purple/5 text-vx-purple font-medium'
                    : 'hover:bg-vx-surface-hover text-vx-text-secondary'
                }`}
              >
                All Modules ({allPermissions.length})
              </button>
              
              {modules.map(({ name, count }) => (
                <button
                  key={name}
                  onClick={() => setSelectedModule(name)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedModule === name
                      ? 'bg-vx-purple/5 text-vx-purple font-medium'
                      : 'hover:bg-vx-surface-hover text-vx-text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{name}</span>
                    <span className="text-xs text-vx-text-muted">({count})</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Content - Permissions */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-lg font-semibold capitalize">
                {selectedModule || 'All'} Permissions
              </h3>
              <p className="text-sm text-vx-text-secondary">
                {selectedPermissions.size} of {allPermissions.length} permissions selected
              </p>
            </div>

            <div className="space-y-3">
              {filteredPermissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-vx-surface-hover transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-vx-text">
                      {permission.permission_name}
                    </div>
                    {permission.description && (
                      <div className="text-sm text-vx-text-secondary mt-1">
                        {permission.description}
                      </div>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.has(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-vx-surface-hover peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-vx-purple/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-vx-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vx-purple"></div>
                  </label>
                </div>
              ))}

              {filteredPermissions.length === 0 && (
                <div className="text-center py-12 text-vx-text-muted">
                  No permissions found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded-lg hover:bg-vx-surface-hover transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-vx-purple text-white rounded-lg hover:bg-vx-purple/90 disabled:opacity-50 transition-colors"
            disabled={saving || !roleName.trim()}
          >
            {saving ? 'Creating...' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}
