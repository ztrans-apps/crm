/**
 * Queue Retry All Failed - Vercel compatible
 * Retries all failed broadcast recipients across all campaigns
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Reset all failed recipients to pending
    const { data, error } = await supabase
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

    // Reset parent campaigns back to sending
    const campaignIds = [...new Set(data?.map(r => r.campaign_id) || [])];
    for (const campaignId of campaignIds) {
      await supabase
        .from('broadcast_campaigns')
        .update({ status: 'sending', completed_at: null })
        .eq('id', campaignId);
    }

    return NextResponse.json({
      message: `${data?.length || 0} failed recipients reset across ${campaignIds.length} campaigns`,
      retriedCount: data?.length || 0,
      campaignsReactivated: campaignIds.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
