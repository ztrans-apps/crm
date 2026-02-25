/**
 * WhatsApp Webhook Handler
 * Handles incoming messages and status updates from WhatsApp Business API
 * 
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WebhookMessage, WebhookStatus } from '@/lib/whatsapp/providers/base-provider'

// Ensure Meta always receives 200 OK to prevent webhook retries
const OK_RESPONSE = NextResponse.json({ success: true }, { status: 200 })

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token'

/**
 * GET - Webhook verification
 * Meta will call this endpoint to verify the webhook
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verify the webhook
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] Verification successful')
    return new NextResponse(challenge, { status: 200 })
  }

  console.error('[Webhook] Verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST - Handle incoming webhooks
 * Receives messages and status updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[Webhook] Received:', JSON.stringify(body, null, 2))

    // Validate webhook payload
    if (!body.object || body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid webhook object' }, { status: 400 })
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          await handleMessagesChange(change.value)
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error)
    // Still return 200 to prevent retries
    return NextResponse.json({ success: true }, { status: 200 })
  }
}

/**
 * Handle messages change event
 */
async function handleMessagesChange(value: any) {
  const supabase = await createClient()

  // Handle incoming messages
  if (value.messages && value.messages.length > 0) {
    for (const message of value.messages) {
      await handleIncomingMessage(message, value.metadata, supabase)
    }
  }

  // Handle message status updates
  if (value.statuses && value.statuses.length > 0) {
    for (const status of value.statuses) {
      await handleStatusUpdate(status, supabase)
    }
  }
}

/**
 * Handle incoming message
 */
async function handleIncomingMessage(
  message: WebhookMessage,
  metadata: any,
  supabase: any
) {
  try {
    console.log('[Webhook] Processing incoming message:', message.id)

    const phoneNumberId = metadata.phone_number_id
    const from = message.from
    const messageId = message.id
    const timestamp = message.timestamp

    // Get or create conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, tenant_id')
      .eq('phone_number', from)
      .eq('phone_number_id', phoneNumberId)
      .single()

    let conversationId = conversation?.id
    let tenantId = conversation?.tenant_id

    if (!conversation) {
      // Create new conversation
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          phone_number: from,
          phone_number_id: phoneNumberId,
          status: 'open',
          last_message_at: new Date(parseInt(timestamp) * 1000).toISOString(),
        })
        .select('id, tenant_id')
        .single()

      conversationId = newConversation?.id
      tenantId = newConversation?.tenant_id
    }

    // Extract message content based on type
    let content = ''
    let mediaId = null

    switch (message.type) {
      case 'text':
        content = message.text?.body || ''
        break
      case 'image':
        content = message.image?.caption || '[Image]'
        mediaId = message.image?.id
        break
      case 'video':
        content = message.video?.caption || '[Video]'
        mediaId = message.video?.id
        break
      case 'audio':
        content = '[Audio]'
        mediaId = message.audio?.id
        break
      case 'document':
        content = message.document?.caption || `[Document: ${message.document?.filename}]`
        mediaId = message.document?.id
        break
      case 'location':
        content = `[Location: ${message.location?.name || 'Unknown'}]`
        break
      case 'interactive':
        if (message.interactive?.type === 'button_reply') {
          content = message.interactive.button_reply?.title || ''
        } else if (message.interactive?.type === 'list_reply') {
          content = message.interactive.list_reply?.title || ''
        }
        break
      default:
        content = `[${message.type}]`
    }

    // Save message to database
    await supabase.from('messages').insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      message_id: messageId,
      phone_number: from,
      direction: 'incoming',
      message_type: message.type,
      content,
      media_id: mediaId,
      status: 'received',
      received_at: new Date(parseInt(timestamp) * 1000).toISOString(),
    })

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date(parseInt(timestamp) * 1000).toISOString(),
        last_message_content: content,
      })
      .eq('id', conversationId)

    // Trigger chatbot if enabled
    // TODO: Implement chatbot trigger

    console.log('[Webhook] Message processed successfully:', messageId)
  } catch (error) {
    console.error('[Webhook] Error handling incoming message:', error)
  }
}

/**
 * Handle status update
 */
async function handleStatusUpdate(status: WebhookStatus, supabase: any) {
  try {
    console.log('[Webhook] Processing status update:', status.id, status.status)

    // Update message status in database
    await supabase
      .from('messages')
      .update({
        status: status.status,
        updated_at: new Date(parseInt(status.timestamp) * 1000).toISOString(),
      })
      .eq('message_id', status.id)

    // If failed, log error
    if (status.status === 'failed' && status.errors) {
      console.error('[Webhook] Message failed:', status.id, status.errors)
      
      await supabase
        .from('messages')
        .update({
          error_code: status.errors[0]?.code,
          error_message: status.errors[0]?.message,
        })
        .eq('message_id', status.id)
    }

    console.log('[Webhook] Status updated successfully:', status.id)
  } catch (error) {
    console.error('[Webhook] Error handling status update:', error)
  }
}
