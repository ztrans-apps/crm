/**
 * Broadcast Debug - Queue Status
 * Permission: admin.access
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (request, ctx) => {
  const { data: campaigns } = await ctx.serviceClient
    .from('broadcast_campaigns')
    .select('id, name, status, total_recipients, created_at, started_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const details: any[] = [];
  for (const campaign of (campaigns || []).slice(0, 5)) {
    const { data: recipients } = await ctx.serviceClient
      .from('broadcast_recipients')
      .select('id, status, sent_at, failed_at, error_message')
      .eq('campaign_id', campaign.id)
      .limit(50);

    details.push({
      ...campaign,
      recipients_summary: {
        pending: recipients?.filter(r => r.status === 'pending').length || 0,
        sent: recipients?.filter(r => r.status === 'sent').length || 0,
        failed: recipients?.filter(r => r.status === 'failed').length || 0,
        total: recipients?.length || 0,
      },
      recent_failures: recipients?.filter(r => r.status === 'failed').slice(0, 5).map(r => ({
        id: r.id,
        error: r.error_message,
        failed_at: r.failed_at,
      })),
    });
  }

  return NextResponse.json({
    mode: 'serverless',
    processor: 'Vercel Cron → /api/cron/process-broadcasts',
    campaigns: details,
  });
}, { permission: 'admin.access' });
