import { NextRequest, NextResponse } from 'next/server'
import { withApiKey } from '@/lib/middleware/api-key-auth'
import { createClient } from '@/lib/supabase/server'

/**
 * List messages (API Key authenticated)
 * GET /api/v1/messages
 * 
 * Requires scope: messages:read
 */
export const GET = withApiKey(
  async (request, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const supabase = await createClient()

      const { data: messages, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('tenant_id', context.tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return NextResponse.json({
        messages,
        total: count,
        limit,
        offset,
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to get messages' },
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
 * Requires scope: messages:write
 */
export const POST = withApiKey(
  async (request, context) => {
    try {
      const body = await request.json()
      const { to, message, sessionId } = body

      if (!to || !message) {
        return NextResponse.json(
          { error: 'to and message are required' },
          { status: 400 }
        )
      }

      // Queue message for sending
      // (Implementation would use the queue system)

      return NextResponse.json({
        success: true,
        message: 'Message queued for sending',
        messageId: 'generated-id',
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to send message' },
        { status: 500 }
      )
    }
  },
  'messages:write' // Required scope
)

