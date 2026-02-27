/**
 * Queue Metrics
 * Permission: admin.access
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (request, ctx) => {
  const { data: campaigns } = await ctx.serviceClient
    .from('broadcast_campaigns')
    .select('status')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { data: recipients } = await ctx.serviceClient
    .from('broadcast_recipients')
    .select('status')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return NextResponse.json({
    mode: 'serverless',
    period: 'last_24h',
    campaigns: {
      total: campaigns?.length || 0,
      sending: campaigns?.filter(c => c.status === 'sending').length || 0,
      completed: campaigns?.filter(c => c.status === 'completed').length || 0,
      failed: campaigns?.filter(c => c.status === 'failed').length || 0,
      scheduled: campaigns?.filter(c => c.status === 'scheduled').length || 0,
    },
    messages: {
      total: recipients?.length || 0,
      pending: recipients?.filter(r => r.status === 'pending').length || 0,
      sent: recipients?.filter(r => r.status === 'sent').length || 0,
      delivered: recipients?.filter(r => r.status === 'delivered').length || 0,
      failed: recipients?.filter(r => r.status === 'failed').length || 0,
    },
    throughput: {
      note: 'Processing via Vercel Cron every minute, ~30 recipients per invocation',
    },
  });
}, { permission: 'admin.access' });
