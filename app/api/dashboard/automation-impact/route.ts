import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const dynamic = 'force-dynamic'

interface AutomationImpactResponse {
  chatbotVsHuman: {
    chatbot: number
    human: number
    percentage: number
  }
  autoReplySuccess: {
    total: number
    successful: number
    percentage: number
  }
  dropOffRate: {
    total: number
    dropped: number
    percentage: number
  }
  topIntents: Array<{
    intent: string
    count: number
    successRate: number
  }>
  timeSaved: {
    hours: number
    estimatedCost: number
  }
  escalationRate: {
    total: number
    escalated: number
    percentage: number
  }
}

export const GET = withAuth(async (req, ctx) => {
  // Date range: last 30 days
  const now = new Date()
  const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // 1. Chatbot vs Human handled conversations
  const { data: conversationMetrics } = await ctx.supabase
    .from('conversation_metrics')
    .select('handled_by_bot, escalated_to_human')
    .gte('created_at', last30days.toISOString())

  const chatbotOnly = conversationMetrics?.filter(m => m.handled_by_bot && !m.escalated_to_human).length || 0
  const humanHandled = conversationMetrics?.filter(m => !m.handled_by_bot || m.escalated_to_human).length || 0
  const total = chatbotOnly + humanHandled
  const chatbotPercentage = total > 0 ? (chatbotOnly / total) * 100 : 0

  // 2. Auto-reply success (conversations resolved by bot without escalation)
  const autoReplyTotal = conversationMetrics?.filter(m => m.handled_by_bot).length || 0
  const autoReplySuccessful = chatbotOnly
  const autoReplyPercentage = autoReplyTotal > 0 ? (autoReplySuccessful / autoReplyTotal) * 100 : 0

  // 3. Drop-off rate (customers who left after bot interaction)
  // Estimate: conversations with bot interaction but no messages after initial bot response
  const { data: conversations } = await ctx.supabase
    .from('conversations')
    .select('id, status')
    .gte('created_at', last30days.toISOString())

  const conversationIds = conversations?.map(c => c.id) || []
  
  // Get conversations with bot metrics
  const { data: botConversations } = await ctx.supabase
    .from('conversation_metrics')
    .select('conversation_id, handled_by_bot')
    .in('conversation_id', conversationIds)
    .eq('handled_by_bot', true)

  const botConversationIds = botConversations?.map(c => c.conversation_id) || []

  // Check which ones have minimal messages (potential drop-offs)
  const { data: messagesCounts } = await ctx.supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', botConversationIds)
    .eq('is_from_me', false) // Customer messages

  const conversationMessageCount = new Map<string, number>()
  messagesCounts?.forEach(m => {
    conversationMessageCount.set(m.conversation_id, (conversationMessageCount.get(m.conversation_id) || 0) + 1)
  })

  const droppedConversations = Array.from(conversationMessageCount.entries()).filter(([_, count]) => count <= 1).length
  const dropOffPercentage = botConversationIds.length > 0 ? (droppedConversations / botConversationIds.length) * 100 : 0

  // 4. Top intents (mock data - would need chatbot integration)
  // For now, return sample data
  const topIntents = [
    { intent: 'greeting', count: 450, successRate: 95 },
    { intent: 'product_inquiry', count: 320, successRate: 78 },
    { intent: 'order_status', count: 280, successRate: 88 },
    { intent: 'complaint', count: 150, successRate: 45 },
    { intent: 'pricing', count: 120, successRate: 82 }
  ]

  // 5. Time saved (estimate: 5 minutes per bot-handled conversation)
  const minutesSaved = chatbotOnly * 5
  const hoursSaved = Math.round(minutesSaved / 60 * 10) / 10
  const estimatedCost = Math.round(hoursSaved * 15) // $15/hour average CS cost

  // 6. Escalation rate
  const escalated = conversationMetrics?.filter(m => m.escalated_to_human).length || 0
  const escalationTotal = conversationMetrics?.filter(m => m.handled_by_bot).length || 0
  const escalationPercentage = escalationTotal > 0 ? (escalated / escalationTotal) * 100 : 0

  const response: AutomationImpactResponse = {
    chatbotVsHuman: {
      chatbot: chatbotOnly,
      human: humanHandled,
      percentage: Math.round(chatbotPercentage * 10) / 10
    },
    autoReplySuccess: {
      total: autoReplyTotal,
      successful: autoReplySuccessful,
      percentage: Math.round(autoReplyPercentage * 10) / 10
    },
    dropOffRate: {
      total: botConversationIds.length,
      dropped: droppedConversations,
      percentage: Math.round(dropOffPercentage * 10) / 10
    },
    topIntents,
    timeSaved: {
      hours: hoursSaved,
      estimatedCost
    },
    escalationRate: {
      total: escalationTotal,
      escalated,
      percentage: Math.round(escalationPercentage * 10) / 10
    }
  }

  return NextResponse.json(response)
})
