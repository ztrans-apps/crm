/**
 * WhatsApp Delete API
 * Delete WhatsApp session and auth files
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const DELETE = withAuth(async (req, ctx, params) => {
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

  // Delete from database (Meta Cloud API numbers are managed via Meta Business Manager)
  await ctx.supabase
    .from('whatsapp_sessions')
    .delete()
    .eq('id', sessionId);

  return NextResponse.json({ success: true });
}, { permission: 'whatsapp.session.manage' });
