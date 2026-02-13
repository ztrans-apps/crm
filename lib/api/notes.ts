// API functions for conversation notes
import { createClient } from '@/lib/supabase/client'
import type { ConversationNote } from '@/lib/types/chat'

/**
 * Fetch notes for a conversation
 */
export async function fetchNotes(
  conversationId: string
): Promise<ConversationNote[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversation_notes')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notes:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Save a new note
 */
export async function saveNote(
  conversationId: string,
  content: string,
  rating: number | null,
  userId: string
): Promise<ConversationNote> {
  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error('Note content cannot be empty')
  }

  // Validate content length
  if (content.length > 1000) {
    throw new Error('Note content exceeds 1000 characters limit')
  }

  // Validate rating range
  if (rating !== null && (rating < 0 || rating > 10)) {
    throw new Error('Rating must be between 0 and 10')
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('conversation_notes')
      // @ts-ignore - Supabase type issue
      .insert({
        conversation_id: conversationId,
        content: content.trim(),
        rating,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving note:', error)
      throw new Error(error.message)
    }

    return data
  } catch (error: any) {
    console.error('Error in saveNote:', error)
    throw error
  }
}

/**
 * Update an existing note
 */
export async function updateNote(
  noteId: string,
  content: string,
  rating: number | null
): Promise<ConversationNote> {
  // Validate content length
  if (content.length > 1000) {
    throw new Error('Note content exceeds 1000 characters limit')
  }

  // Validate rating range
  if (rating !== null && (rating < 0 || rating > 10)) {
    throw new Error('Rating must be between 0 and 10')
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversation_notes')
    // @ts-ignore - Supabase type issue
    .update({
      content,
      rating,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single()

  if (error) {
    console.error('Error updating note:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversation_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Error deleting note:', error)
    throw new Error(error.message)
  }
}

/**
 * Get latest note for a conversation
 */
export async function getLatestNote(
  conversationId: string
): Promise<ConversationNote | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversation_notes')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error fetching latest note:', error)
    throw new Error(error.message)
  }

  return data
}
