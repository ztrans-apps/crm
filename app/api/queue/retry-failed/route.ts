/**
 * Queue Retry Failed
 * Permission: admin.access
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const POST = withAuth(async (request, ctx) => {
  const { campaignId } = await request.json();

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
  }

  const { data, error } = await ctx.serviceClient
    .from('broadcast_recipients')
    .update({
      status: 'pending',
      error_message: null,
      failed_at: null,
    })
    .eq('campaign_id', campaignId)
    .eq('status', 'failed')
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await ctx.serviceClient
    .from('broadcast_campaigns')
    .update({ status: 'sending', completed_at: null })
    .eq('id', campaignId);

  return NextResponse.json({
    message: `${data?.length || 0} failed recipients reset to pending`,
    retriedCount: data?.length || 0,
  });
}, { permission: 'admin.access' });
