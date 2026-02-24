import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ConversationEffectivenessResponse {
  conversationsPerAgent: Array<{
    agentId: string
    agentName: string
    count: number
    avgResponseTime: number
  }>
  avgResponseTimeOverTime: Array<{
    timestamp: string
    avgSeconds: number
  }>
  slaCompliance: {
    percentage: number
    compliant: number
    nonCompliant: number
  }
  resolvedVsOpen: {
    resolved: number
    open: number
    percentage: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'agent'
    const isAgent = userRole === 'agent'

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const dateRange = searchParams.get('dateRange') || 'today'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate date range
    let startDateTime: Date
    let endDateTime = new Date()

    if (startDate && endDate) {
      startDateTime = new Date(startDate)
      endDateTime = new Date(endDate)
    } else {
      switch (dateRange) {
        case 'week':
          startDateTime = new Date()
          startDateTime.setDate(startDateTime.getDate() - 7)
          break
        case 'month':
          startDateTime = new Date()
          startDateTime.setMonth(startDateTime.getMonth() - 1)
          break
        case 'today':
        default:
          startDateTime = new Date()
          startDateTime.setHours(0, 0, 0, 0)
          break
      }
    }

    // 1. Conversations per agent
    let conversationsQuery = supabase
      .from('conversations')
      .select(`
        id,
        assigned_to,
        created_at,
        profiles!conversations_assigned_to_fkey(id, full_name)
      `)
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString())
      .not('assigned_to', 'is', null)

    if (isAgent) {
      conversationsQuery = conversationsQuery.eq('assigned_to', user.id)
    }

    const { data: conversations } = await conversationsQuery

    // Get metrics for these conversations
    const conversationIds = conversations?.map(c => c.id) || []
    const { data: metrics } = await supabase
      .from('conversation_metrics')
      .select('conversation_id, agent_id, avg_response_time_seconds')
      .in('conversation_id', conversationIds)

    // Group by agent
    const agentMap = new Map<string, { name: string; count: number; totalResponseTime: number; responseCount: number }>()
    
    conversations?.forEach(conv => {
      const agentId = conv.assigned_to
      const agentName = (conv.profiles as any)?.full_name || 'Unknown'
      
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, { name: agentName, count: 0, totalResponseTime: 0, responseCount: 0 })
      }
      
      const agent = agentMap.get(agentId)!
      agent.count++
      
      // Add response time from metrics
      const metric = metrics?.find(m => m.conversation_id === conv.id)
      if (metric?.avg_response_time_seconds) {
        agent.totalResponseTime += metric.avg_response_time_seconds
        agent.responseCount++
      }
    })

    const conversationsPerAgent = Array.from(agentMap.entries()).map(([agentId, data]) => ({
      agentId,
      agentName: data.name,
      count: data.count,
      avgResponseTime: data.responseCount > 0 ? Math.round(data.totalResponseTime / data.responseCount) : 0
    }))

    // 2. Average response time over time (hourly for today, daily for longer periods)
    const isToday = dateRange === 'today'
    const { data: timeSeriesMetrics } = await supabase
      .from('conversation_metrics')
      .select('created_at, avg_response_time_seconds')
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString())
      .not('avg_response_time_seconds', 'is', null)
      .order('created_at', { ascending: true })

    // Group by hour or day
    const timeMap = new Map<string, { total: number; count: number }>()
    timeSeriesMetrics?.forEach(metric => {
      const date = new Date(metric.created_at)
      const key = isToday 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      
      if (!timeMap.has(key)) {
        timeMap.set(key, { total: 0, count: 0 })
      }
      
      const entry = timeMap.get(key)!
      entry.total += metric.avg_response_time_seconds || 0
      entry.count++
    })

    const avgResponseTimeOverTime = Array.from(timeMap.entries()).map(([timestamp, data]) => ({
      timestamp,
      avgSeconds: Math.round(data.total / data.count)
    }))

    // 3. SLA Compliance (5 minutes = 300 seconds)
    const slaThreshold = 300
    const compliant = metrics?.filter(m => (m.avg_response_time_seconds || 0) <= slaThreshold).length || 0
    const nonCompliant = metrics?.filter(m => (m.avg_response_time_seconds || 0) > slaThreshold).length || 0
    const total = compliant + nonCompliant
    const slaPercentage = total > 0 ? (compliant / total) * 100 : 100

    // 4. Resolved vs Open
    let resolvedQuery = supabase
      .from('conversations')
      .select('status', { count: 'exact' })
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString())

    if (isAgent) {
      resolvedQuery = resolvedQuery.eq('assigned_to', user.id)
    }

    const { count: totalConversations } = await resolvedQuery
    
    const { count: resolvedCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved')
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString())

    const openCount = (totalConversations || 0) - (resolvedCount || 0)
    const resolvedPercentage = totalConversations ? (resolvedCount || 0) / totalConversations * 100 : 0

    const response: ConversationEffectivenessResponse = {
      conversationsPerAgent,
      avgResponseTimeOverTime,
      slaCompliance: {
        percentage: Math.round(slaPercentage * 10) / 10,
        compliant,
        nonCompliant
      },
      resolvedVsOpen: {
        resolved: resolvedCount || 0,
        open: openCount,
        percentage: Math.round(resolvedPercentage * 10) / 10
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching conversation effectiveness:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation effectiveness metrics' },
      { status: 500 }
    )
  }
}
