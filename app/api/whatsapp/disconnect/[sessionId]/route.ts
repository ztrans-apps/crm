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

    // Disconnect session in WhatsApp service
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL}/api/whatsapp/sessions/${sessionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        console.error('[WhatsApp Disconnect] Service error');
      }
    } catch (serviceError) {
      console.error('[WhatsApp Disconnect] Service error:', serviceError);
    }

    // Update status in database
    await supabase
      .from('whatsapp_sessions')
      .update({ status: 'disconnected' })
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
