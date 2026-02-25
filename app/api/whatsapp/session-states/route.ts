/**
 * Session States API
 * Returns WhatsApp session states from database (Meta Cloud API)
 * No external WhatsApp service needed — Meta handles connection.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        states: [],
        timestamp: new Date().toISOString(),
        sessionCount: 0,
      });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({
        success: true,
        states: [],
        timestamp: new Date().toISOString(),
        sessionCount: 0,
      });
    }

    // Get sessions from DB
    const { data: sessions } = await supabase
      .from('whatsapp_sessions')
      .select('id, status, phone_number, session_name')
      .eq('tenant_id', profile.tenant_id);

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
  } catch (error: any) {
    console.error('[Session States] Error:', error.message);

    return NextResponse.json({
      success: false,
      error: error.message,
      states: [],
      timestamp: new Date().toISOString(),
      sessionCount: 0,
    }, { status: 200 });
  }
}
