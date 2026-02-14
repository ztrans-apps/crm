/**
 * WhatsApp Init API
 * Initialize new WhatsApp session
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { phoneNumber } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate proper UUID for session ID
    const sessionId = randomUUID();

    // Generate unique session name from phone number with timestamp
    const timestamp = Date.now();
    const sessionName = phoneNumber 
      ? `${phoneNumber}-${timestamp}` 
      : `session-${timestamp}`;

    // Prepare session data
    const sessionData: any = {
      id: sessionId,
      user_id: user.id,
      phone_number: phoneNumber || 'Connecting...',
      session_name: sessionName,
      status: 'connecting',
    };

    // Add tenant_id if available (for multi-tenant support)
    const defaultTenantId = process.env.DEFAULT_TENANT_ID;
    if (defaultTenantId) {
      sessionData.tenant_id = defaultTenantId;
    }

    // Create session in database
    const { data: session, error } = await supabase
      .from('whatsapp_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;

    // Initialize session in WhatsApp service
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL}/api/whatsapp/init`,
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
