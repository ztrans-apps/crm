/**
 * Broadcast Debug - System Status
 * Vercel-compatible: no Redis/BullMQ dependency
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { count: totalCampaigns } = await supabase
      .from('broadcast_campaigns')
      .select('*', { count: 'exact', head: true });

    const { count: sendingCampaigns } = await supabase
      .from('broadcast_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sending');

    const { count: scheduledCampaigns } = await supabase
      .from('broadcast_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled');

    return NextResponse.json({
      mode: 'serverless',
      whatsapp_api: META_API_STATUS(),
      broadcast: {
        total_campaigns: totalCampaigns,
        sending: sendingCampaigns,
        scheduled: scheduledCampaigns,
        processor: 'Vercel Cron (every minute)',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function META_API_STATUS() {
  return {
    configured: !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID ? '***configured***' : 'missing',
    api_version: process.env.WHATSAPP_API_VERSION || 'v21.0',
  };
}
