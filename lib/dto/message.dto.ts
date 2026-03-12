/**
 * Message Data Transfer Objects (DTOs)
 * 
 * Type-safe data transfer objects for message operations.
 * Input DTOs define the structure for API requests.
 * Output DTOs define the structure for API responses (excluding sensitive fields).
 * 
 * **Requirements: 6.1, 6.2, 6.3, 6.5, 6.10**
 */

/**
 * Media type for message attachments
 */
export type MediaType = 'image' | 'video' | 'audio' | 'document'

/**
 * Message status
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

/**
 * Message direction
 */
export type MessageDirection = 'inbound' | 'outbound'

/**
 * Input DTO for sending a new message
 * 
 * **Requirement 6.1**: Input data structure for API operations
 * **Requirement 6.3**: TypeScript interfaces for compile-time type checking
 */
export interface SendMessageInput {
  conversation_id: string
  content: string
  media_url?: string
  media_type?: MediaType
}

/**
 * Output DTO for message responses
 * 
 * Excludes sensitive fields like tenant_id and internal metadata.
 * 
 * **Requirement 6.2**: Output data structure for API operations
 * **Requirement 6.5**: Exclude sensitive fields from API responses
 * **Requirement 6.10**: Clear type definitions for frontend consumption
 */
export interface MessageOutput {
  id: string
  conversation_id: string
  sender_id: string | null
  content: string
  media_url: string | null
  media_type: MediaType | null
  status: MessageStatus
  direction: MessageDirection
  created_at: string
  delivered_at: string | null
  read_at: string | null
  // Excludes: tenant_id, internal metadata
}

/**
 * Database model for messages (internal use only)
 * 
 * This represents the full database schema including sensitive fields.
 * Should not be exposed directly to API responses.
 */
export interface MessageModel {
  id: string
  tenant_id: string
  conversation_id: string
  sender_type: 'customer' | 'agent' | 'bot'
  sender_id: string | null
  content: string
  media_url: string | null
  media_type: MediaType | null
  status: MessageStatus
  is_from_me: boolean
  message_type: string
  metadata: Record<string, unknown> | null
  created_at: string
  delivered_at: string | null
  read_at: string | null
  updated_at: string
}

/**
 * Filter options for listing messages
 */
export interface MessageFilters {
  conversation_id?: string
  status?: MessageStatus
  direction?: MessageDirection
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  sortDirection?: 'asc' | 'desc'
}

/**
 * Paginated message list response
 */
export interface MessageListOutput {
  data: MessageOutput[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Message statistics
 */
export interface MessageStats {
  total: number
  sent: number
  delivered: number
  read: number
  failed: number
  pending: number
}


/**
 * Transformation Functions
 * 
 * Functions to transform between database models and DTOs.
 * 
 * **Requirements: 6.6, 6.7**
 */

/**
 * Transform database model to output DTO
 * 
 * Excludes sensitive fields (tenant_id, internal metadata) from the response.
 * 
 * **Requirement 6.6**: Transform database models to API response formats
 * **Requirement 6.5**: Exclude sensitive fields from API responses
 * 
 * @param model - Message database model
 * @returns Message output DTO
 */
export function toMessageOutput(model: MessageModel): MessageOutput {
  return {
    id: model.id,
    conversation_id: model.conversation_id,
    sender_id: model.sender_id,
    content: model.content,
    media_url: model.media_url,
    media_type: model.media_type,
    status: model.status,
    direction: model.is_from_me ? 'outbound' : 'inbound',
    created_at: model.created_at,
    delivered_at: model.delivered_at,
    read_at: model.read_at,
  }
}

/**
 * Transform input DTO to database model (for create operations)
 * 
 * **Requirement 6.7**: Transform API request formats to database models
 * 
 * @param input - Send message input DTO
 * @param tenantId - Tenant ID to associate with the message
 * @param senderId - ID of the user sending the message
 * @returns Partial message model for database insertion
 */
export function fromSendMessageInput(
  input: SendMessageInput,
  tenantId: string,
  senderId: string
): Partial<MessageModel> {
  return {
    tenant_id: tenantId,
    conversation_id: input.conversation_id,
    sender_type: 'agent',
    sender_id: senderId,
    content: input.content,
    media_url: input.media_url || null,
    media_type: input.media_type || null,
    message_type: input.media_url ? input.media_type || 'image' : 'text',
    status: 'pending',
    is_from_me: true,
    metadata: null,
  }
}

/**
 * Transform array of models to array of output DTOs
 * 
 * **Requirement 6.6**: Transform database models to API response formats
 * 
 * @param models - Array of message database models
 * @returns Array of message output DTOs
 */
export function toMessageOutputList(models: MessageModel[]): MessageOutput[] {
  return models.map(toMessageOutput)
}
