/**
 * Application Metrics API
 * Permission: admin.access
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, ctx) => {
  const { data: messages } = await ctx.serviceClient
    .from('messages')
    .select('delivery_status');

  const messageStats = {
    total: messages?.length || 0,
    sent: messages?.filter(m => m.delivery_status === 'sent').length || 0,
    delivered: messages?.filter(m => m.delivery_status === 'delivered').length || 0,
    failed: messages?.filter(m => m.delivery_status === 'failed').length || 0,
    pending: messages?.filter(m => m.delivery_status === 'pending').length || 0,
  };

  const { data: campaigns } = await ctx.serviceClient
    .from('broadcast_campaigns')
    .select('status');

  const broadcastStats = {
    total: campaigns?.length || 0,
    sending: campaigns?.filter(c => c.status === 'sending').length || 0,
    completed: campaigns?.filter(c => c.status === 'completed').length || 0,
    scheduled: campaigns?.filter(c => c.status === 'scheduled').length || 0,
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    mode: 'serverless',
    messages: messageStats,
    broadcasts: broadcastStats,
  });
}, { permission: 'admin.access' });
