// API functions for messages
import { createClient } from '@/lib/supabase/client'
import type { 
  MessageWithRelations, 
  SendMessageResponse, 
  UploadMediaResponse,
  MediaAttachment 
} from '@/lib/types/chat'

/**
 * Fetch messages for a conversation
 */
export async function fetchMessages(
  conversationId: string
): Promise<MessageWithRelations[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(id, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    throw new Error(error.message)
  }

  return (data as MessageWithRelations[]) || []
}

/**
 * Send message via WhatsApp service
 */
export async function sendMessage(
  sessionId: string,
  to: string,
  content: string,
  conversationId: string,
  senderId: string,
  media?: MediaAttachment
): Promise<SendMessageResponse> {
  try {
    const serviceUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'
    
    // Prepare request body
    const body: any = {
      sessionId,
      to,
      message: content,
    }

    // Add media if provided
    if (media) {
      // Upload media first
      const uploadResult = await uploadMedia(media.file, conversationId)
      if (!uploadResult.success || !uploadResult.url) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload media',
        }
      }

      body.media = {
        url: uploadResult.url,
        filename: uploadResult.filename,
        mimetype: media.file.type,
      }
    }

    // Send message via WhatsApp service
    const response = await fetch(`${serviceUrl}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || 'Failed to send message',
      }
    }

    const result = await response.json()

    // Save message to database
    const supabase = createClient()
    const { data: messageData, error: dbError } = await supabase
      .from('messages')
      // @ts-ignore - Bypass Supabase type checking for RLS
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: senderId,
        message_type: media ? 'image' : 'text', // Simplified, should detect type
        content: content || '',
        media_url: media && result.mediaUrl ? result.mediaUrl : null,
        media_type: media?.type || null,
        media_filename: media?.file.name || null,
        media_size: media?.file.size || null,
        media_mime_type: media?.file.type || null,
        status: 'sent', // Use 'sent' as initial status (database constraint doesn't allow 'sending')
        is_from_me: true,
        whatsapp_message_id: result.messageId || null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error saving message to database:', dbError)
      // Message was sent but not saved to DB
      return {
        success: true,
        messageId: result.messageId,
      }
    }

    // Update conversation last message (keep as read since agent sent it)
    await supabase
      .from('conversations')
      // @ts-ignore - Bypass Supabase type checking
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        read_status: 'read', // Agent's message doesn't make it unread
        workflow_status: 'in_progress', // Auto-transition to in_progress when agent replies
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    return {
      success: true,
      // @ts-ignore
      messageId: messageData.id,
    }
  } catch (error) {
    console.error('Error sending message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Upload media file
 */
export async function uploadMedia(
  file: File,
  conversationId: string
): Promise<UploadMediaResponse> {
  try {
    // Validate file size (max 16MB)
    const maxSize = 16 * 1024 * 1024 // 16MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 16MB limit',
      }
    }

    // Validate file type
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
    ]

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'File type not supported',
      }
    }

    const supabase = createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const filename = `${conversationId}/${timestamp}-${randomString}.${extension}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading file:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filename)

    return {
      success: true,
      url: urlData.publicUrl,
      filename: file.name,
      size: file.size,
    }
  } catch (error) {
    console.error('Error uploading media:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Translate message to Indonesian using MyMemory Translation API
 */
export async function translateMessage(
  text: string,
  targetLanguage: string = 'id'
): Promise<string> {
  try {
    // Use MyMemory Translation API (free, no API key needed)
    const encodedText = encodeURIComponent(text)
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLanguage}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Translation API request failed')
    }
    
    const data = await response.json()
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText
    } else {
      throw new Error('Translation failed')
    }
  } catch (error) {
    console.error('Error translating message:', error)
    // Return original text if translation fails
    return text
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('messages')
    // @ts-ignore - Bypass Supabase type checking
    .update({
      status: 'read',
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  if (error) {
    console.error('Error marking message as read:', error)
    throw new Error(error.message)
  }
}

/**
 * Delete message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)

  if (error) {
    console.error('Error deleting message:', error)
    throw new Error(error.message)
  }
}
