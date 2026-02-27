// app/api/admin/force-logout-agents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const POST = withAuth(async (req, ctx) => {
  // Get all agent user IDs
  const { data: agents, error: agentsError } = await ctx.supabase
    .from('profiles')
    .select('id')
    .eq('role', 'agent')

  if (agentsError) {
    console.error('Error fetching agents:', agentsError)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }

  // Sign out all agents by invalidating their sessions
  let loggedOutCount = 0
  const agentsList = (agents || []) as Array<{ id: string }>
  for (const agent of agentsList) {
    try {
      // Sign out user (requires service role key)
      await ctx.serviceClient.auth.admin.signOut(agent.id)
      loggedOutCount++
    } catch (error) {
      console.error(`Failed to logout agent ${agent.id}:`, error)
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
    .eq('role', 'agent')

  return NextResponse.json({
    success: true,
    message: `Force logged out ${loggedOutCount} agents and reset statuses`,
    loggedOutCount
  })
}, { roles: ['owner'] })
