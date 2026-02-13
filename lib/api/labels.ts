// API functions for labels
import { createClient } from '@/lib/supabase/client'
import type { Label, ConversationLabel } from '@/lib/types/chat'

/**
 * Fetch all labels for a user
 */
export async function fetchLabels(userId: string): Promise<Label[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching labels:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Create a new label
 */
export async function createLabel(
  userId: string,
  name: string,
  color: string
): Promise<Label> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('labels')
    // @ts-ignore - Supabase type issue
    .insert({
      user_id: userId,
      name,
      color,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating label:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Update a label
 */
export async function updateLabel(
  labelId: string,
  updates: { name?: string; color?: string }
): Promise<Label> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('labels')
    // @ts-ignore - Supabase type issue
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', labelId)
    .select()
    .single()

  if (error) {
    console.error('Error updating label:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Delete a label
 */
export async function deleteLabel(labelId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', labelId)

  if (error) {
    console.error('Error deleting label:', error)
    throw new Error(error.message)
  }
}

/**
 * Fetch labels for a conversation
 */
export async function fetchConversationLabels(
  conversationId: string
): Promise<(ConversationLabel & { label: Label })[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversation_labels')
    .select(`
      *,
      label:labels(*)
    `)
    .eq('conversation_id', conversationId)

  if (error) {
    console.error('Error fetching conversation labels:', error)
    throw new Error(error.message)
  }

  return data as (ConversationLabel & { label: Label })[]
}

/**
 * Apply label to conversation
 */
export async function applyLabel(
  conversationId: string,
  labelId: string,
  userId: string
): Promise<ConversationLabel & { label: Label }> {
  const supabase = createClient()

  // Check if conversation already has 5 labels
  const { data: existingLabels } = await supabase
    .from('conversation_labels')
    .select('id')
    .eq('conversation_id', conversationId)

  if (existingLabels && existingLabels.length >= 5) {
    throw new Error('Maximum 5 labels per conversation')
  }

  // Check if label is already applied
  const { data: existing } = await supabase
    .from('conversation_labels')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('label_id', labelId)
    .single()

  if (existing) {
    throw new Error('Label already applied to this conversation')
  }

  // Apply label
  const { data, error } = await supabase
    .from('conversation_labels')
    // @ts-ignore - Supabase type issue
    .insert({
      conversation_id: conversationId,
      label_id: labelId,
      created_by: userId,
    })
    .select(`
      *,
      label:labels(*)
    `)
    .single()

  if (error) {
    console.error('Error applying label:', error)
    throw new Error(error.message)
  }

  return data as ConversationLabel & { label: Label }
}

/**
 * Remove label from conversation
 */
export async function removeLabel(
  conversationId: string,
  labelId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversation_labels')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('label_id', labelId)

  if (error) {
    console.error('Error removing label:', error)
    throw new Error(error.message)
  }
}

/**
 * Get default labels for a user (create if not exist)
 */
export async function getOrCreateDefaultLabels(userId: string): Promise<Label[]> {
  const supabase = createClient()

  // Check if user has labels
  const { data: existingLabels } = await supabase
    .from('labels')
    .select('*')
    .eq('user_id', userId)

  if (existingLabels && existingLabels.length > 0) {
    return existingLabels
  }

  // Create default labels
  const defaultLabels = [
    { name: 'Important', color: '#EF4444' }, // red
    { name: 'Follow-up', color: '#F59E0B' }, // amber
    { name: 'Resolved', color: '#10B981' }, // green
    { name: 'Pending', color: '#3B82F6' }, // blue
    { name: 'Not Important', color: '#6B7280' }, // gray
  ]

  const { data, error } = await supabase
    .from('labels')
    .insert(
      // @ts-ignore - Supabase type issue
      defaultLabels.map((label) => ({
        user_id: userId,
        name: label.name,
        color: label.color,
      }))
    )
    .select()

  if (error) {
    console.error('Error creating default labels:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Get all available labels (for agents - get labels from owner or any user)
 */
export async function getAllAvailableLabels(): Promise<Label[]> {
  const supabase = createClient()

  // Get current user to check their role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('No user found when fetching labels')
    return []
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profileData = profile as any
  console.log('Fetching labels for user:', user.id, 'role:', profileData?.role)

  // Try to get all labels (this might be restricted by RLS)
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching available labels:', error)
    
    // Fallback: If agent can't access all labels, try to get labels from their own user_id
    // or create default labels
    if (profileData?.role === 'agent') {
      console.log('Agent cannot access all labels, trying fallback...')
      return await getOrCreateDefaultLabels(user.id)
    }
    
    throw new Error(error.message)
  }

  console.log('Labels fetched successfully:', data?.length || 0, 'labels')

  if (!data || data.length === 0) {
    // No labels exist, create default ones
    console.log('No labels found, creating defaults...')
    return await getOrCreateDefaultLabels(user.id)
  }

  // Remove duplicates by name (keep first occurrence)
  const uniqueLabels = data.reduce((acc: Label[], label: Label) => {
    if (!acc.find(l => l.name === label.name)) {
      acc.push(label)
    }
    return acc
  }, [])

  return uniqueLabels || []
}
