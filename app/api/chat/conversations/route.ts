// API route using enhanced withAuth middleware with validation and rate limiting
import { withAuth } from '@/lib/middleware/with-auth'
import { ConversationService } from '@/lib/services/conversation-service'
import { CreateConversationSchema, UpdateConversationSchema } from '@/lib/validation/schemas'
import { NextResponse } from 'next/server'

/**
 * GET /api/chat/conversations
 * Get conversations for current user with filtering
 * 
 * **Requirements: 2.1, 2.5, 4.7, 9.1, 9.2**
 * - Authentication required (2.1)
 * - Permission-based authorization (2.5)
 * - Service layer delegation (4.7)
 * - No direct database access from API routes (9.1, 9.2)
 */
export const GET = withAuth(
  async (req, context) => {
    try {
      // Initialize service with tenant context
      const conversationService = new ConversationService(
        context.supabase,
        context.tenantId
      )

      // Get query params
      const { searchParams } = new URL(req.url)
      const status = searchParams.get('status') as 'open' | 'closed' | null
      const workflowStatus = searchParams.get('workflow_status') as 'incoming' | 'waiting' | 'in_progress' | 'done' | null
      const assignedTo = searchParams.get('assigned_to')
      const contactId = searchParams.get('contact_id')
      const page = parseInt(searchParams.get('page') || '1', 10)
      const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
      const sortBy = searchParams.get('sortBy') as 'created_at' | 'updated_at' | 'last_message_at' | null
      const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' | null

      // Get conversations using service
      const result = await conversationService.listConversations({
        status: status || undefined,
        workflow_status: workflowStatus || undefined,
        assigned_to: assignedTo || undefined,
        contact_id: contactId || undefined,
        page,
        pageSize,
        sortBy: sortBy || undefined,
        sortDirection: sortDirection || undefined,
      })

      return NextResponse.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          hasMore: result.hasMore,
        },
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to get conversations',
        },
        { status: 500 }
      )
    }
  },
  {
    permission: 'conversation.view',
    rateLimit: {
      maxRequests: 100,
      windowSeconds: 60,
    },
  }
)

/**
 * POST /api/chat/conversations
 * Create new conversation
 * 
 * **Requirements: 1.2, 2.1, 2.5, 4.7, 9.1, 9.2**
 * - Input validation with Zod (1.2)
 * - Authentication required (2.1)
 * - Permission-based authorization (2.5)
 * - Service layer delegation (4.7)
 * - No direct database access from API routes (9.1, 9.2)
 */
export const POST = withAuth(
  async (req, context) => {
    try {
      // Validate request body
      const body = context.validatedBody

      // Initialize service with tenant context
      const conversationService = new ConversationService(
        context.supabase,
        context.tenantId
      )

      // Create conversation using service
      const conversation = await conversationService.createConversation(
        body,
        context.user.id
      )

      return NextResponse.json(
        {
          success: true,
          data: conversation,
        },
        { status: 201 }
      )
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to create conversation',
        },
        { status: 500 }
      )
    }
  },
  {
    permission: 'conversation.create',
    validation: {
      body: CreateConversationSchema,
    },
    rateLimit: {
      maxRequests: 50,
      windowSeconds: 60,
    },
  }
)

