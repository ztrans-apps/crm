import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface BusinessImpactResponse {
  leadsGenerated: {
    total: number
    trend: 'up' | 'down' | 'stable'
    change: number
  }
  ticketsResolved: {
    today: number
    week: number
    month: number
  }
  campaignConversion: Array<{
    campaignId: string
    campaignName: string
    sent: number
    responded: number
    converted: number
    conversionRate: number
  }>
  repeatCustomerRate: {
    rate: number
    trend: 'up' | 'down' | 'stable'
  }
  costPerConversation: {
    amount: number
    savings: number
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Date ranges
    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const twoMonthsAgo = new Date(today)
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

    // 1. Leads generated (contacts with lead tag or status)
    const { count: leadsThisMonth } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .or('tags.cs.{"lead"}')
      .gte('created_at', monthAgo.toISOString())

    const { count: leadsLastMonth } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .or('tags.cs.{"lead"}')
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', monthAgo.toISOString())

    const leadsChange = leadsLastMonth ? ((leadsThisMonth || 0) - leadsLastMonth) / leadsLastMonth * 100 : 0
    const leadsTrend: 'up' | 'down' | 'stable' = leadsChange > 10 ? 'up' : leadsChange < -10 ? 'down' : 'stable'

    // 2. Tickets resolved
    const { count: ticketsToday } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'closed')
      .gte('updated_at', today.toISOString())

    const { count: ticketsWeek } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'closed')
      .gte('updated_at', weekAgo.toISOString())

    const { count: ticketsMonth } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'closed')
      .gte('updated_at', monthAgo.toISOString())

    // 3. Campaign conversion (last 10 campaigns)
    const { data: campaigns } = await supabase
      .from('broadcasts')
      .select('id, name, total_recipients, successful_sends')
      .order('created_at', { ascending: false })
      .limit(10)

    const campaignConversion = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Count responses (messages from customers after broadcast)
        const { count: responded } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('broadcast_id', campaign.id)
          .eq('is_from_me', false)

        // Count conversions (mock - would need conversion tracking)
        const converted = Math.floor((responded || 0) * 0.3) // Estimate 30% conversion

        const conversionRate = campaign.successful_sends > 0
          ? (converted / campaign.successful_sends) * 100
          : 0

        return {
          campaignId: campaign.id,
          campaignName: campaign.name || 'Unnamed Campaign',
          sent: campaign.successful_sends || 0,
          responded: responded || 0,
          converted,
          conversionRate: Math.round(conversionRate * 10) / 10
        }
      })
    )

    // 4. Repeat customer rate
    const { data: allContacts } = await supabase
      .from('contacts')
      .select('id')
      .gte('created_at', monthAgo.toISOString())

    const contactIds = allContacts?.map(c => c.id) || []

    // Count contacts with multiple conversations
    const { data: conversationCounts } = await supabase
      .from('conversations')
      .select('contact_id')
      .in('contact_id', contactIds)

    const contactConversationMap = new Map<string, number>()
    conversationCounts?.forEach(conv => {
      contactConversationMap.set(conv.contact_id, (contactConversationMap.get(conv.contact_id) || 0) + 1)
    })

    const repeatCustomers = Array.from(contactConversationMap.values()).filter(count => count > 1).length
    const repeatRate = contactIds.length > 0 ? (repeatCustomers / contactIds.length) * 100 : 0

    // Compare with last month
    const { data: lastMonthContacts } = await supabase
      .from('contacts')
      .select('id')
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', monthAgo.toISOString())

    const lastMonthContactIds = lastMonthContacts?.map(c => c.id) || []
    const { data: lastMonthConversations } = await supabase
      .from('conversations')
      .select('contact_id')
      .in('contact_id', lastMonthContactIds)

    const lastMonthMap = new Map<string, number>()
    lastMonthConversations?.forEach(conv => {
      lastMonthMap.set(conv.contact_id, (lastMonthMap.get(conv.contact_id) || 0) + 1)
    })

    const lastMonthRepeat = Array.from(lastMonthMap.values()).filter(count => count > 1).length
    const lastMonthRate = lastMonthContactIds.length > 0 ? (lastMonthRepeat / lastMonthContactIds.length) * 100 : 0

    const repeatTrend: 'up' | 'down' | 'stable' = 
      repeatRate > lastMonthRate + 5 ? 'up' : 
      repeatRate < lastMonthRate - 5 ? 'down' : 'stable'

    // 5. Cost per conversation
    // Estimate: $15/hour CS cost, 5 minutes per conversation
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString())

    const costPerConversation = 15 * (5 / 60) // $1.25 per conversation

    // Calculate savings from automation
    const { data: botMetrics } = await supabase
      .from('conversation_metrics')
      .select('handled_by_bot')
      .eq('handled_by_bot', true)
      .gte('created_at', monthAgo.toISOString())

    const botHandledCount = botMetrics?.length || 0
    const savings = Math.round(botHandledCount * costPerConversation)

    const response: BusinessImpactResponse = {
      leadsGenerated: {
        total: leadsThisMonth || 0,
        trend: leadsTrend,
        change: Math.abs(Math.round(leadsChange))
      },
      ticketsResolved: {
        today: ticketsToday || 0,
        week: ticketsWeek || 0,
        month: ticketsMonth || 0
      },
      campaignConversion,
      repeatCustomerRate: {
        rate: Math.round(repeatRate * 10) / 10,
        trend: repeatTrend
      },
      costPerConversation: {
        amount: Math.round(costPerConversation * 100) / 100,
        savings
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching business impact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business impact metrics' },
      { status: 500 }
    )
  }
}
