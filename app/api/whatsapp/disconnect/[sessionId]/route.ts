/**
 * WhatsApp Disconnect API
 * Disconnect WhatsApp session
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const POST = withAuth(async (req, ctx, params) => {
  const { sessionId } = await params;

  // Verify session belongs to user
  const { data: session, error: sessionError } = await ctx.supabase
    .from('whatsapp_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', ctx.user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Update status in database (Meta Cloud API sessions are managed via Meta Business Manager)
  await ctx.supabase
    .from('whatsapp_sessions')
    // @ts-ignore
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  return NextResponse.json({ success: true });
}, { permission: 'whatsapp.session.disconnect' });
