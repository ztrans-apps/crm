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

    // Reconnect / start Baileys session (required for QR)
    const { getWhatsAppServiceUrl, isLocalWhatsAppServiceUrl } = await import(
      '@/lib/whatsapp/service-url'
    )
    const whatsappServiceUrl = getWhatsAppServiceUrl()

    if (isLocalWhatsAppServiceUrl(whatsappServiceUrl) && process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            'WHATSAPP_SERVICE_URL still points to localhost on Vercel. Set it to your VPS URL and redeploy.',
        },
        { status: 503 }
      )
    }

    const serviceUrl = `${whatsappServiceUrl}/api/whatsapp/reconnect/${sessionId}${forceNew ? '?forceNew=true' : ''}`
    console.log('[WhatsApp Reconnect] Calling service:', serviceUrl)

    try {
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[WhatsApp Reconnect] Service response:', errorData)
        throw new Error(errorData.error || 'Failed to reconnect WhatsApp service')
      }

      const data = await response.json()
      console.log('[WhatsApp Reconnect] Service response:', data)

      return NextResponse.json({
        success: true,
        sessionId,
        ...data,
      })
    } catch (serviceError: any) {
      console.error('[WhatsApp Reconnect] Service error:', serviceError)
      return NextResponse.json(
        {
          error:
            serviceError.message ||
            'Failed to reach Baileys whatsapp-service. Check WHATSAPP_SERVICE_URL and VPS.',
        },
        { status: 503 }
      )
    }
  } catch (error: any) {
    console.error('[WhatsApp Reconnect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reconnect session' },
      { status: 500 }
    );
  }
}
