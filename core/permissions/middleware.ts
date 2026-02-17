// Permission middleware - checks user permissions using RBAC
import type { AuthContext } from '../auth/middleware'
import { canSendMessageToConversation, canViewConversation } from '@/lib/rbac/chat-permissions'

/**
 * Check conversation access
 */
export async function requireConversationAccess(
  context: AuthContext,
  conversationId: string
): Promise<any> {
  const { data: conversation, error } = await context.supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (error || !conversation) {
    throw new Error('Conversation not found')
  }

  const canView = canViewConversation(
    context.user.role,
    context.user.id,
    conversation
  )

  if (!canView) {
    throw new Error('Access denied to this conversation')
  }

  return conversation
}

/**
 * Check if user can send message to conversation
 */
export async function requireMessagePermission(
  context: AuthContext,
  conversationId: string
): Promise<any> {
  const conversation = await requireConversationAccess(context, conversationId)

  const canSend = await canSendMessageToConversation(
    context.user.id,
    conversation
  )

  if (!canSend) {
    throw new Error('Cannot send message to this conversation')
  }

  return conversation
}

/**
 * Middleware wrapper with conversation access check
 */
export function withConversationAccess(
  handler: (req: Request, context: AuthContext, conversation: any) => Promise<Response>
) {
  return async (req: Request, context: AuthContext): Promise<Response> => {
    try {
      // Get conversationId from URL or body
      const url = new URL(req.url)
      const conversationId = url.searchParams.get('conversationId') || 
                            url.pathname.split('/').pop()

      if (!conversationId) {
        throw new Error('Conversation ID required')
      }

      const conversation = await requireConversationAccess(context, conversationId)
      return await handler(req, context, conversation)
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Access denied',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
