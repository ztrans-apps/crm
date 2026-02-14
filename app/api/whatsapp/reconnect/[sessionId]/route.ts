/**
 * WhatsApp Reconnect API
 * Reconnect existing WhatsApp session
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Get forceNew query parameter
    const url = new URL(request.url);
    const forceNew = url.searchParams.get('forceNew') === 'true';

    console.log('[WhatsApp Reconnect] Request:', { sessionId, forceNew });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update session status to connecting
    const { error: updateError } = await supabase
      .from('whatsapp_sessions')
      // @ts-ignore - Supabase type generation issue
      .update({ status: 'connecting' })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    // Reconnect in WhatsApp service
    try {
      const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
      const serviceUrl = `${whatsappServiceUrl}/api/whatsapp/reconnect/${sessionId}${forceNew ? '?forceNew=true' : ''}`
      
      console.log('[WhatsApp Reconnect] Calling service:', serviceUrl);
      
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[WhatsApp Reconnect] Service response:', errorData)
        throw new Error(errorData.error || 'Failed to reconnect WhatsApp service')
      }
      
      const data = await response.json()
      console.log('[WhatsApp Reconnect] Service response:', data)
    } catch (serviceError: any) {
      console.error('[WhatsApp Reconnect] Service error:', serviceError)
      // Continue anyway - user can retry
    }

    return NextResponse.json({ 
      success: true, 
      sessionId 
    });
  } catch (error: any) {
    console.error('[WhatsApp Reconnect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reconnect session' },
      { status: 500 }
    );
  }
}
