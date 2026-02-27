/**
 * Session States API
 * Returns WhatsApp session states from database (Meta Cloud API)
 * No external WhatsApp service needed — Meta handles connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx) => {
  // Get sessions from DB
  const { data: sessions } = await ctx.supabase
    .from('whatsapp_sessions')
    .select('id, status, phone_number, session_name')
    .eq('tenant_id', ctx.tenantId);

  // Map DB status to states format
  const states = (sessions || []).map(s => ({
    sessionId: s.id,
    state: 'CONNECTED', // Meta Cloud API numbers are always connected
    phoneNumber: s.phone_number,
    name: s.session_name,
  }));

  return NextResponse.json({
    success: true,
    states,
    timestamp: new Date().toISOString(),
    sessionCount: states.length,
  });
});
