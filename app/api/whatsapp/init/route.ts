/**
 * WhatsApp Init API
 * Register a WhatsApp Business number (Meta Cloud API)
 * No QR code or Baileys service needed.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { phoneNumber, name, metaPhoneNumberId } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    // Generate UUID for session ID
    const sessionId = randomUUID();

    // Prepare session data
    const sessionData: any = {
      id: sessionId,
      user_id: user.id,
      phone_number: phoneNumber || '',
      session_name: name || phoneNumber || 'WhatsApp Business',
      status: 'connected', // Meta Cloud API numbers are always connected
      meta_phone_number_id: metaPhoneNumberId || process.env.META_PHONE_NUMBER_ID || null,
    };

    // Add tenant_id
    if (profile?.tenant_id) {
      sessionData.tenant_id = profile.tenant_id;
    } else {
      const defaultTenantId = process.env.DEFAULT_TENANT_ID;
      if (defaultTenantId) {
        sessionData.tenant_id = defaultTenantId;
      }
    }

    // Create session in database
    const { data: session, error } = await supabase
      .from('whatsapp_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      sessionId: session.id,
      message: 'WhatsApp number registered successfully via Meta Cloud API',
    });
  } catch (error: any) {
    console.error('[WhatsApp Init] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register number' },
      { status: 500 }
    );
  }
}
