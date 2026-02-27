/**
 * Queue Retry All Failed
 * Permission: admin.access
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const POST = withAuth(async (request, ctx) => {
  const { data, error } = await ctx.serviceClient
    .from('broadcast_recipients')
    .update({
      status: 'pending',
      error_message: null,
      failed_at: null,
    })
    .eq('status', 'failed')
    .select('campaign_id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const campaignIds = [...new Set(data?.map(r => r.campaign_id) || [])];
  for (const campaignId of campaignIds) {
    await ctx.serviceClient
      .from('broadcast_campaigns')
      .update({ status: 'sending', completed_at: null })
      .eq('id', campaignId);
  }

  return NextResponse.json({
    message: `${data?.length || 0} failed recipients reset across ${campaignIds.length} campaigns`,
    retriedCount: data?.length || 0,
    campaignsReactivated: campaignIds.length,
  });
}, { permission: 'admin.access' });
