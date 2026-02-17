/**
 * WhatsApp Sessions API
 * Get all WhatsApp sessions
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('[WhatsApp Sessions] Auth error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    if (!user) {
      console.error('[WhatsApp Sessions] No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[WhatsApp Sessions] User ID:', user.id);

    // Get user's tenant_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[WhatsApp Sessions] Profile error:', profileError);
      // If profile doesn't exist or error, return empty sessions
      return NextResponse.json({ sessions: [] });
    }

    if (!profile?.tenant_id) {
      console.log('[WhatsApp Sessions] No tenant_id found for user');
      return NextResponse.json({ sessions: [] });
    }

    console.log('[WhatsApp Sessions] Tenant ID:', profile.tenant_id);

    // Get all sessions for this tenant
    const { data: sessions, error: sessionsError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('[WhatsApp Sessions] Database error:', sessionsError);
      throw sessionsError;
    }

    console.log('[WhatsApp Sessions] Found sessions:', sessions?.length || 0);

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error: any) {
    console.error('[WhatsApp Sessions] Unexpected error:', error);
    console.error('[WhatsApp Sessions] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
