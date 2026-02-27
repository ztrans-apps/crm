// API Route: Get User Permissions
// GET /api/rbac/permissions - Get current user's permissions

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
  // Get user permissions
  const { data: permissions, error: permError } = await ctx.serviceClient
    // @ts-ignore - Supabase RPC type inference issue
    .rpc('get_user_permissions', { p_user_id: ctx.user.id })

  if (permError) {
    console.error('Error fetching permissions:', permError)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }

  // Get user roles
  const { data: roles, error: roleError } = await ctx.serviceClient
    // @ts-ignore - Supabase RPC type inference issue
    .rpc('get_user_roles', { p_user_id: ctx.user.id })

  if (roleError) {
    console.error('Error fetching roles:', roleError)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    permissions: permissions || [],
    roles: roles || [],
  })
})
