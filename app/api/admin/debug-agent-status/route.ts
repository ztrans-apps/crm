// app/api/admin/debug-agent-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
  // Get all agents with their status
  const { data: agents, error } = await ctx.supabase
    .from('profiles')
    .select('id, email, full_name, role, agent_status, updated_at')
    .eq('role', 'agent')
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
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { agentId, status } = body

  if (!agentId || !status) {
    return NextResponse.json(
      { error: 'agentId and status are required' },
      { status: 400 }
    )
  }

  // Update specific agent status
  const { data, error } = await ctx.supabase
    .from('profiles')
    // @ts-ignore - Supabase type inference issue
    .update({
      agent_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', agentId)
    .eq('role', 'agent')
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
