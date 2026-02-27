/**
 * Test Queue System API
 * For testing queue functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { WhatsAppSendService } from '@/modules/whatsapp/services/send.service';

export const POST = withAuth(async (req, ctx) => {
  const { to, message } = await req.json();

  if (!to || !message) {
    return NextResponse.json(
      { error: 'Missing required fields: to, message' },
      { status: 400 }
    );
  }

  const sendService = new WhatsAppSendService();

  // Send message via queue
  const result = await sendService.sendMessage({
    tenantId: ctx.tenantId,
    sessionId: 'test-session',
    to,
    message,
  });

  return NextResponse.json({
    success: true,
    jobId: result.jobId,
    message: 'Message queued successfully',
  });
}, { permission: 'admin.access' });

export const GET = withAuth(async (req, ctx) => {
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
}, { permission: 'admin.access' });
