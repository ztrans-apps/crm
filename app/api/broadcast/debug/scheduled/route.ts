import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/broadcast/debug/scheduled
 * Permission: admin.access (debug endpoint)
 */
export const GET = withAuth(async (request, ctx) => {
  const { data: campaigns, error } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('id, name, status, scheduled_at, created_at')
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true });

  if (error) throw error;

  const now = new Date();

  return NextResponse.json({
    currentTime: {
      iso: now.toISOString(),
      local: now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
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
}, { permission: 'admin.access' });
