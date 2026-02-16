/**
 * Update Message Metadata API
 * Used by worker to update message with WhatsApp message ID and raw message
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await context.params;
    
    // Validate messageId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      return NextResponse.json(
        { error: `Invalid message ID format: ${messageId}` },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { whatsapp_message_id, raw_message } = body;

    if (!whatsapp_message_id || !raw_message) {
      return NextResponse.json(
        { error: 'whatsapp_message_id and raw_message are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get existing message to preserve other metadata
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('metadata')
      .eq('id', messageId)
      .single();

    // Merge with existing metadata
    const updatedMetadata = {
      ...(existingMessage?.metadata || {}),
      raw_message
    };

    // Update message
    const { error } = await supabase
      .from('messages')
      .update({
        whatsapp_message_id,
        status: 'sent',
        updated_at: new Date().toISOString(),
        metadata: updatedMetadata
      })
      .eq('id', messageId);

    if (error) {
      console.error('[Update Metadata] Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId,
      whatsapp_message_id
    });
  } catch (error: any) {
    console.error('[Update Metadata] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update message metadata' },
      { status: 500 }
    );
  }
}
