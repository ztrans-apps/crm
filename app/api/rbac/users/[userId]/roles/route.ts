// API Route: User Role Assignment
// GET /api/rbac/users/[userId]/roles - Get user's roles
// POST /api/rbac/users/[userId]/roles - Assign roles to user
// DELETE /api/rbac/users/[userId]/roles - Remove role from user

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/middleware'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { userId } = await params
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user can view (either viewing own roles or has user.view permission)
    if (user.id !== userId) {
      const hasPermission = await requirePermission('user.view')
      if (hasPermission !== true) return hasPermission
    }

    // Get user roles
    const { data: roles, error: rolesError } = await supabase
      // @ts-ignore - Supabase RPC type inference issue
      .rpc('get_user_roles', { p_user_id: userId })

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return NextResponse.json(
        { error: 'Failed to fetch user roles' },
        { status: 500 }
      )
    }

    return NextResponse.json({ roles: roles || [] })
  } catch (error) {
    console.error('Error in get user roles API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check permission
    const hasPermission = await requirePermission('user.manage_roles')
    if (hasPermission !== true) return hasPermission

    const supabase = await createClient()
    const { userId } = await params
    const body = await request.json()
    
    const { role_ids } = body

    if (!role_ids || !Array.isArray(role_ids)) {
      return NextResponse.json(
        { error: 'role_ids array is required' },
        { status: 400 }
      )
    }

    // Get current user for assigned_by
    const { data: { user } } = await supabase.auth.getUser()

    // Assign roles
    const userRoles = role_ids.map((roleId: string) => ({
      user_id: userId,
      role_id: roleId,
      assigned_by: user?.id,
    }))

    const { error: assignError } = await supabase
      .from('user_roles')
      // @ts-ignore - Supabase type inference issue
      .upsert(userRoles, { onConflict: 'user_id,role_id' })

    if (assignError) {
      console.error('Error assigning roles:', assignError)
      return NextResponse.json(
        { error: 'Failed to assign roles' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in assign roles API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check permission
    const hasPermission = await requirePermission('user.manage_roles')
    if (hasPermission !== true) return hasPermission

    const supabase = await createClient()
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('role_id')

    if (!roleId) {
      return NextResponse.json(
        { error: 'role_id query parameter is required' },
        { status: 400 }
      )
    }

    // Remove role from user
    const { error: removeError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)

    if (removeError) {
      console.error('Error removing role:', removeError)
      return NextResponse.json(
        { error: 'Failed to remove role' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in remove role API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
