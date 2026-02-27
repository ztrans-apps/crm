import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const dynamic = 'force-dynamic'

interface WhatsAppPerformanceResponse {
  messageFunnel: {
    sent: number
    delivered: number
    read: number
    failed: number
  }
  broadcastSuccessRate: {
    total: number
    successful: number
    failed: number
    percentage: number
  }
  failedMessages: Array<{
    id: string
    recipient: string
    error: string
    timestamp: string
  }>
  activeSessions: Array<{
    sessionId: string
    phoneNumber: string
    status: 'connected' | 'disconnected' | 'reconnecting'
    lastSeen: string
  }>
  queueMetrics: {
    depth: number
    processingRate: number
  }
}

export const GET = withAuth(async (req, ctx) => {
  // Date range: last 24 hours
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 1. Message Funnel
  const { data: messages } = await ctx.supabase
    .from('messages')
    .select('delivery_status, failed_reason')
    .eq('is_from_me', true)
    .gte('created_at', last24h.toISOString())

  const sent = messages?.length || 0
  const delivered = messages?.filter(m => m.delivery_status === 'delivered' || m.delivery_status === 'read').length || 0
  const read = messages?.filter(m => m.delivery_status === 'read').length || 0
  const failed = messages?.filter(m => m.delivery_status === 'failed' || m.failed_reason).length || 0

  // 2. Broadcast Success Rate
  const { data: broadcasts } = await ctx.supabase
    .from('broadcasts')
    .select('id, status, total_recipients, successful_sends, failed_sends')
    .gte('created_at', last24h.toISOString())

  const totalBroadcasts = broadcasts?.reduce((sum, b) => sum + (b.total_recipients || 0), 0) || 0
  const successfulBroadcasts = broadcasts?.reduce((sum, b) => sum + (b.successful_sends || 0), 0) || 0
  const failedBroadcasts = broadcasts?.reduce((sum, b) => sum + (b.failed_sends || 0), 0) || 0
  const broadcastPercentage = totalBroadcasts > 0 ? (successfulBroadcasts / totalBroadcasts) * 100 : 100

  // 3. Failed Messages (last 50)
  const { data: failedMessagesData } = await ctx.supabase
    .from('messages')
    .select('id, phone_number, failed_reason, created_at')
    .not('failed_reason', 'is', null)
    .gte('created_at', last24h.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  const failedMessages = failedMessagesData?.map(m => ({
    id: m.id,
    recipient: m.phone_number || 'Unknown',
    error: m.failed_reason || 'Unknown error',
    timestamp: m.created_at
  })) || []

  // 4. Active Sessions (from whatsapp_sessions table if exists)
  const { data: sessions } = await ctx.supabase
    .from('whatsapp_sessions')
    .select('id, phone_number, status, last_seen')
    .order('last_seen', { ascending: false })
    .limit(10)

  const activeSessions = sessions?.map(s => ({
    sessionId: s.id,
    phoneNumber: s.phone_number || 'Unknown',
    status: s.status as 'connected' | 'disconnected' | 'reconnecting',
    lastSeen: s.last_seen || new Date().toISOString()
  })) || []

  // 5. Queue Metrics (mock data - would need Redis integration)
  // For now, return estimated values based on pending messages
  const { count: pendingMessages } = await ctx.supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('delivery_status', 'pending')

  const queueMetrics = {
    depth: pendingMessages || 0,
    processingRate: 120 // messages per minute (mock value)
  }

  const response: WhatsAppPerformanceResponse = {
    messageFunnel: {
      sent,
      delivered,
      read,
      failed
    },
    broadcastSuccessRate: {
      total: totalBroadcasts,
      successful: successfulBroadcasts,
      failed: failedBroadcasts,
      percentage: Math.round(broadcastPercentage * 10) / 10
    },
    failedMessages,
    activeSessions,
    queueMetrics
  }

  return NextResponse.json(response)
})
