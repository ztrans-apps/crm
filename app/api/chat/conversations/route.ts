// Example API route using middleware pattern
import { withAuth, withRole } from '@/core/auth/middleware'
import { requireMessagePermission } from '@/core/permissions/middleware'
import { requireTenantIdFromHeaders } from '@core/tenant'
import { chatService } from '@/features/chat/services'

/**
 * GET /api/chat/conversations
 * Get conversations for current user
 * Requires authentication
 */
export const GET = withAuth(async (req: Request, context) => {
  try {
    // Get tenant ID
    const tenantId = requireTenantIdFromHeaders(req.headers)
    
    // Check permission
    requirePermission(context, 'canViewAllConversations')

    // Get query params
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as 'open' | 'closed' | null
    const searchQuery = searchParams.get('q')

    // Get conversations using service (with tenant filter)
    const conversations = await chatService.conversations.getConversations(
      context.user.id,
      context.user.role,
      {
        status: status || undefined,
        searchQuery: searchQuery || undefined,
        tenantId, // Add tenant filter
      }
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: conversations,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to get conversations',
      }),
      {
        status: error.message === 'Tenant ID is required' ? 400 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * POST /api/chat/conversations
 * Create new conversation
 * Requires owner role
 */
export const POST = withRole(['owner', 'supervisor'], async (req: Request, context) => {
  try {
    // Get tenant ID
    const tenantId = requireTenantIdFromHeaders(req.headers)
    
    const body = await req.json()
    const { phoneNumber, name, message } = body

    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }

    // Create contact (with tenant)
    const contact = await chatService.contacts.getOrCreateContact(
      phoneNumber, 
      name,
      tenantId
    )

    // Create conversation
    // ... implementation

    return new Response(
      JSON.stringify({
        success: true,
        data: { contact },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create conversation',
      }),
      {
        status: error.message === 'Tenant ID is required' ? 400 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
