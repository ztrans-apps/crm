// API functions for conversations
import { createClient } from '@/lib/supabase/client'
import type { ConversationWithRelations, ConversationFilter } from '@/lib/types/chat'

/**
 * Fetch conversations with filters and search
 */
export async function fetchConversations(
  userId: string,
  filter: ConversationFilter = 'all',
  searchQuery?: string
): Promise<ConversationWithRelations[]> {
  const supabase = createClient()

  // Build query
  let query = supabase
    .from('conversations')
    .select(`
      *,
      contact:contacts(*),
      labels:conversation_labels(
        *,
        label:labels(*)
      ),
      notes:conversation_notes(*),
      chatbot_sessions(
        *,
        chatbot:chatbots(*)
      )
    `)
    .order('last_message_at', { ascending: false })

  // Apply filter
  if (filter === 'read') {
    query = query.eq('read_status', 'read')
  } else if (filter === 'unread') {
    query = query.eq('read_status', 'unread')
  }

  // Apply search if provided
  if (searchQuery && searchQuery.trim()) {
    // Note: Full-text search on message content would require additional setup
    // For now, we'll fetch all and filter client-side
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching conversations:', error)
    throw new Error(error.message)
  }

  return (data as ConversationWithRelations[]) || []
}

/**
 * Fetch a single conversation by ID
 */
export async function fetchConversationById(
  conversationId: string
): Promise<ConversationWithRelations | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      contact:contacts(*),
      labels:conversation_labels(
        *,
        label:labels(*)
      ),
      notes:conversation_notes(*),
      chatbot_sessions(
        *,
        chatbot:chatbots(*)
      )
    `)
    .eq('id', conversationId)
    .single()

  if (error) {
    console.error('Error fetching conversation:', error)
    return null
  }

  return data as ConversationWithRelations
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({
      read_status: 'read',
      unread_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error marking conversation as read:', error)
    throw new Error(error.message)
  }
}

/**
 * Mark conversation as unread
 */
export async function markConversationAsUnread(
  conversationId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({
      read_status: 'unread',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error marking conversation as unread:', error)
    throw new Error(error.message)
  }
}

/**
 * Close conversation
 */
export async function closeConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({
      status: 'closed',
      workflow_status: 'done', // Auto-transition to done when closed
      closed_at: new Date().toISOString(),
      closed_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error closing conversation:', error)
    throw new Error(error.message)
  }
}

/**
 * Reopen conversation
 */
export async function reopenConversation(
  conversationId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({
      status: 'open',
      closed_at: null,
      closed_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error reopening conversation:', error)
    throw new Error(error.message)
  }
}

/**
 * Update response window expiration
 */
export async function updateResponseWindow(
  conversationId: string,
  expiresAt: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({
      response_window_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error updating response window:', error)
    throw new Error(error.message)
  }
}

/**
 * Assign conversation to agent
 */
export async function assignConversation(
  conversationId: string,
  agentId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({
      assigned_to: agentId,
      workflow_status: 'waiting', // Auto-transition to waiting when assigned
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error assigning conversation:', error)
    throw new Error(error.message)
  }
}

/**
 * Unassign conversation
 */
export async function unassignConversation(
  conversationId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({
      assigned_to: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error unassigning conversation:', error)
    throw new Error(error.message)
  }
}
