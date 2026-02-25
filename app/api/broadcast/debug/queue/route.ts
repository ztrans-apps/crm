/**
 * Broadcast Debug - Queue Status
 * Vercel-compatible: reads from Supabase instead of BullMQ
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: campaigns } = await supabase
      .from('broadcast_campaigns')
      .select('id, name, status, total_recipients, created_at, started_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const details: any[] = [];
    for (const campaign of (campaigns || []).slice(0, 5)) {
      const { data: recipients } = await supabase
        .from('broadcast_recipients')
        .select('id, status, sent_at, failed_at, error_message')
        .eq('campaign_id', campaign.id)
        .limit(50);

      details.push({
        ...campaign,
        recipients_summary: {
          pending: recipients?.filter(r => r.status === 'pending').length || 0,
          sent: recipients?.filter(r => r.status === 'sent').length || 0,
          failed: recipients?.filter(r => r.status === 'failed').length || 0,
          total: recipients?.length || 0,
        },
        recent_failures: recipients?.filter(r => r.status === 'failed').slice(0, 5).map(r => ({
          id: r.id,
          error: r.error_message,
          failed_at: r.failed_at,
        })),
      });
    }

    return NextResponse.json({
      mode: 'serverless',
      processor: 'Vercel Cron → /api/cron/process-broadcasts',
      campaigns: details,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
