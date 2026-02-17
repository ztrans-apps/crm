import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/broadcast/debug/scheduled
 * Debug scheduled campaigns (no auth for debugging)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get all scheduled campaigns
    const { data: campaigns, error } = await supabase
      .from('broadcast_campaigns')
      .select('id, name, status, scheduled_at, created_at')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true });

    if (error) {
      throw error;
    }

    const now = new Date();
    const nowISO = now.toISOString();
    const nowLocal = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    return NextResponse.json({
      currentTime: {
        iso: nowISO,
        local: nowLocal,
        timestamp: now.getTime()
      },
      scheduledCampaigns: campaigns?.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        scheduled_at: c.scheduled_at,
        scheduled_at_local: c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : null,
        created_at: c.created_at,
        isReady: c.scheduled_at ? new Date(c.scheduled_at) <= now : false,
        timeUntil: c.scheduled_at ? Math.round((new Date(c.scheduled_at).getTime() - now.getTime()) / 1000) : null
      })) || [],
      count: campaigns?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/broadcast/debug/scheduled:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
