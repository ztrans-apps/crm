// app/api/admin/debug-agent-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
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

  // Get profiles for those agents
  const { data: agents, error } = await ctx.supabase
    .from('profiles')
    .select('id, email, full_name, agent_status, updated_at')
    .in('id', agentIds.length > 0 ? agentIds : ['__none__'])
    .order('email')

  if (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    agents,
    count: agents?.length || 0
  })
}, { permission: 'admin.access' })

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { agentId, status } = body

  if (!agentId || !status) {
    return NextResponse.json(
      { error: 'agentId and status are required' },
      { status: 400 }
    )
  }

  // Update specific agent status (no role filter - dynamic RBAC)
  const { data, error } = await ctx.supabase
    .from('profiles')
    // @ts-ignore - Supabase type inference issue
    .update({
      agent_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', agentId)
    .select()

  if (error) {
    console.error('Error updating agent status:', error)
    return NextResponse.json(
      { error: 'Failed to update agent status' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Agent status updated',
    data
  })
}, { permission: 'admin.access' })
