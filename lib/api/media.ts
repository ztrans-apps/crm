// API functions for media assets
import { createClient } from '@/lib/supabase/client'
import type { MediaAsset, MediaType } from '@/lib/types/chat'

/**
 * Fetch media assets for a conversation
 */
export async function fetchMediaAssets(
  conversationId: string,
  type?: MediaType
): Promise<MediaAsset[]> {
  const supabase = createClient()

  let query = supabase
    .from('messages')
    .select('id, media_type, media_url, media_filename, media_size, media_mime_type, created_at')
    .eq('conversation_id', conversationId)
    .not('media_type', 'is', null)
    .order('created_at', { ascending: false })

  // Filter by type if provided
  if (type) {
    query = query.eq('media_type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching media assets:', error)
    throw new Error(error.message)
  }

  // Transform to MediaAsset format
  const assets: MediaAsset[] = ((data || []) as any[]).map((msg: any) => ({
    id: msg.id,
    message_id: msg.id,
    type: msg.media_type as MediaType,
    url: msg.media_url || '',
    filename: msg.media_filename || '',
    size: msg.media_size || 0,
    mime_type: msg.media_mime_type || '',
    created_at: msg.created_at,
  }))

  return assets
}

/**
 * Get media count by type for a conversation
 */
export async function getMediaCountByType(
  conversationId: string
): Promise<Record<MediaType, number>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('media_type')
    .eq('conversation_id', conversationId)
    .not('media_type', 'is', null)

  if (error) {
    console.error('Error fetching media count:', error)
    throw new Error(error.message)
  }

  // Count by type
  const counts: Record<string, number> = {}
  const messages = (data || []) as any[]
  messages.forEach((msg: any) => {
    const type = msg.media_type
    if (type) {
      counts[type] = (counts[type] || 0) + 1
    }
  })

  return {
    image: counts.image || 0,
    video: counts.video || 0,
    audio: counts.audio || 0,
    document: counts.document || 0,
    location: counts.location || 0,
    vcard: counts.vcard || 0,
  }
}

/**
 * Delete media asset
 */
export async function deleteMediaAsset(messageId: string): Promise<void> {
  const supabase = createClient()

  // Get message to find media URL
  const { data: message } = await supabase
    .from('messages')
    .select('media_url, media_filename')
    .eq('id', messageId)
    .single()

  const messageData = message as any
  if (!messageData || !messageData.media_url) {
    throw new Error('Media not found')
  }

  // Delete from storage if it's in Supabase storage
  if (messageData.media_url.includes('supabase')) {
    try {
      // Extract file path from URL
      const urlParts = messageData.media_url.split('/storage/v1/object/public/chat-media/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from('chat-media').remove([filePath])
      }
    } catch (error) {
      console.error('Error deleting from storage:', error)
      // Continue even if storage deletion fails
    }
  }

  // Clear media fields in message
  const { error } = await supabase
    .from('messages')
    // @ts-ignore - Supabase type issue
    .update({
      media_type: null,
      media_url: null,
      media_filename: null,
      media_size: null,
      media_mime_type: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  if (error) {
    console.error('Error deleting media asset:', error)
    throw new Error(error.message)
  }
}

/**
 * Get total media size for a conversation
 */
export async function getTotalMediaSize(conversationId: string): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('media_size')
    .eq('conversation_id', conversationId)
    .not('media_size', 'is', null)

  if (error) {
    console.error('Error fetching total media size:', error)
    throw new Error(error.message)
  }

  const messages = (data || []) as any[]
  const totalSize = messages.reduce((sum, msg: any) => sum + (msg.media_size || 0), 0)
  return totalSize
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get media type icon
 */
export function getMediaTypeIcon(type: MediaType): string {
  const icons: Record<MediaType, string> = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    document: '📄',
    location: '📍',
    vcard: '👤',
  }
  return icons[type] || '📎'
}

/**
 * Validate media file
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 16MB)
  const maxSize = 16 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 16MB limit' }
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' }
  }

  return { valid: true }
}
