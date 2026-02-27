import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  const { data: recipients, error } = await ctx.supabase
    .from('broadcast_recipients')
    .select(`
      *,
      contact:contacts(name)
    `)
    .eq('campaign_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipients' },
      { status: 500 }
    );
  }

  return NextResponse.json({ recipients: recipients || [] });
});
