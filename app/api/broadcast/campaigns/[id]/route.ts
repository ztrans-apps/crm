import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  const { data, error } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json({ campaign: data });
});

export const PATCH = withAuth(async (req, ctx, params) => {
  const { id } = await params;
  const body = await req.json();
  const { 
    status, 
    sent_count, 
    delivered_count, 
    read_count,
    failed_count,
    started_at,
    completed_at
  } = body;

  const { data: existing } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (status) updateData.status = status;
  if (sent_count !== undefined) updateData.sent_count = sent_count;
  if (delivered_count !== undefined) updateData.delivered_count = delivered_count;
  if (read_count !== undefined) updateData.read_count = read_count;
  if (failed_count !== undefined) updateData.failed_count = failed_count;
  if (started_at) updateData.started_at = started_at;
  if (completed_at) updateData.completed_at = completed_at;

  const { data, error } = await ctx.supabase
    .from('broadcast_campaigns')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }

  return NextResponse.json({ campaign: data });
});

export const DELETE = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  const { data: existing } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (existing.status === 'sending') {
    return NextResponse.json(
      { error: 'Cannot delete campaign that is currently sending' },
      { status: 400 }
    );
  }

  const { error } = await ctx.supabase
    .from('broadcast_campaigns')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);

  if (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
