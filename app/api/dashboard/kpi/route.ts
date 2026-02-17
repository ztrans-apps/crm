import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/kpi
 * Returns KPI strip metrics for dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has analytics permission
    const { data: permissions } = await supabase
      .from('user_roles')
      .select(`
        role:roles!inner(
          role_permissions!inner(
            permission:permissions!inner(resource, action)
          )
        )
      `)
      .eq('user_id', user.id);

    const hasAnalyticsPermission = permissions?.some((p: any) => 
      p.role?.role_permissions?.some((rp: any) => 
        rp.permission?.resource === 'analytics' && rp.permission?.action === 'view'
      )
    );

    // Get date range (today vs yesterday for comparison)
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // 1. Active Conversations
    const { count: activeConversationsToday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', todayStart.toISOString());

    const { count: activeConversationsYesterday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString());

    const activeConvChange = calculateChange(
      activeConversationsToday || 0,
      activeConversationsYesterday || 0
    );

    // 2. Average Response Time
    const { data: responseTimeData } = await supabase
      .from('conversations')
      .select('first_response_time_seconds')
      .not('first_response_time_seconds', 'is', null)
      .gte('created_at', todayStart.toISOString());

    const avgResponseTimeToday = responseTimeData && responseTimeData.length > 0
      ? responseTimeData.reduce((sum, c: any) => sum + (c.first_response_time_seconds || 0), 0) / responseTimeData.length
      : 0;

    const { data: responseTimeYesterday } = await supabase
      .from('conversations')
      .select('first_response_time_seconds')
      .not('first_response_time_seconds', 'is', null)
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString());

    const avgResponseTimeYest = responseTimeYesterday && responseTimeYesterday.length > 0
      ? responseTimeYesterday.reduce((sum, c: any) => sum + (c.first_response_time_seconds || 0), 0) / responseTimeYesterday.length
      : 0;

    const responseTimeChange = calculateChange(avgResponseTimeToday, avgResponseTimeYest);
    
    // SLA threshold: 5 minutes (300 seconds)
    const slaThreshold = 300;
    const slaStatus = avgResponseTimeToday <= slaThreshold ? 'good' 
      : avgResponseTimeToday <= slaThreshold * 1.5 ? 'warning' 
      : 'critical';

    // 3. WhatsApp Delivery Rate
    const { count: totalMessagesToday } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'agent')
      .gte('created_at', todayStart.toISOString());

    const { count: deliveredMessagesToday } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'agent')
      .in('delivery_status', ['delivered', 'read'])
      .gte('created_at', todayStart.toISOString());

    const deliveryRateToday = totalMessagesToday && totalMessagesToday > 0
      ? (deliveredMessagesToday || 0) / totalMessagesToday * 100
      : 100;

    const { count: totalMessagesYesterday } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'agent')
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString());

    const { count: deliveredMessagesYesterday } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'agent')
      .in('delivery_status', ['delivered', 'read'])
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString());

    const deliveryRateYesterday = totalMessagesYesterday && totalMessagesYesterday > 0
      ? (deliveredMessagesYesterday || 0) / totalMessagesYesterday * 100
      : 100;

    const deliveryRateChange = calculateChange(deliveryRateToday, deliveryRateYesterday);

    // 4. Open Tickets
    const { count: openTicketsToday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const { data: ticketsByPriority } = await supabase
      .from('conversations')
      .select('priority')
      .eq('status', 'open');

    const priorityBreakdown = {
      high: ticketsByPriority?.filter((t: any) => t.priority === 'high').length || 0,
      medium: ticketsByPriority?.filter((t: any) => t.priority === 'medium').length || 0,
      low: ticketsByPriority?.filter((t: any) => t.priority === 'low').length || 0,
    };

    const { count: openTicketsYesterday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .lt('created_at', todayStart.toISOString());

    const openTicketsChange = calculateChange(
      openTicketsToday || 0,
      openTicketsYesterday || 0
    );

    // 5. Messages Today
    const { count: messagesToday } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    const { count: messagesYesterday } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString());

    const messagesTodayChange = calculateChange(
      messagesToday || 0,
      messagesYesterday || 0
    );

    return NextResponse.json({
      activeConversations: {
        value: activeConversationsToday || 0,
        trend: getTrend(activeConvChange),
        change: Math.abs(activeConvChange),
      },
      avgResponseTime: {
        value: Math.round(avgResponseTimeToday),
        trend: getTrend(-responseTimeChange), // Lower is better
        change: Math.abs(responseTimeChange),
        slaStatus,
      },
      whatsappDeliveryRate: {
        value: Math.round(deliveryRateToday * 10) / 10,
        trend: getTrend(deliveryRateChange),
        change: Math.abs(deliveryRateChange),
      },
      openTickets: {
        value: openTicketsToday || 0,
        trend: getTrend(-openTicketsChange), // Lower is better
        change: Math.abs(openTicketsChange),
        byPriority: priorityBreakdown,
      },
      messagesToday: {
        value: messagesToday || 0,
        trend: getTrend(messagesTodayChange),
        change: Math.abs(messagesTodayChange),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/dashboard/kpi:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getTrend(change: number): 'up' | 'down' | 'stable' {
  if (Math.abs(change) < 5) return 'stable';
  return change > 0 ? 'up' : 'down';
}
