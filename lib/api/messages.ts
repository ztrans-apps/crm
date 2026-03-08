// API functions for messages
import type { MessageOutput } from '@/lib/dto/message.dto'
import type { ErrorResponse } from '@/lib/middleware/error-handler'

/**
 * API response wrapper for better error handling
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ErrorResponse
}

export interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

export interface UploadMediaResponse {
  success: boolean
  url?: string
  filename?: string
  size?: number
  error?: string
}

export interface MediaAttachment {
  file: File
  type: 'image' | 'video' | 'audio' | 'document'
}

/**
 * Fetch messages for a conversation
 */
export async function fetchMessages(
  conversationId: string
): Promise<ApiResponse<{ messages: MessageOutput[] }>> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
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
    console.error('Error fetching messages:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to fetch messages',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Send message via internal API route (Meta Cloud API)
 * Note: This function still uses the legacy /api/send-message endpoint
 * which will be migrated in a future task
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
    // Prepare request body for internal API
    const body: any = {
      sessionId,
      to,
      message: content,
    }

    // Add media if provided
    if (media && media.file) {
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

    // Send message via internal API route (routes to Meta Cloud API)
    const endpoint = media ? '/api/send-media' : '/api/send-message'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || errorData.message || 'Failed to send message',
      }
    }

    const result = await response.json()
    return {
      success: true,
      messageId: result.messageId || result.id,
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
 * Note: This still uses Supabase Storage directly as file storage API
 * is not yet migrated. This is acceptable for now as it's storage, not database access.
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

    // Use file storage API endpoint
    const formData = new FormData()
    formData.append('file', file)
    formData.append('conversationId', conversationId)

    const response = await fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Failed to upload file',
      }
    }

    const data = await response.json()
    return {
      success: true,
      url: data.url,
      filename: data.filename || file.name,
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
export async function markMessageAsRead(messageId: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/messages/${messageId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking message as read:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to mark message as read',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Delete message
 */
export async function deleteMessage(messageId: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting message:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to delete message',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}
