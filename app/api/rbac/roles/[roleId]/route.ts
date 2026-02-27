// API Route: Single Role Management
// GET /api/rbac/roles/[roleId] - Get role details
// PATCH /api/rbac/roles/[roleId] - Update role
// DELETE /api/rbac/roles/[roleId] - Delete role

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx, params) => {
  const { roleId } = await params

  // Get role with permissions
  const { data: role, error: roleError } = await ctx.supabase
    .from('roles')
    .select(`
      *,
      role_permissions (
        permission:permissions (*)
      )
    `)
    .eq('id', roleId)
    .single()

  if (roleError) {
    console.error('Error fetching role:', roleError)
    return NextResponse.json(
      { error: 'Role not found' },
      { status: 404 }
    )
  }

  // Transform data
  const roleData = role as any
  const roleWithPermissions = {
    ...roleData,
    permissions: roleData?.role_permissions?.map((rp: any) => rp.permission) || []
  }

  return NextResponse.json({ role: roleWithPermissions })
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const { roleId } = await params
  const body = await req.json()
  
  const { role_name, description, permission_ids } = body

  // Update role basic info
  const { data: role, error: roleError } = await ctx.supabase
    .from('roles')
    // @ts-ignore - Supabase type inference issue
    .update({
      role_name,
      description,
    })
    .eq('id', roleId)
    .select()
    .single()

  if (roleError) {
    console.error('Error updating role:', roleError)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }

  // Update permissions if provided
  if (permission_ids !== undefined) {
    // Delete existing permissions
    await ctx.supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    // Insert new permissions
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permId: string) => ({
        role_id: roleId,
        permission_id: permId,
      }))

      const { error: permError } = await ctx.supabase
        .from('role_permissions')
        .insert(rolePermissions)

      if (permError) {
        console.error('Error updating permissions:', permError)
      }
    }
  }

  return NextResponse.json({ role })
}, { permission: 'role.edit' })

export const DELETE = withAuth(async (req, ctx, params) => {
  const { roleId } = await params

  // Check if role is master template
  const { data: role } = await ctx.supabase
    .from('roles')
    .select('is_master_template')
    .eq('id', roleId)
    .single()

  const roleData = role as any
  if (roleData?.is_master_template) {
    return NextResponse.json(
      { error: 'Cannot delete master template role' },
      { status: 400 }
    )
  }

  // Delete role (cascade will handle role_permissions and user_roles)
  const { error: deleteError } = await ctx.supabase
    .from('roles')
    .delete()
    .eq('id', roleId)

  if (deleteError) {
    console.error('Error deleting role:', deleteError)
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}, { permission: 'role.delete' })
