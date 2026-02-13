// API Route: Single Role Management
// GET /api/rbac/roles/[roleId] - Get role details
// PATCH /api/rbac/roles/[roleId] - Update role
// DELETE /api/rbac/roles/[roleId] - Delete role

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/middleware'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const supabase = await createClient()
    const { roleId } = await params
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get role with permissions
    const { data: role, error: roleError } = await supabase
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
  } catch (error) {
    console.error('Error in get role API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    // Check permission
    const hasPermission = await requirePermission('role.edit')
    if (hasPermission !== true) return hasPermission

    const supabase = await createClient()
    const { roleId } = await params
    const body = await request.json()
    
    const { role_name, description, permission_ids } = body

    // Update role basic info
    const { data: role, error: roleError } = await supabase
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
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      // Insert new permissions
      if (permission_ids.length > 0) {
        const rolePermissions = permission_ids.map((permId: string) => ({
          role_id: roleId,
          permission_id: permId,
        }))

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(rolePermissions)

        if (permError) {
          console.error('Error updating permissions:', permError)
        }
      }
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Error in update role API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    // Check permission
    const hasPermission = await requirePermission('role.delete')
    if (hasPermission !== true) return hasPermission

    const supabase = await createClient()
    const { roleId } = await params

    // Check if role is master template
    const { data: role } = await supabase
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
    const { error: deleteError } = await supabase
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
  } catch (error) {
    console.error('Error in delete role API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
