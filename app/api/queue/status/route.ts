/**
 * Queue Status API
 * Returns broadcast processing status from Supabase (Vercel-compatible, no Redis needed)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get broadcast campaign stats as a proxy for queue status
    const { data: campaigns } = await supabase
      .from('broadcast_campaigns')
      .select('id, status, name, total_recipients, created_at')
      .in('status', ['sending', 'scheduled', 'completed', 'failed'])
      .order('created_at', { ascending: false })
      .limit(20);

    // Count recipients by status for active campaigns
    const activeCampaigns = campaigns?.filter(c => c.status === 'sending') || [];
    const stats: Record<string, any> = {};

    for (const campaign of activeCampaigns.slice(0, 5)) {
      const { data: recipients } = await supabase
        .from('broadcast_recipients')
        .select('status')
        .eq('campaign_id', campaign.id);

      if (recipients) {
        stats[campaign.id] = {
          name: campaign.name,
          pending: recipients.filter(r => r.status === 'pending').length,
          sent: recipients.filter(r => r.status === 'sent').length,
          failed: recipients.filter(r => r.status === 'failed').length,
          total: recipients.length,
        };
      }
    }

    return NextResponse.json({
      mode: 'serverless',
      note: 'Queue processing handled by Vercel Cron + Meta Cloud API',
      campaigns: campaigns || [],
      activeCampaignStats: stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
