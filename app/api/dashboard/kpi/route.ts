// app/api/dashboard/kpi/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withCache, getCacheKey } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

interface KPIMetric {
  value: number | string
  trend: 'up' | 'down' | 'stable'
  change: number
  status?: 'good' | 'warning' | 'critical'
}

interface KPIResponse {
  activeConversations: KPIMetric & { byStatus: Record<string, number> }
  avgResponseTime: KPIMetric & { slaStatus: 'good' | 'warning' | 'critical' }
  whatsappDeliveryRate: KPIMetric
  openTickets: KPIMetric & { byPriority: { high: number; medium: number; low: number } }
  messagesToday: KPIMetric
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

    // Use cache with 30 second TTL
    const cacheKey = getCacheKey('kpi', user.id, userRole)
    const response = await withCache<KPIResponse>(
      cacheKey,
      async () => await fetchKPIMetrics(supabase, user.id, userRole, isAgent),
      30 // 30 seconds TTL
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching KPI metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPI metrics' },
      { status: 500 }
    )
  }
}

async function fetchKPIMetrics(
  supabase: any,
  userId: string,
  userRole: string,
  isAgent: boolean
): Promise<KPIResponse> {
    // Date ranges
    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // 1. Active Conversations
    let activeConvQuery = supabase
      .from('conversations')
      .select('status', { count: 'exact' })
      .eq('status', 'active')

    if (isAgent) {
      activeConvQuery = activeConvQuery.eq('assigned_to', user.id)
    }

    const { count: activeCount } = await activeConvQuery
    
    // Get previous period for trend
    const { count: yesterdayActiveCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('created_at', today.toISOString())
      .gte('created_at', yesterday.toISOString())

    const activeChange = yesterdayActiveCount ? 
      ((activeCount || 0) - yesterdayActiveCount) / yesterdayActiveCount * 100 : 0
    
    // Get by status breakdown
    const { data: statusBreakdown } = await supabase
      .from('conversations')
      .select('status')
      .in('status', ['active', 'pending', 'waiting'])

    const byStatus = statusBreakdown?.reduce((acc, conv) => {
      acc[conv.status] = (acc[conv.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // 2. Average Response Time
    const { data: responseTimeData } = await supabase
      .from('conversation_metrics')
      .select('avg_response_time_seconds')
      .not('avg_response_time_seconds', 'is', null)
      .gte('created_at', today.toISOString())

    const avgResponseTime = responseTimeData && responseTimeData.length > 0
      ? responseTimeData.reduce((sum, m) => sum + (m.avg_response_time_seconds || 0), 0) / responseTimeData.length
      : 0

    // SLA threshold: 5 minutes = 300 seconds
    const slaThreshold = 300
    const slaStatus: 'good' | 'warning' | 'critical' = 
      avgResponseTime <= slaThreshold ? 'good' :
      avgResponseTime <= slaThreshold * 1.5 ? 'warning' : 'critical'

    // Get yesterday's avg for trend
    const { data: yesterdayResponseTime } = await supabase
      .from('conversation_metrics')
      .select('avg_response_time_seconds')
      .not('avg_response_time_seconds', 'is', null)
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    const yesterdayAvg = yesterdayResponseTime && yesterdayResponseTime.length > 0
      ? yesterdayResponseTime.reduce((sum, m) => sum + (m.avg_response_time_seconds || 0), 0) / yesterdayResponseTime.length
      : avgResponseTime

    const responseTimeChange = yesterdayAvg ? 
      (avgResponseTime - yesterdayAvg) / yesterdayAvg * 100 : 0

    // 3. WhatsApp Delivery Rate
    const { data: messagesData } = await supabase
      .from('messages')
      .select('delivery_status')
      .eq('is_from_me', true)
      .gte('created_at', today.toISOString())

    const totalSent = messagesData?.length || 0
    const delivered = messagesData?.filter(m => 
      ['delivered', 'read'].includes(m.delivery_status || '')
    ).length || 0

    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 100

    // Yesterday's delivery rate
    const { data: yesterdayMessages } = await supabase
      .from('messages')
      .select('delivery_status')
      .eq('is_from_me', true)
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    const yesterdayTotal = yesterdayMessages?.length || 0
    const yesterdayDelivered = yesterdayMessages?.filter(m => 
      ['delivered', 'read'].includes(m.delivery_status || '')
    ).length || 0

    const yesterdayRate = yesterdayTotal > 0 ? (yesterdayDelivered / yesterdayTotal) * 100 : 100
    const deliveryChange = yesterdayRate ? (deliveryRate - yesterdayRate) / yesterdayRate * 100 : 0

    // 4. Open Tickets
    let ticketsQuery = supabase
      .from('tickets')
      .select('priority')
      .neq('status', 'closed')

    if (isAgent) {
      ticketsQuery = ticketsQuery.eq('assigned_to', user.id)
    }

    const { data: ticketsData } = await ticketsQuery

    const openTicketsCount = ticketsData?.length || 0
    const byPriority = {
      high: ticketsData?.filter(t => t.priority === 'high').length || 0,
      medium: ticketsData?.filter(t => t.priority === 'medium').length || 0,
      low: ticketsData?.filter(t => t.priority === 'low').length || 0,
    }

    // Yesterday's open tickets
    const { count: yesterdayTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'closed')
      .lt('created_at', today.toISOString())

    const ticketsChange = yesterdayTickets ? 
      (openTicketsCount - yesterdayTickets) / yesterdayTickets * 100 : 0

    // 5. Messages Today
    const { count: messagesTodayCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    const { count: yesterdayMessagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    const messagesChange = yesterdayMessagesCount ? 
      ((messagesTodayCount || 0) - yesterdayMessagesCount) / yesterdayMessagesCount * 100 : 0

    // Build response
    return {
      activeConversations: {
        value: activeCount || 0,
        trend: activeChange > 5 ? 'up' : activeChange < -5 ? 'down' : 'stable',
        change: Math.abs(activeChange),
        byStatus,
      },
      avgResponseTime: {
        value: Math.round(avgResponseTime),
        trend: responseTimeChange < -5 ? 'up' : responseTimeChange > 5 ? 'down' : 'stable', // Lower is better
        change: Math.abs(responseTimeChange),
        slaStatus,
      },
      whatsappDeliveryRate: {
        value: Math.round(deliveryRate * 10) / 10,
        trend: deliveryChange > 2 ? 'up' : deliveryChange < -2 ? 'down' : 'stable',
        change: Math.abs(deliveryChange),
        status: deliveryRate >= 95 ? 'good' : deliveryRate >= 90 ? 'warning' : 'critical',
      },
      openTickets: {
        value: openTicketsCount,
        trend: ticketsChange > 10 ? 'up' : ticketsChange < -10 ? 'down' : 'stable',
        change: Math.abs(ticketsChange),
        byPriority,
      },
      messagesToday: {
        value: messagesTodayCount || 0,
        trend: messagesChange > 10 ? 'up' : messagesChange < -10 ? 'down' : 'stable',
        change: Math.abs(messagesChange),
      },
    }
}
