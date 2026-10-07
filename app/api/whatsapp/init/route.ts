/**
 * WhatsApp Init API
 * Initialize new WhatsApp session
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const FALLBACK_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function resolveTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.tenant_id) {
    return profile.tenant_id;
  }

  if (process.env.DEFAULT_TENANT_ID) {
    return process.env.DEFAULT_TENANT_ID;
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .maybeSingle();

  return tenant?.id || FALLBACK_TENANT_ID;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { phoneNumber, name } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveTenantId(supabase, user.id);

    // Generate proper UUID for session ID
    const sessionId = randomUUID();

    // Generate unique session name from phone number with timestamp
    const timestamp = Date.now();
    const sessionName = phoneNumber 
      ? `${phoneNumber}-${timestamp}` 
      : `session-${timestamp}`;

    // Prepare session data (tenant_id is NOT NULL)
    const sessionData: any = {
      id: sessionId,
      user_id: user.id,
      tenant_id: tenantId,
      phone_number: phoneNumber || 'Connecting...',
      session_name: name || sessionName,
      status: 'connecting',
    };

    // Create session in database
    const { data: session, error } = await supabase
      .from('whatsapp_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;

    // Initialize session in Baileys WhatsApp service
    const whatsappServiceUrl =
      process.env.WHATSAPP_SERVICE_URL ||
      process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL ||
      'http://localhost:3001';

    try {
      const response = await fetch(
        `${whatsappServiceUrl}/api/whatsapp/init`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId,
            forceNew: true // Always force new session to generate QR
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initialize WhatsApp service');
      }
    } catch (serviceError) {
      console.error('[WhatsApp Init] Service error:', serviceError);
      // Continue anyway - user can retry
    }

    return NextResponse.json({ 
      success: true, 
      sessionId: session.id 
    });
  } catch (error: any) {
    console.error('[WhatsApp Init] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize session' },
      { status: 500 }
    );
  }
}
