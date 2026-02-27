// app/api/admin/reset-agent-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

/**
 * POST /api/admin/reset-agent-status
 * Permission: admin.access (enforced by middleware)
 */
export const POST = withAuth(async (request, ctx) => {
  // Dynamic: find users with chat.send permission (agents)
  const { data: roleUsers } = await ctx.serviceClient
    .from('user_roles')
    .select('user_id, roles!inner(role_permissions!inner(permissions!inner(permission_key)))')
  const agentIds: string[] = []
  for (const ur of (roleUsers || [])) {
    const role = (ur as any).roles
    if (!role?.role_permissions) continue
    for (const rp of role.role_permissions) {
      if (rp.permissions?.permission_key === 'chat.send') {
        agentIds.push((ur as any).user_id)
        break
      }
    }
  }

  if (agentIds.length === 0) {
    return NextResponse.json({ 
      success: true,
      message: 'No agents found to reset'
    })
  }

  // @ts-ignore
  const { error } = await ctx.supabase
    .from('profiles')
    .update({ 
      agent_status: 'offline',
      updated_at: new Date().toISOString()
    })
    .in('id', agentIds)

  if (error) {
    console.error('Error resetting agent status:', error)
    return NextResponse.json({ error: 'Failed to reset agent status' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true,
    message: 'All agent statuses reset to offline'
  })
}, { permission: 'admin.access' })
