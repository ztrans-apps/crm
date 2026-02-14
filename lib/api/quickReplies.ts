// API functions for quick replies
import { createClient } from '@/lib/supabase/client'
import type { QuickReply, QuickReplyVariables } from '@/lib/types/chat'

/**
 * Fetch ALL quick replies (shared across all users)
 * All users can view and use all quick replies
 */
export async function fetchQuickReplies(): Promise<QuickReply[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quick_replies')
    .select('*')
    .order('title', { ascending: true })

  if (error) {
    console.error('Error fetching quick replies:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Fetch quick replies by category (all users)
 */
export async function fetchQuickRepliesByCategory(
  category: string
): Promise<QuickReply[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quick_replies')
    .select('*')
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
  const defaultTenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'

  const { data, error } = await supabase
    .from('quick_replies')
    // @ts-ignore - Supabase type issue
    .insert({
      user_id: userId,
      title,
      content,
      variables: variables || {},
      category: category || null,
      tenant_id: defaultTenantId,
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
    // @ts-ignore - Supabase type issue
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
 * Get all quick replies (shared across all users)
 * No need to create defaults - owner manages via /quick-replies page
 */
export async function getAllQuickReplies(): Promise<QuickReply[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quick_replies')
    .select('*')
    .order('title', { ascending: true })

  if (error) {
    console.error('Error fetching quick replies:', error)
    throw new Error(error.message)
  }

  return data || []
}
