/**
 * Queue Metrics - Vercel compatible
 * Returns broadcast processing metrics from Supabase
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get campaign stats
    const { data: campaigns } = await supabase
      .from('broadcast_campaigns')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: recipients } = await supabase
      .from('broadcast_recipients')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const campaignStats = {
      total: campaigns?.length || 0,
      sending: campaigns?.filter(c => c.status === 'sending').length || 0,
      completed: campaigns?.filter(c => c.status === 'completed').length || 0,
      failed: campaigns?.filter(c => c.status === 'failed').length || 0,
      scheduled: campaigns?.filter(c => c.status === 'scheduled').length || 0,
    };

    const recipientStats = {
      total: recipients?.length || 0,
      pending: recipients?.filter(r => r.status === 'pending').length || 0,
      sent: recipients?.filter(r => r.status === 'sent').length || 0,
      delivered: recipients?.filter(r => r.status === 'delivered').length || 0,
      failed: recipients?.filter(r => r.status === 'failed').length || 0,
    };

    return NextResponse.json({
      mode: 'serverless',
      period: 'last_24h',
      campaigns: campaignStats,
      messages: recipientStats,
      throughput: {
        note: 'Processing via Vercel Cron every minute, ~30 recipients per invocation',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
