import { z } from 'zod'

/**
 * Phone number validation regex (E.164 format)
 * Matches international phone numbers with optional + prefix
 * Examples: +14155552671, 14155552671, +442071838750
 */
export const PHONE_NUMBER_REGEX = /^\+?[1-9]\d{1,14}$/

/**
 * Allowed MIME types for file uploads
 */
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
} as const

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// ============================================================================
// Contact Schemas
// ============================================================================

/**
 * Schema for creating a new contact
 * Validates: Requirements 1.1, 1.7, 1.10
 */
export const CreateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone_number: z.string().regex(PHONE_NUMBER_REGEX),
  email: z.string().refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)).optional(),
  notes: z.string().max(5000, {}).optional(),
  tags: z.array(z.string()).max(50, {}).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

/**
 * Schema for updating an existing contact
 * Validates: Requirements 1.1, 1.10
 */
export const UpdateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)).optional(),
  notes: z.string().max(5000, {}).optional(),
  tags: z.array(z.string()).max(50, {}).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

// ============================================================================
// Message Schemas
// ============================================================================

/**
 * Schema for sending a message
 * Validates: Requirements 1.1, 1.10
 */
export const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(4096),
  media_url: z.string().url().optional(),
  media_type: z.enum(['image', 'video', 'audio', 'document']).optional()
}).refine(
  (data) => {
    // If media_url is provided, media_type must also be provided
    if (data.media_url && !data.media_type) {
      return false
    }
    return true
  },
  {
    message: 'media_type is required when media_url is provided',
    path: ['media_type']
  }
)

// ============================================================================
// Broadcast Schemas
// ============================================================================

/**
 * Schema for creating a broadcast
 * Validates: Requirements 1.1, 1.10
 */
export const CreateBroadcastSchema = z.object({
  name: z.string().min(1).max(255),
  message_template: z.string().min(1).max(4096),
  target_filter: z.record(z.string(), z.unknown()).optional(),
  scheduled_at: z.string().datetime().optional()
})

// ============================================================================
// Conversation Schemas
// ============================================================================

/**
 * Schema for creating a conversation
 * Validates: Requirements 1.1, 1.10
 */
export const CreateConversationSchema = z.object({
  contact_id: z.string().uuid(),
  assigned_to: z.string().uuid().optional().nullable(),
  status: z.enum(['open', 'closed']).optional(),
  workflow_status: z.enum(['incoming', 'waiting', 'in_progress', 'done']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

/**
 * Schema for updating a conversation
 * Validates: Requirements 1.1, 1.10
 */
export const UpdateConversationSchema = z.object({
  assigned_to: z.string().uuid().optional().nullable(),
  status: z.enum(['open', 'closed']).optional(),
  workflow_status: z.enum(['incoming', 'waiting', 'in_progress', 'done']).optional(),
  last_message: z.string().max(1000).optional().nullable(),
  last_message_at: z.string().datetime().optional().nullable(),
  unread_count: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

// ============================================================================
// File Upload Schemas
// ============================================================================

/**
 * Schema for file upload metadata validation
 * Validates: Requirements 1.8, 16.1, 16.2, 16.3
 */
export const FileUploadSchema = z.object({
  type: z.enum(['image', 'video', 'audio', 'document']),
  size: z.number().positive().max(MAX_FILE_SIZE),
  mimeType: z.string().refine(
    (mimeType) => {
      // Check if the MIME type is in any of the allowed categories
      return Object.values(ALLOWED_MIME_TYPES).some(types => (types as readonly string[]).includes(mimeType))
    },
    {
      message: 'Invalid MIME type. Allowed types: JPEG, PNG, GIF, WebP for images; MP4, MPEG, QuickTime, WebM for videos; MP3, MP4, OGG, WAV for audio; PDF, DOC, DOCX for documents'
    }
  ),
  filename: z.string().min(1).max(255)
}).refine(
  (data) => {
    // Validate that the MIME type matches the declared file type
    const allowedTypes = ALLOWED_MIME_TYPES[data.type]
    return (allowedTypes as readonly string[]).includes(data.mimeType)
  },
  {
    message: 'MIME type does not match the declared file type',
    path: ['mimeType']
  }
)

// ============================================================================
// Type Exports
// ============================================================================

export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
export type SendMessageInput = z.infer<typeof SendMessageSchema>
export type CreateBroadcastInput = z.infer<typeof CreateBroadcastSchema>
export type FileUploadInput = z.infer<typeof FileUploadSchema>
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>
