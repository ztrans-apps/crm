/**
 * WhatsApp Init API
 * Register a WhatsApp Business number (Meta Cloud API)
 * No QR code or Baileys service needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { randomUUID } from 'crypto';

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { phoneNumber, name, metaPhoneNumberId } = body;

  // Generate UUID for session ID
  const sessionId = randomUUID();

  // Prepare session data
  const sessionData: any = {
    id: sessionId,
    user_id: ctx.user.id,
    phone_number: phoneNumber || '',
    session_name: name || phoneNumber || 'WhatsApp Business',
    status: 'connected', // Meta Cloud API numbers are always connected
    meta_phone_number_id: metaPhoneNumberId || process.env.META_PHONE_NUMBER_ID || null,
    tenant_id: ctx.tenantId,
  };

  // Create session in database
  const { data: session, error } = await ctx.supabase
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
}, { permission: 'whatsapp.session.create' });
