// API functions for quick replies
import { createClient } from '@/lib/supabase/client'
import type { QuickReply, QuickReplyVariables } from '@/lib/types/chat'

/**
 * Fetch all quick replies for a user
 */
export async function fetchQuickReplies(userId: string): Promise<QuickReply[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quick_replies')
    .select('*')
    .eq('user_id', userId)
    .order('title', { ascending: true })

  if (error) {
    console.error('Error fetching quick replies:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Fetch quick replies by category
 */
export async function fetchQuickRepliesByCategory(
  userId: string,
  category: string
): Promise<QuickReply[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quick_replies')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .order('title', { ascending: true })

  if (error) {
    console.error('Error fetching quick replies by category:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Create a new quick reply
 */
export async function createQuickReply(
  userId: string,
  title: string,
  content: string,
  variables?: QuickReplyVariables,
  category?: string
): Promise<QuickReply> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quick_replies')
    .insert({
      user_id: userId,
      title,
      content,
      variables: variables || {},
      category: category || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating quick reply:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Update a quick reply
 */
export async function updateQuickReply(
  replyId: string,
  updates: {
    title?: string
    content?: string
    variables?: QuickReplyVariables
    category?: string
  }
): Promise<QuickReply> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quick_replies')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', replyId)
    .select()
    .single()

  if (error) {
    console.error('Error updating quick reply:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Delete a quick reply
 */
export async function deleteQuickReply(replyId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('quick_replies')
    .delete()
    .eq('id', replyId)

  if (error) {
    console.error('Error deleting quick reply:', error)
    throw new Error(error.message)
  }
}

/**
 * Replace variables in quick reply content
 */
export function replaceVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content

  // Replace all {variable} patterns
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(pattern, value)
  })

  return result
}

/**
 * Parse variables from quick reply content
 */
export function parseVariables(content: string): string[] {
  const pattern = /\{([^}]+)\}/g
  const matches = content.matchAll(pattern)
  const variables = new Set<string>()

  for (const match of matches) {
    variables.add(match[1])
  }

  return Array.from(variables)
}

/**
 * Get or create default quick replies
 */
export async function getOrCreateDefaultQuickReplies(
  userId: string
): Promise<QuickReply[]> {
  const supabase = createClient()

  // Check if user has quick replies
  const { data: existingReplies } = await supabase
    .from('quick_replies')
    .select('*')
    .eq('user_id', userId)

  if (existingReplies && existingReplies.length > 0) {
    return existingReplies
  }

  // Create default quick replies
  const defaultReplies = [
    {
      title: 'Greeting',
      content: 'Hello {name}! How can I help you today?',
      category: 'General',
      variables: { name: 'Customer Name' },
    },
    {
      title: 'Thank You',
      content: 'Thank you for contacting us! We appreciate your business.',
      category: 'General',
      variables: {},
    },
    {
      title: 'Working Hours',
      content: 'Our working hours are Monday-Friday, 9 AM - 5 PM. We will respond to your message during business hours.',
      category: 'Information',
      variables: {},
    },
    {
      title: 'Order Status',
      content: 'Let me check your order status. Please provide your order number.',
      category: 'Support',
      variables: {},
    },
    {
      title: 'Follow Up',
      content: 'Hi {name}, I am following up on our previous conversation. Is there anything else I can help you with?',
      category: 'Follow-up',
      variables: { name: 'Customer Name' },
    },
  ]

  const { data, error } = await supabase
    .from('quick_replies')
    .insert(
      defaultReplies.map((reply) => ({
        user_id: userId,
        title: reply.title,
        content: reply.content,
        category: reply.category,
        variables: reply.variables,
      }))
    )
    .select()

  if (error) {
    console.error('Error creating default quick replies:', error)
    throw new Error(error.message)
  }

  return data || []
}
