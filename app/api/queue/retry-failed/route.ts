/**
 * Queue Retry Failed - Vercel compatible
 * Retries failed broadcast recipients by resetting their status to pending
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Reset failed recipients to pending so cron picks them up
    const { data, error } = await supabase
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

    // Also reset campaign status to sending
    await supabase
      .from('broadcast_campaigns')
      .update({ status: 'sending', completed_at: null })
      .eq('id', campaignId);

    return NextResponse.json({
      message: `${data?.length || 0} failed recipients reset to pending`,
      retriedCount: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
