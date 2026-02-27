/**
 * WhatsApp Sessions API
 * Get all WhatsApp sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx) => {
  // Get all sessions for this tenant
  const { data: sessions, error: sessionsError } = await ctx.supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (sessionsError) {
    console.error('[WhatsApp Sessions] Database error:', sessionsError);
    throw sessionsError;
  }

  return NextResponse.json({ sessions: sessions || [] });
});
