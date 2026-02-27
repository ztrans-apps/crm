/**
 * Broadcast Debug - System Status
 * Permission: admin.access
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (request, ctx) => {
  const { count: totalCampaigns } = await ctx.serviceClient
    .from('broadcast_campaigns')
    .select('*', { count: 'exact', head: true });

  const { count: sendingCampaigns } = await ctx.serviceClient
    .from('broadcast_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sending');

  const { count: scheduledCampaigns } = await ctx.serviceClient
    .from('broadcast_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled');

  return NextResponse.json({
    mode: 'serverless',
    whatsapp_api: {
      configured: !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID ? '***configured***' : 'missing',
      api_version: process.env.WHATSAPP_API_VERSION || 'v21.0',
    },
    broadcast: {
      total_campaigns: totalCampaigns,
      sending: sendingCampaigns,
      scheduled: scheduledCampaigns,
      processor: 'Vercel Cron (every minute)',
    },
  });
}, { permission: 'admin.access' });
