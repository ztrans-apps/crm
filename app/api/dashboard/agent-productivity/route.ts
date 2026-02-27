import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const dynamic = 'force-dynamic'

interface AgentProductivityResponse {
  agentMetrics: Array<{
    agentId: string
    agentName: string
    chatsHandled: number
    resolutionRate: number
    idleTime: number
    activeTime: number
    avgHandlingTime: number
    status: 'online' | 'away' | 'offline'
    statusDuration: number
  }>
  workloadDistribution: {
    balanced: number
    overloaded: number
    underutilized: number
  }
}

export const GET = withAuth(async (req, ctx) => {
  // Dynamic: check if user has full analytics access via permissions
  const hasFullAccess = await checkPermissionAP(ctx.serviceClient, ctx.user.id, 'analytics.view.all')
  const isLimitedView = !hasFullAccess

  // Get query params
  const searchParams = req.nextUrl.searchParams
  const period = searchParams.get('period') || 'today' // today, week, month

  // Calculate date range
  let startDate: Date
  const endDate = new Date()

  switch (period) {
    case 'week':
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      break
    case 'month':
      startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)
      break
    case 'today':
    default:
      startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
      break
  }

  // Get all agents (or just current agent if role is agent)
  // Dynamic: get users who have roles (any role = potential agent/user)
  const { data: roleUsers } = await ctx.serviceClient
    .from('user_roles')
    .select('user_id')
  const roleUserIds = roleUsers?.map((r: any) => r.user_id) || []

  let agentsQuery = ctx.supabase
    .from('profiles')
    .select('id, full_name, status')
    .in('id', roleUserIds.length > 0 ? roleUserIds : ['__none__'])

  if (isLimitedView) {
    agentsQuery = agentsQuery.eq('id', ctx.user.id)
  }

  const { data: agents } = await agentsQuery

  if (!agents || agents.length === 0) {
    return NextResponse.json({
      agentMetrics: [],
      workloadDistribution: { balanced: 0, overloaded: 0, underutilized: 0 }
    })
  }

  // Get metrics for each agent
  const agentMetrics = await Promise.all(agents.map(async (agent) => {
    // 1. Chats handled
    const { count: chatsHandled } = await ctx.supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', agent.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // 2. Resolution rate
    const { count: resolvedChats } = await ctx.supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', agent.id)
      .eq('status', 'resolved')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const resolutionRate = chatsHandled ? (resolvedChats || 0) / chatsHandled * 100 : 0

    // 3. Activity logs (idle vs active time)
    const { data: activityLogs } = await ctx.supabase
      .from('agent_activity_logs')
      .select('status, duration_seconds')
      .eq('agent_id', agent.id)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())

    let idleTime = 0
    let activeTime = 0

    activityLogs?.forEach(log => {
      if (log.status === 'away' || log.status === 'offline') {
        idleTime += log.duration_seconds || 0
      } else if (log.status === 'online') {
        activeTime += log.duration_seconds || 0
      }
    })

    // 4. Average handling time
    const { data: conversationMetrics } = await ctx.supabase
      .from('conversation_metrics')
      .select('resolution_time_seconds')
      .eq('agent_id', agent.id)
      .not('resolution_time_seconds', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const avgHandlingTime = conversationMetrics && conversationMetrics.length > 0
      ? Math.round(conversationMetrics.reduce((sum, m) => sum + (m.resolution_time_seconds || 0), 0) / conversationMetrics.length)
      : 0

    // 5. Current status and duration
    const { data: currentActivity } = await ctx.supabase
      .from('agent_activity_logs')
      .select('status, started_at')
      .eq('agent_id', agent.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    const status = (currentActivity?.status as 'online' | 'away' | 'offline') || 'offline'
    const statusDuration = currentActivity?.started_at
      ? Math.floor((Date.now() - new Date(currentActivity.started_at).getTime()) / 1000)
      : 0

    return {
      agentId: agent.id,
      agentName: agent.full_name || 'Unknown',
      chatsHandled: chatsHandled || 0,
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      idleTime,
      activeTime,
      avgHandlingTime,
      status,
      statusDuration
    }
  }))

  // Calculate workload distribution
  const avgChats = agentMetrics.reduce((sum, a) => sum + a.chatsHandled, 0) / agentMetrics.length
  const threshold = 0.3 // 30% deviation

  let balanced = 0
  let overloaded = 0
  let underutilized = 0

  agentMetrics.forEach(agent => {
    const deviation = avgChats > 0 ? (agent.chatsHandled - avgChats) / avgChats : 0
    
    if (deviation > threshold) {
      overloaded++
    } else if (deviation < -threshold) {
      underutilized++
    } else {
      balanced++
    }
  })

  const response: AgentProductivityResponse = {
    agentMetrics,
    workloadDistribution: {
      balanced,
      overloaded,
      underutilized
    }
  }

  return NextResponse.json(response)
})

// Helper to check permission via serviceClient
async function checkPermissionAP(client: any, userId: string, permKey: string): Promise<boolean> {
  try {
    const { data } = await client
      .from('user_roles')
      .select('roles!inner(role_permissions!inner(permissions!inner(permission_key)))')
      .eq('user_id', userId)
    for (const ur of (data || [])) {
      const role = (ur as any).roles
      if (!role?.role_permissions) continue
      for (const rp of role.role_permissions) {
        if (rp.permissions?.permission_key === permKey) return true
      }
    }
    return false
  } catch { return false }
}
