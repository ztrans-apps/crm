import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/broadcast/stats
 * Get broadcast statistics for current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all campaigns for tenant
    const { data: campaigns, error } = await supabase
      .from('broadcast_campaigns')
      .select('status, sent_count, delivered_count, failed_count')
      .eq('tenant_id', tenant.id);

    if (error) {
      console.error('Error fetching campaign stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Calculate statistics
    const stats = {
      total_campaigns: campaigns?.length || 0,
      total_sent: campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0,
      total_delivered: campaigns?.reduce((sum, c) => sum + (c.delivered_count || 0), 0) || 0,
      total_failed: campaigns?.reduce((sum, c) => sum + (c.failed_count || 0), 0) || 0,
      pending: campaigns?.filter(c => c.status === 'scheduled' || c.status === 'draft').length || 0,
      success_rate: 0,
    };

    // Calculate success rate
    if (stats.total_sent > 0) {
      stats.success_rate = Math.round((stats.total_delivered / stats.total_sent) * 100);
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in GET /api/broadcast/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
