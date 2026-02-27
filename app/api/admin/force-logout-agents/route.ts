// app/api/admin/force-logout-agents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const POST = withAuth(async (req, ctx) => {
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
      message: 'No agents found to logout',
      loggedOutCount: 0
    })
  }

  // Sign out all agents by invalidating their sessions
  let loggedOutCount = 0
  for (const agentId of agentIds) {
    try {
      await ctx.serviceClient.auth.admin.signOut(agentId)
      loggedOutCount++
    } catch (error) {
      console.error(`Failed to logout agent ${agentId}:`, error)
    }
  }

  // Also reset all agent statuses to offline
  await ctx.supabase
    .from('profiles')
    // @ts-ignore - Supabase type inference issue
    .update({
      agent_status: 'offline',
      updated_at: new Date().toISOString()
    })
    .in('id', agentIds)

  return NextResponse.json({
    success: true,
    message: `Force logged out ${loggedOutCount} agents and reset statuses`,
    loggedOutCount
  })
}, { permission: 'admin.access' })
