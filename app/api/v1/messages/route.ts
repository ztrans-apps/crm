import { NextRequest, NextResponse } from 'next/server'
import { withApiKey } from '@/lib/middleware/api-key-auth'
import { MessageService } from '@/lib/services/message-service'
import { SendMessageSchema } from '@/lib/validation/schemas'
import { createClient } from '@supabase/supabase-js'

/**
 * Create a service client for API key authenticated requests
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * List messages (API Key authenticated)
 * GET /api/v1/messages
 * 
 * Query Parameters:
 * - conversation_id: Optional conversation ID to filter messages
 * - limit: Items per page (default: 50)
 * - offset: Offset for pagination (default: 0)
 * 
 * Requires scope: messages:read
 * Requirements: 4.7, 9.1, 9.2
 */
export const GET = withApiKey(
  async (request, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const conversationId = searchParams.get('conversation_id')
      const limit = parseInt(searchParams.get('limit') || '50', 10)
      const offset = parseInt(searchParams.get('offset') || '0', 10)

      // Calculate page from offset
      const page = Math.floor(offset / limit) + 1

      // Create service client for API key requests
      const serviceClient = createServiceClient()

      // Initialize MessageService with authenticated context
      const messageService = new MessageService(serviceClient, context.tenantId)

      if (conversationId) {
        // List messages for a specific conversation
        const result = await messageService.listMessages(conversationId, {
          page,
          pageSize: limit,
        })

        // Return response in backward-compatible format
        return NextResponse.json({
          messages: result.data,
          total: result.total,
          limit,
          offset,
        })
      } else {
        // If no conversation_id provided, return error
        // (In the old implementation, this would list all messages, but that's not efficient)
        return NextResponse.json(
          { error: 'conversation_id parameter is required' },
          { status: 400 }
        )
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to get messages', message: error.message },
        { status: 500 }
      )
    }
  },
  'messages:read' // Required scope
)

/**
 * Send message (API Key authenticated)
 * POST /api/v1/messages
 * 
 * Note: This endpoint uses a simplified API for backward compatibility.
 * The request body uses 'to' and 'message' fields instead of the standard
 * 'conversation_id' and 'content' fields.
 * 
 * Requires scope: messages:write
 * Requirements: 4.7, 9.1, 9.2
 */
export const POST = withApiKey(
  async (request, context) => {
    try {
      const body = await request.json()
      const { to, message, sessionId, conversation_id, content, media_url, media_type } = body

      // Support both old API (to/message) and new API (conversation_id/content)
      const conversationId = conversation_id || sessionId
      const messageContent = content || message

      if (!conversationId || !messageContent) {
        return NextResponse.json(
          { error: 'conversation_id (or sessionId) and content (or message) are required' },
          { status: 400 }
        )
      }

      // Validate using Zod schema
      const validationResult = SendMessageSchema.safeParse({
        conversation_id: conversationId,
        content: messageContent,
        media_url,
        media_type,
      })

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validationResult.error.issues },
          { status: 400 }
        )
      }

      // Create service client for API key requests
      const serviceClient = createServiceClient()

      // Initialize MessageService
      const messageService = new MessageService(serviceClient, context.tenantId)

      // Send message using service layer
      // Note: We use a system user ID for API key authenticated requests
      const sentMessage = await messageService.sendMessage(
        validationResult.data,
        'api-key-user' // Placeholder sender ID for API key requests
      )

      // Return response in backward-compatible format
      return NextResponse.json({
        success: true,
        message: 'Message queued for sending',
        messageId: sentMessage.id,
        data: sentMessage,
      })
    } catch (error: any) {
      console.error('Error sending message:', error)
      return NextResponse.json(
        { error: 'Failed to send message', message: error.message },
        { status: 500 }
      )
    }
  },
  'messages:write' // Required scope
)

