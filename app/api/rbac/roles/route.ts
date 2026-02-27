// API Route: Role Management
// GET /api/rbac/roles - Get all roles
// POST /api/rbac/roles - Create new role

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
  // Get all roles with their permissions
  const { data: roles, error: rolesError } = await ctx.supabase
    .from('roles')
    .select(`
      *,
      role_permissions (
        permission:permissions (*)
      )
    `)
    .order('role_name')

  if (rolesError) {
    console.error('Error fetching roles:', rolesError)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }

  // Transform data
  const rolesWithPermissions = (roles as any[])?.map((role: any) => ({
    ...role,
    permissions: role.role_permissions?.map((rp: any) => rp.permission) || []
  }))

  return NextResponse.json({ roles: rolesWithPermissions || [] })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  
  const { role_name, description, permission_ids } = body

  if (!role_name) {
    return NextResponse.json(
      { error: 'Role name is required' },
      { status: 400 }
    )
  }

  // Create role
  const { data: role, error: roleError } = await ctx.supabase
    .from('roles')
    // @ts-ignore - Supabase type inference issue
    .insert({
      role_name,
      description,
      is_master_template: false,
    })
    .select()
    .single()

  if (roleError) {
    console.error('Error creating role:', roleError)
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }

  // Assign permissions if provided
  const roleData = role as any
  if (permission_ids && permission_ids.length > 0) {
    const rolePermissions = permission_ids.map((permId: string) => ({
      role_id: roleData.id,
      permission_id: permId,
    }))

    const { error: permError } = await ctx.supabase
      .from('role_permissions')
      // @ts-ignore - Supabase type inference issue
      .insert(rolePermissions)

    if (permError) {
      console.error('Error assigning permissions:', permError)
      // Don't fail the request, role is already created
    }
  }

  return NextResponse.json({ role }, { status: 201 })
}, { permission: 'role.create' })
