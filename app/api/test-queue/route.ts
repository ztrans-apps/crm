/**
 * Test Queue System API
 * For testing queue functionality
 */

import { WhatsAppSendService } from '@/modules/whatsapp/services/send.service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    const sendService = new WhatsAppSendService();

    // Send message via queue
    const result = await sendService.sendMessage({
      tenantId: process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001',
      sessionId: 'test-session',
      to,
      message,
    });

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      message: 'Message queued successfully',
    });
  } catch (error: any) {
    console.error('[Test Queue] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to queue message' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Queue Test API',
    usage: {
      method: 'POST',
      body: {
        to: '6281234567890',
        message: 'Test message',
      },
    },
    example: `
      curl -X POST http://localhost:3000/api/test-queue \\
        -H "Content-Type: application/json" \\
        -d '{"to":"6281234567890","message":"Hello from queue!"}'
    `,
  });
}
