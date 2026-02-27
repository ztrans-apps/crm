import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/broadcast/stats
 * Permission: broadcast.view (enforced by middleware)
 */
export const GET = withAuth(async (req, ctx) => {
  const { data: campaigns, error } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('status, sent_count, delivered_count, failed_count')
    .eq('tenant_id', ctx.tenantId);

  if (error) {
    console.error('Error fetching campaign stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  const stats = {
    total_campaigns: campaigns?.length || 0,
    total_sent: campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0,
    total_delivered: campaigns?.reduce((sum, c) => sum + (c.delivered_count || 0), 0) || 0,
    total_failed: campaigns?.reduce((sum, c) => sum + (c.failed_count || 0), 0) || 0,
    pending: campaigns?.filter(c => c.status === 'scheduled' || c.status === 'draft').length || 0,
    success_rate: 0,
  };

  if (stats.total_sent > 0) {
    stats.success_rate = Math.round((stats.total_delivered / stats.total_sent) * 100);
  }

  return NextResponse.json({ stats });
});
