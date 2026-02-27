import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * POST /api/broadcast/campaigns/[id]/complete
 * Manually trigger campaign completion check
 */
export const POST = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  // Verify campaign belongs to user's tenant
  const { data: campaign } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Check completion directly via Supabase
  const { data: recipients } = await ctx.supabase
    .from('broadcast_recipients')
    .select('status')
    .eq('campaign_id', id);

  if (recipients?.length) {
    const pending = recipients.filter(r => r.status === 'pending').length;
    const failed = recipients.filter(r => r.status === 'failed').length;

    if (pending === 0) {
      const finalStatus = failed === recipients.length ? 'failed' : 'completed';
      await ctx.supabase
        .from('broadcast_campaigns')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  }

  // Get updated campaign
  const { data: updatedCampaign } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  return NextResponse.json({ 
    message: 'Campaign completion check triggered',
    campaign: updatedCampaign
  });
});
