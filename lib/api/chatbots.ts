// API functions for chatbot sessions
import { createClient } from '@/lib/supabase/client'
import type { ChatbotSession, Chatbot } from '@/lib/types/chat'

/**
 * Fetch active chatbots for a conversation
 */
export async function fetchActiveChatbots(
  conversationId: string
): Promise<(ChatbotSession & { chatbot: Chatbot })[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('chatbot_sessions')
    .select(`
      *,
      chatbot:chatbots(*)
    `)
    .eq('conversation_id', conversationId)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching active chatbots:', error)
    throw new Error(error.message)
  }

  return data as (ChatbotSession & { chatbot: Chatbot })[]
}

/**
 * Fetch all chatbot sessions for a conversation
 */
export async function fetchChatbotSessions(
  conversationId: string
): Promise<(ChatbotSession & { chatbot: Chatbot })[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('chatbot_sessions')
    .select(`
      *,
      chatbot:chatbots(*)
    `)
    .eq('conversation_id', conversationId)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching chatbot sessions:', error)
    throw new Error(error.message)
  }

  return data as (ChatbotSession & { chatbot: Chatbot })[]
}

/**
 * Start a chatbot session
 */
export async function startChatbotSession(
  conversationId: string,
  chatbotId: string
): Promise<ChatbotSession & { chatbot: Chatbot }> {
  const supabase = createClient()

  // Check if there's already an active session for this chatbot
  const { data: existingSession } = await supabase
    .from('chatbot_sessions')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('chatbot_id', chatbotId)
    .eq('is_active', true)
    .single()

  if (existingSession) {
    throw new Error('Chatbot session already active for this conversation')
  }

  const { data, error } = await supabase
    .from('chatbot_sessions')
    // @ts-ignore - Supabase type issue
    .insert({
      conversation_id: conversationId,
      chatbot_id: chatbotId,
      is_active: true,
    })
    .select(`
      *,
      chatbot:chatbots(*)
    `)
    .single()

  if (error) {
    console.error('Error starting chatbot session:', error)
    throw new Error(error.message)
  }

  return data as ChatbotSession & { chatbot: Chatbot }
}

/**
 * Stop a chatbot session
 */
export async function stopChatbotSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('chatbot_sessions')
    // @ts-ignore - Supabase type issue
    .update({
      is_active: false,
      stopped_at: new Date().toISOString(),
      stopped_by: userId,
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Error stopping chatbot session:', error)
    throw new Error(error.message)
  }
}

/**
 * Toggle chatbot for a conversation
 */
export async function toggleChatbot(
  conversationId: string,
  chatbotId: string,
  isActive: boolean,
  userId: string
): Promise<ChatbotSession & { chatbot: Chatbot }> {
  if (isActive) {
    // Start new session
    return await startChatbotSession(conversationId, chatbotId)
  } else {
    // Stop existing session
    const supabase = createClient()

    // Find active session
    const { data: session } = await supabase
      .from('chatbot_sessions')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('chatbot_id', chatbotId)
      .eq('is_active', true)
      .single()

    const sessionData = session as any
    if (sessionData) {
      await stopChatbotSession(sessionData.id, userId)
    }

    // Return updated session
    const { data, error } = await supabase
      .from('chatbot_sessions')
      .select(`
        *,
        chatbot:chatbots(*)
      `)
      .eq('id', sessionData?.id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as ChatbotSession & { chatbot: Chatbot }
  }
}

/**
 * Stop all active chatbots for a conversation
 */
export async function stopAllChatbots(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('chatbot_sessions')
    // @ts-ignore - Supabase type issue
    .update({
      is_active: false,
      stopped_at: new Date().toISOString(),
      stopped_by: userId,
    })
    .eq('conversation_id', conversationId)
    .eq('is_active', true)

  if (error) {
    console.error('Error stopping all chatbots:', error)
    throw new Error(error.message)
  }
}

/**
 * Check if any chatbot is active for a conversation
 */
export async function hasActiveChatbot(
  conversationId: string
): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('chatbot_sessions')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('is_active', true)
    .limit(1)

  if (error) {
    console.error('Error checking active chatbot:', error)
    return false
  }

  return data && data.length > 0
}
