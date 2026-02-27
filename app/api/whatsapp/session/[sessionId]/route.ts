import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/whatsapp/session/:sessionId
 * Permission: whatsapp.session.view (enforced by middleware)
 */
export const GET = withAuth(async (request, ctx, params) => {
  const { sessionId } = await params;

  const { data: session, error } = await ctx.supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
});

/**
 * PATCH /api/whatsapp/session/:sessionId
 * Permission: whatsapp.session.manage
 */
export const PATCH = withAuth(async (request, ctx, params) => {
  const { sessionId } = await params;
  const body = await request.json();

  const { data: session, error } = await ctx.supabase
    .from('whatsapp_sessions')
    .update({ session_name: body.session_name })
    .eq('id', sessionId)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(session);
}, { permission: 'whatsapp.session.manage' });
