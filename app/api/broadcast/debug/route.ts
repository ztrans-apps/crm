import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { broadcastQueue } from '@/lib/queue/workers/broadcast-send.worker';

/**
 * GET /api/broadcast/debug
 * Debug broadcast system status
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get recent campaigns
    const { data: campaigns } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get queue stats
    let queueStats = null;
    try {
      const waiting = await broadcastQueue.getWaitingCount();
      const active = await broadcastQueue.getActiveCount();
      const completed = await broadcastQueue.getCompletedCount();
      const failed = await broadcastQueue.getFailedCount();
      
      queueStats = {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      queueStats = { error: 'Failed to get queue stats' };
    }

    // Get recent recipients for latest campaign
    let recipients = null;
    if (campaigns && campaigns.length > 0) {
      const { data: recipientData } = await supabase
        .from('broadcast_recipients')
        .select('*')
        .eq('campaign_id', campaigns[0].id)
        .limit(10);
      
      recipients = recipientData;
    }

    return NextResponse.json({
      campaigns: campaigns || [],
      queueStats,
      recipients: recipients || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/broadcast/debug:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
