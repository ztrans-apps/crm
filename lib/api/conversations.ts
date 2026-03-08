// API functions for conversations
import type { ConversationOutput } from '@/lib/dto/conversation.dto'
import type { ErrorResponse } from '@/lib/middleware/error-handler'

/**
 * API response wrapper for better error handling
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ErrorResponse
}

export type ConversationFilter = 'all' | 'read' | 'unread'

/**
 * Fetch conversations with filters and search
 */
export async function fetchConversations(
  userId: string,
  filter: ConversationFilter = 'all',
  searchQuery?: string
): Promise<ApiResponse<{ conversations: ConversationOutput[] }>> {
  try {
    const searchParams = new URLSearchParams()
    if (filter !== 'all') searchParams.set('filter', filter)
    if (searchQuery) searchParams.set('search', searchQuery)

    const response = await fetch(`/api/conversations?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to fetch conversations',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Fetch a single conversation by ID
 */
export async function fetchConversationById(
  conversationId: string
): Promise<ApiResponse<{ conversation: ConversationOutput }>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to fetch conversation',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking conversation as read:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to mark conversation as read',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Mark conversation as unread
 */
export async function markConversationAsUnread(
  conversationId: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/unread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking conversation as unread:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to mark conversation as unread',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Close conversation
 */
export async function closeConversation(
  conversationId: string,
  userId: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error closing conversation:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to close conversation',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Reopen conversation
 */
export async function reopenConversation(
  conversationId: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error reopening conversation:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to reopen conversation',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Update response window expiration
 */
export async function updateResponseWindow(
  conversationId: string,
  expiresAt: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/response-window`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresAt }),
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating response window:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to update response window',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Assign conversation to agent
 */
export async function assignConversation(
  conversationId: string,
  agentId: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error assigning conversation:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to assign conversation',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Unassign conversation
 */
export async function unassignConversation(
  conversationId: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/unassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error unassigning conversation:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to unassign conversation',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}
