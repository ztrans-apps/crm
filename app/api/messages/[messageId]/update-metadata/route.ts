/**
 * Update Message Metadata API
 * Used by worker to update message with WhatsApp message ID and raw message
 * 
 * Requirements: 4.7, 9.1, 9.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { z } from 'zod';

/**
 * Schema for updating message metadata
 */
const UpdateMetadataSchema = z.object({
  whatsapp_message_id: z.string().min(1),
  raw_message: z.record(z.unknown()),
  status: z.enum(['pending', 'sent', 'delivered', 'read', 'failed']).optional(),
});

export const PATCH = withAuth(async (req, ctx, params) => {
  try {
    const { messageId } = await params;

    // Validate messageId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      return NextResponse.json(
        { error: `Invalid message ID format: ${messageId}` },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate request body
    const validationResult = UpdateMetadataSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { whatsapp_message_id, raw_message, status } = validationResult.data;

    // Use service client to bypass RLS (called by workers)
    const supabase = ctx.serviceClient;

    // Get existing message to preserve other metadata
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('metadata')
      .eq('id', messageId)
      .single();

    // Merge with existing metadata
    const updatedMetadata = {
      ...(existingMessage?.metadata || {}),
      raw_message,
    };

    // Update message
    const { error } = await supabase
      .from('messages')
      .update({
        whatsapp_message_id,
        status: status || 'sent',
        updated_at: new Date().toISOString(),
        metadata: updatedMetadata,
      })
      .eq('id', messageId);

    if (error) {
      console.error('[Update Metadata] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update message metadata', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId,
      whatsapp_message_id,
    });
  } catch (error: any) {
    console.error('[Update Metadata] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update message metadata', message: error.message },
      { status: 500 }
    );
  }
}, {
  permission: 'admin.access',
  rateLimit: {
    maxRequests: 200,
    windowSeconds: 60,
    keyPrefix: 'messages:update-metadata',
  },
});
