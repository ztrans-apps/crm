// API Route: User Role Assignment
// GET /api/rbac/users/[userId]/roles - Get user's roles
// POST /api/rbac/users/[userId]/roles - Assign roles to user
// DELETE /api/rbac/users/[userId]/roles - Remove role from user

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx, params) => {
  const { userId } = await params

  // If viewing another user's roles, check permission
  if (ctx.user.id !== userId) {
    // @ts-ignore - Supabase RPC type inference issue
    const { data: allowed } = await ctx.serviceClient.rpc('user_has_permission', {
      p_user_id: ctx.user.id,
      p_permission_key: 'user.view',
    })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Forbidden', message: "Permission 'user.view' required" },
        { status: 403 }
      )
    }
  }

  // Get user roles
  const { data: roles, error: rolesError } = await ctx.serviceClient
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
})

export const POST = withAuth(async (req, ctx, params) => {
  const { userId } = await params
  const body = await req.json()

  const { role_ids } = body

  if (!role_ids || !Array.isArray(role_ids)) {
    return NextResponse.json(
      { error: 'role_ids array is required' },
      { status: 400 }
    )
  }

  // Assign roles
  const userRoles = role_ids.map((roleId: string) => ({
    user_id: userId,
    role_id: roleId,
    assigned_by: ctx.user.id,
  }))

  const { error: assignError } = await ctx.serviceClient
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
}, { permission: 'user.manage_roles' })

export const DELETE = withAuth(async (req, ctx, params) => {
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const roleId = searchParams.get('role_id')

  if (!roleId) {
    return NextResponse.json(
      { error: 'role_id query parameter is required' },
      { status: 400 }
    )
  }

  // Remove role from user
  const { error: removeError } = await ctx.serviceClient
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
}, { permission: 'user.manage_roles' })
