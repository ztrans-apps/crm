// API Route: Role Management
// GET /api/rbac/roles - Get all roles
// POST /api/rbac/roles - Create new role

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/middleware'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all roles with their permissions
    const { data: roles, error: rolesError } = await supabase
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
  } catch (error) {
    console.error('Error in roles API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Check permission
    const hasPermission = await requirePermission('role.create')
    if (hasPermission !== true) return hasPermission

    const supabase = await createClient()
    const body = await request.json()
    
    const { role_name, description, permission_ids } = body

    if (!role_name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      )
    }

    // Create role
    const { data: role, error: roleError } = await supabase
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

      const { error: permError } = await supabase
        .from('role_permissions')
        // @ts-ignore - Supabase type inference issue
        .insert(rolePermissions)

      if (permError) {
        console.error('Error assigning permissions:', permError)
        // Don't fail the request, role is already created
      }
    }

    return NextResponse.json({ role }, { status: 201 })
  } catch (error) {
    console.error('Error in create role API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
