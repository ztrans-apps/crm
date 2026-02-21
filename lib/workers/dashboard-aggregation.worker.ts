// lib/workers/dashboard-aggregation.worker.ts
import { createClient } from '@/lib/supabase/server'

/**
 * Dashboard Aggregation Worker
 * Runs hourly to pre-compute and cache dashboard metrics
 */

interface AggregatedMetrics {
  conversations: {
    total: number
    active: number
    resolved: number
    avgResponseTime: number
    slaCompliance: number
  }
  messages: {
    total: number
    sent: number
    delivered: number
    read: number
    failed: number
    deliveryRate: number
  }
  agents: {
    totalAgents: number
    activeAgents: number
    avgChatsPerAgent: number
    avgResolutionRate: number
  }
  automation: {
    botHandled: number
    humanHandled: number
    escalationRate: number
  }
}

/**
 * Aggregate conversation metrics for a given time period
 */
async function aggregateConversations(
  startTime: Date,
  endTime: Date
): Promise<AggregatedMetrics['conversations']> {
  const supabase = await createClient()

  // Total conversations
  const { count: total } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  // Active conversations
  const { count: active } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  // Resolved conversations
  const { count: resolved } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'resolved')
    .gte('resolved_at', startTime.toISOString())
    .lt('resolved_at', endTime.toISOString())

  // Average response time
  const { data: metricsData } = await supabase
    .from('conversation_metrics')
    .select('avg_response_time_seconds')
    .not('avg_response_time_seconds', 'is', null)
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  const avgResponseTime = metricsData && metricsData.length > 0
    ? metricsData.reduce((sum, m) => sum + (m.avg_response_time_seconds || 0), 0) / metricsData.length
    : 0

  // SLA compliance (5 minutes = 300 seconds)
  const slaThreshold = 300
  const compliantCount = metricsData?.filter(m => 
    (m.avg_response_time_seconds || 0) <= slaThreshold
  ).length || 0
  const slaCompliance = metricsData && metricsData.length > 0
    ? (compliantCount / metricsData.length) * 100
    : 100

  return {
    total: total || 0,
    active: active || 0,
    resolved: resolved || 0,
    avgResponseTime: Math.round(avgResponseTime),
    slaCompliance: Math.round(slaCompliance * 10) / 10,
  }
}

/**
 * Aggregate message metrics for a given time period
 */
async function aggregateMessages(
  startTime: Date,
  endTime: Date
): Promise<AggregatedMetrics['messages']> {
  const supabase = await createClient()

  // Get all messages in time period
  const { data: messages } = await supabase
    .from('messages')
    .select('delivery_status, is_from_me')
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  const total = messages?.length || 0
  const sent = messages?.filter(m => m.is_from_me).length || 0
  const delivered = messages?.filter(m => 
    m.is_from_me && ['delivered', 'read'].includes(m.delivery_status || '')
  ).length || 0
  const read = messages?.filter(m => 
    m.is_from_me && m.delivery_status === 'read'
  ).length || 0
  const failed = messages?.filter(m => 
    m.is_from_me && m.delivery_status === 'failed'
  ).length || 0

  const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 100

  return {
    total,
    sent,
    delivered,
    read,
    failed,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
  }
}

/**
 * Aggregate agent activity metrics for a given time period
 */
async function aggregateAgentActivity(
  startTime: Date,
  endTime: Date
): Promise<AggregatedMetrics['agents']> {
  const supabase = await createClient()

  // Get all agents
  const { data: agents } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'agent')

  const totalAgents = agents?.length || 0

  // Get active agents (those who handled conversations)
  const { data: activeAgentData } = await supabase
    .from('conversations')
    .select('assigned_to')
    .not('assigned_to', 'is', null)
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  const uniqueActiveAgents = new Set(
    activeAgentData?.map(c => c.assigned_to).filter(Boolean)
  )
  const activeAgents = uniqueActiveAgents.size

  // Average chats per agent
  const { count: totalChats } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .not('assigned_to', 'is', null)
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  const avgChatsPerAgent = activeAgents > 0 ? (totalChats || 0) / activeAgents : 0

  // Average resolution rate
  const { count: resolvedChats } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .not('assigned_to', 'is', null)
    .eq('status', 'resolved')
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  const avgResolutionRate = totalChats && totalChats > 0
    ? ((resolvedChats || 0) / totalChats) * 100
    : 0

  return {
    totalAgents,
    activeAgents,
    avgChatsPerAgent: Math.round(avgChatsPerAgent * 10) / 10,
    avgResolutionRate: Math.round(avgResolutionRate * 10) / 10,
  }
}

/**
 * Aggregate automation metrics for a given time period
 */
