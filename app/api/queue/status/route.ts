/**
 * Queue Status API
 * Permission: admin.access
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (request, ctx) => {
  const { data: campaigns } = await ctx.serviceClient
    .from('broadcast_campaigns')
    .select('id, status, name, total_recipients, created_at')
    .in('status', ['sending', 'scheduled', 'completed', 'failed'])
    .order('created_at', { ascending: false })
    .limit(20);

  const activeCampaigns = campaigns?.filter(c => c.status === 'sending') || [];
  const stats: Record<string, any> = {};

  for (const campaign of activeCampaigns.slice(0, 5)) {
    const { data: recipients } = await ctx.serviceClient
      .from('broadcast_recipients')
      .select('status')
      .eq('campaign_id', campaign.id);

    if (recipients) {
      stats[campaign.id] = {
        name: campaign.name,
        pending: recipients.filter(r => r.status === 'pending').length,
        sent: recipients.filter(r => r.status === 'sent').length,
        failed: recipients.filter(r => r.status === 'failed').length,
        total: recipients.length,
      };
    }
  }

  return NextResponse.json({
    mode: 'serverless',
    note: 'Queue processing handled by Vercel Cron + Meta Cloud API',
    campaigns: campaigns || [],
    activeCampaignStats: stats,
  });
}, { permission: 'admin.access' });
