import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const dynamic = 'force-dynamic'

interface CustomerLoadResponse {
  incomingChatsPerHour: Array<{
    hour: string
    count: number
  }>
  peakHour: {
    hour: string
    count: number
  }
  newVsReturning: {
    new: number
    returning: number
  }
  avgWaitTime: {
    peak: number
    offPeak: number
  }
  heatmap: Array<{
    dayOfWeek: number
    hour: number
    count: number
  }>
}

export const GET = withAuth(async (req, ctx) => {
  // Date ranges
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // 1. Incoming chats per hour (last 24h)
  const { data: conversations24h } = await ctx.supabase
    .from('conversations')
    .select('created_at')
    .gte('created_at', last24h.toISOString())
    .order('created_at', { ascending: true })

  // Group by hour
  const hourMap = new Map<string, number>()
  conversations24h?.forEach(conv => {
    const date = new Date(conv.created_at)
    const hour = `${String(date.getHours()).padStart(2, '0')}:00`
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
  })

  const incomingChatsPerHour = Array.from(hourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  // 2. Peak hour
  let peakHour = { hour: '00:00', count: 0 }
  hourMap.forEach((count, hour) => {
    if (count > peakHour.count) {
      peakHour = { hour, count }
    }
  })

  // 3. New vs Returning customers
  const { data: contacts24h } = await ctx.supabase
    .from('conversations')
    .select('contact_id, created_at')
    .gte('created_at', last24h.toISOString())

  const uniqueContacts = new Set(contacts24h?.map(c => c.contact_id))
  
  // Check which contacts had conversations before
  const contactIds = Array.from(uniqueContacts)
  const { data: previousConversations } = await ctx.supabase
    .from('conversations')
    .select('contact_id')
    .in('contact_id', contactIds)
    .lt('created_at', last24h.toISOString())

  const returningContactIds = new Set(previousConversations?.map(c => c.contact_id))
  const returningCount = returningContactIds.size
  const newCount = uniqueContacts.size - returningCount

  // 4. Average wait time (peak vs off-peak)
  // Peak hours: 9-12, 14-17
  const { data: metricsData } = await ctx.supabase
    .from('conversation_metrics')
    .select('first_response_time_seconds, created_at')
    .gte('created_at', last24h.toISOString())
    .not('first_response_time_seconds', 'is', null)

  let peakWaitTimes: number[] = []
  let offPeakWaitTimes: number[] = []

  metricsData?.forEach(metric => {
    const hour = new Date(metric.created_at).getHours()
    const isPeak = (hour >= 9 && hour < 12) || (hour >= 14 && hour < 17)
    
    if (isPeak) {
      peakWaitTimes.push(metric.first_response_time_seconds || 0)
    } else {
      offPeakWaitTimes.push(metric.first_response_time_seconds || 0)
    }
  })

  const avgPeakWait = peakWaitTimes.length > 0
    ? Math.round(peakWaitTimes.reduce((a, b) => a + b, 0) / peakWaitTimes.length)
    : 0

  const avgOffPeakWait = offPeakWaitTimes.length > 0
    ? Math.round(offPeakWaitTimes.reduce((a, b) => a + b, 0) / offPeakWaitTimes.length)
    : 0

  // 5. Heatmap (last 7 days)
  const { data: conversations7days } = await ctx.supabase
    .from('conversations')
    .select('created_at')
    .gte('created_at', last7days.toISOString())

  // Group by day of week and hour
  const heatmapMap = new Map<string, number>()
  conversations7days?.forEach(conv => {
    const date = new Date(conv.created_at)
    const dayOfWeek = date.getDay() // 0 = Sunday
    const hour = date.getHours()
    const key = `${dayOfWeek}-${hour}`
    heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1)
  })

  const heatmap = Array.from(heatmapMap.entries()).map(([key, count]) => {
    const [dayOfWeek, hour] = key.split('-').map(Number)
    return { dayOfWeek, hour, count }
  })

  const response: CustomerLoadResponse = {
    incomingChatsPerHour,
    peakHour,
    newVsReturning: {
      new: newCount,
      returning: returningCount
    },
    avgWaitTime: {
      peak: avgPeakWait,
      offPeak: avgOffPeakWait
    },
    heatmap
  }

  return NextResponse.json(response)
})
