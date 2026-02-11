// Permission middleware - checks user permissions
import type { AuthContext } from '../auth/middleware'
import type { UserRole, RolePermissions } from '@/lib/permissions/roles'
import { getPermissions, hasPermission as checkPermission } from '@/lib/permissions/roles'
import { 
  canSendMessageToConversation,
  canViewConversation,
  canPickConversation,
  canAssignToAgent,
  canHandover,
  canCloseConversation,
} from '@/lib/permissions/chat'

/**
 * Check if user has specific permission
 */
export function requirePermission(
  context: AuthContext,
  permission: keyof RolePermissions
): void {
  const hasAccess = checkPermission(context.user.role, permission)
  
  if (!hasAccess) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

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

  const canSend = canSendMessageToConversation(
    context.user.role,
    context.user.id,
    conversation
  )

  if (!canSend) {
    throw new Error('Cannot send message to this conversation')
  }

  return conversation
}

/**
 * Check if user can pick conversation
 */
export async function requirePickPermission(
  context: AuthContext,
  conversationId: string
): Promise<any> {
  const conversation = await requireConversationAccess(context, conversationId)

  const canPick = canPickConversation(context.user.role, conversation)

  if (!canPick) {
    throw new Error('Cannot pick this conversation')
  }

  return conversation
}

/**
 * Check if user can assign conversation
 */
export function requireAssignPermission(context: AuthContext): void {
  const canAssign = canAssignToAgent(context.user.role)

  if (!canAssign) {
    throw new Error('Cannot assign conversations')
  }
}

/**
 * Check if user can handover conversation
 */
export async function requireHandoverPermission(
  context: AuthContext,
  conversationId: string
): Promise<any> {
  const conversation = await requireConversationAccess(context, conversationId)

  const canHandoverConv = canHandover(
    context.user.role,
    context.user.id,
    conversation
  )

  if (!canHandoverConv) {
    throw new Error('Cannot handover this conversation')
  }

  return conversation
}

/**
 * Check if user can close conversation
 */
export async function requireClosePermission(
  context: AuthContext,
  conversationId: string
): Promise<any> {
  const conversation = await requireConversationAccess(context, conversationId)

  const canClose = canCloseConversation(context.user.role, conversation)

  if (!canClose) {
    throw new Error('Cannot close this conversation')
  }

  return conversation
}

/**
 * Middleware wrapper with permission check
 * Usage: export const POST = withPermission('canSendMessage', async (req, context) => { ... })
 */
export function withPermission(
  permission: keyof RolePermissions,
  handler: (req: Request, context: AuthContext) => Promise<Response>
) {
  return async (req: Request, context: AuthContext): Promise<Response> => {
    try {
      requirePermission(context, permission)
      return await handler(req, context)
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Permission denied',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
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

/**
 * Get user permissions object
 */
export function getUserPermissions(role: UserRole): RolePermissions {
  return getPermissions(role)
}

/**
 * Check multiple permissions at once
 */
export function requirePermissions(
  context: AuthContext,
  permissions: Array<keyof RolePermissions>
): void {
  for (const permission of permissions) {
    requirePermission(context, permission)
  }
}
