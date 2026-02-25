/**
 * WhatsApp Disconnect API
 * Disconnect WhatsApp session
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update status in database (Meta Cloud API sessions are managed via Meta Business Manager)
    await supabase
      .from('whatsapp_sessions')
      // @ts-ignore
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[WhatsApp Disconnect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect session' },
      { status: 500 }
    );
  }
}
