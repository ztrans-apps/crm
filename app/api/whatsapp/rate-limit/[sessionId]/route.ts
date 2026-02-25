/**
 * WhatsApp Rate Limit Status
 * Vercel-compatible: Meta Cloud API handles rate limiting automatically
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  return NextResponse.json({
    sessionId,
    note: 'Rate limiting is managed by Meta WhatsApp Cloud API',
    meta_limits: {
      business_initiated: '1,000 messages/day (Tier 1) up to unlimited',
      user_initiated: 'Unlimited within 24-hour window',
      template_messages: 'Depends on quality rating and tier',
      api_rate: '80 messages/second',
    },
    docs: 'https://developers.facebook.com/docs/whatsapp/messaging-limits',
  });
}