async function aggregateAutomation(
  startTime: Date,
  endTime: Date
): Promise<AggregatedMetrics['automation']> {
  const supabase = await createClient()

  // Bot handled conversations
  const { count: botHandled } = await supabase
    .from('conversation_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('handled_by_bot', true)
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  // Human handled conversations
  const { count: humanHandled } = await supabase
    .from('conversation_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('handled_by_bot', false)
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  // Escalation rate
  const { count: escalated } = await supabase
    .from('conversation_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('escalated_to_human', true)
    .gte('created_at', startTime.toISOString())
    .lt('created_at', endTime.toISOString())

  const totalBotInteractions = (botHandled || 0) + (escalated || 0)
  const escalationRate = totalBotInteractions > 0
    ? ((escalated || 0) / totalBotInteractions) * 100
    : 0

  return {
    botHandled: botHandled || 0,
    humanHandled: humanHandled || 0,
    escalationRate: Math.round(escalationRate * 10) / 10,
  }
}

/**
 * Store aggregated snapshot in database
 */
async function storeSnapshot(
  snapshotType: 'hourly' | 'daily' | 'weekly',
  snapshotDate: Date,
  metrics: AggregatedMetrics
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('analytics_snapshots')
    .upsert({
      snapshot_type: snapshotType,
      snapshot_date: snapshotDate.toISOString(),
      metrics: metrics as any,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'snapshot_type,snapshot_date',
    })

  if (error) {
    console.error('Error storing snapshot:', error)
    throw error
  }

  console.log(`✅ Stored ${snapshotType} snapshot for ${snapshotDate.toISOString()}`)
}

/**
 * Main aggregation function - runs hourly
 */
export async function aggregateHourlyMetrics(): Promise<void> {
  try {
    console.log('🔄 Starting hourly metrics aggregation...')

    const now = new Date()
    const hourStart = new Date(now)
    hourStart.setMinutes(0, 0, 0)
    
    const hourEnd = new Date(hourStart)
    hourEnd.setHours(hourEnd.getHours() + 1)

    console.log(`📊 Aggregating metrics from ${hourStart.toISOString()} to ${hourEnd.toISOString()}`)

    // Aggregate all metrics in parallel
    const [conversations, messages, agents, automation] = await Promise.all([
      aggregateConversations(hourStart, hourEnd),
      aggregateMessages(hourStart, hourEnd),
      aggregateAgentActivity(hourStart, hourEnd),
      aggregateAutomation(hourStart, hourEnd),
    ])

    const metrics: AggregatedMetrics = {
      conversations,
      messages,
      agents,
      automation,
    }

    // Store snapshot
    await storeSnapshot('hourly', hourStart, metrics)

    console.log('✅ Hourly metrics aggregation completed successfully')
    console.log('📈 Metrics:', JSON.stringify(metrics, null, 2))
  } catch (error) {
    console.error('❌ Error in hourly metrics aggregation:', error)
    throw error
  }
}

/**
 * Aggregate daily metrics (runs at end of day)
 */
export async function aggregateDailyMetrics(): Promise<void> {
  try {
    console.log('🔄 Starting daily metrics aggregation...')

    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    console.log(`📊 Aggregating daily metrics from ${dayStart.toISOString()} to ${dayEnd.toISOString()}`)

    const [conversations, messages, agents, automation] = await Promise.all([
      aggregateConversations(dayStart, dayEnd),
      aggregateMessages(dayStart, dayEnd),
      aggregateAgentActivity(dayStart, dayEnd),
      aggregateAutomation(dayStart, dayEnd),
    ])

    const metrics: AggregatedMetrics = {
      conversations,
      messages,
      agents,
      automation,
    }

    await storeSnapshot('daily', dayStart, metrics)

    console.log('✅ Daily metrics aggregation completed successfully')
  } catch (error) {
    console.error('❌ Error in daily metrics aggregation:', error)
    throw error
  }
}

/**
 * Aggregate weekly metrics (runs at end of week)
 */
export async function aggregateWeeklyMetrics(): Promise<void> {
  try {
    console.log('🔄 Starting weekly metrics aggregation...')

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    console.log(`📊 Aggregating weekly metrics from ${weekStart.toISOString()} to ${weekEnd.toISOString()}`)

    const [conversations, messages, agents, automation] = await Promise.all([
      aggregateConversations(weekStart, weekEnd),
      aggregateMessages(weekStart, weekEnd),
      aggregateAgentActivity(weekStart, weekEnd),
      aggregateAutomation(weekStart, weekEnd),
    ])

    const metrics: AggregatedMetrics = {
      conversations,
      messages,
      agents,
      automation,
    }

    await storeSnapshot('weekly', weekStart, metrics)

    console.log('✅ Weekly metrics aggregation completed successfully')
  } catch (error) {
    console.error('❌ Error in weekly metrics aggregation:', error)
    throw error
  }
}

// Export for manual execution
if (require.main === module) {
  aggregateHourlyMetrics()
    .then(() => {
      console.log('✅ Manual aggregation completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Manual aggregation failed:', error)
      process.exit(1)
    })
}
