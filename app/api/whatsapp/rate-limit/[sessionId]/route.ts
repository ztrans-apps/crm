import { NextRequest, NextResponse } from 'next/server';
import { baileysAdapter } from '@/lib/queue/adapters/baileys-adapter';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
    
    // Get rate limit status from adapter
    const status = baileysAdapter.getRateLimitStatus(sessionId, defaultTenantId);

    return NextResponse.json({
      success: true,
      sessionId,
      ...status,
      maxMessages: 20, // From rate limiter config
      windowMs: 60000, // 1 minute
    });
  } catch (error: any) {
    console.error('Error getting rate limit status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get rate limit status' },
      { status: 500 }
    );
  }
}
