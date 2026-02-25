/**
 * Worker Health Check - Vercel compatible
 * Checks if broadcast processing is working by verifying recent cron activity
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if any campaigns are stuck (sending for more than 1 hour with no progress)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: stuckCampaigns } = await supabase
      .from('broadcast_campaigns')
      .select('id, name, started_at')
      .eq('status', 'sending')
      .lt('started_at', oneHourAgo);

    // Check recent sends (last 10 minutes)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentSends } = await supabase
      .from('broadcast_recipients')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', tenMinAgo);

    const healthy = (stuckCampaigns?.length || 0) === 0;

    return NextResponse.json({
      status: healthy ? 'healthy' : 'degraded',
      mode: 'serverless',
      processor: 'Vercel Cron',
      recentSendsLast10Min: recentSends || 0,
      stuckCampaigns: stuckCampaigns?.length || 0,
      whatsappApiConfigured: !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
}
