/**
 * Conversation Data Transfer Objects (DTOs)
 * 
 * Type-safe data transfer objects for conversation operations.
 * Input DTOs define the structure for API requests.
 * Output DTOs define the structure for API responses (excluding sensitive fields).
 * 
 * **Requirements: 6.1, 6.2, 6.3, 6.5, 6.10**
 */

/**
 * Input DTO for creating a new conversation
 * 
 * **Requirement 6.1**: Input data structure for API operations
 * **Requirement 6.3**: TypeScript interfaces for compile-time type checking
 */
export interface CreateConversationInput {
  contact_id: string
  assigned_to?: string | null
  status?: 'open' | 'closed'
  workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
  metadata?: Record<string, unknown>
}

/**
 * Input DTO for updating an existing conversation
 * 
 * **Requirement 6.1**: Input data structure for API operations
 * **Requirement 6.3**: TypeScript interfaces for compile-time type checking
 */
export interface UpdateConversationInput {
  assigned_to?: string | null
  status?: 'open' | 'closed'
  workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
  last_message?: string | null
  last_message_at?: string | null
  unread_count?: number
  metadata?: Record<string, unknown>
}

/**
 * Output DTO for conversation responses
 * 
 * Excludes sensitive fields like tenant_id and internal metadata.
 * 
 * **Requirement 6.2**: Output data structure for API operations
 * **Requirement 6.5**: Exclude sensitive fields from API responses
 * **Requirement 6.10**: Clear type definitions for frontend consumption
 */
export interface ConversationOutput {
  id: string
  contact_id: string
  assigned_to: string | null
  status: 'open' | 'closed'
  workflow_status: 'incoming' | 'waiting' | 'in_progress' | 'done' | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  first_response_at: string | null
  created_at: string
  updated_at: string
  // Excludes: tenant_id, internal metadata
}

/**
 * Database model for conversations (internal use only)
 * 
 * This represents the full database schema including sensitive fields.
 * Should not be exposed directly to API responses.
 */
export interface ConversationModel {
  id: string
  tenant_id: string
  contact_id: string
  assigned_to: string | null
  status: 'open' | 'closed'
  workflow_status: 'incoming' | 'waiting' | 'in_progress' | 'done' | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  first_response_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Filter options for listing conversations
 */
export interface ConversationFilters {
  status?: 'open' | 'closed'
  workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
  assigned_to?: string | null
  contact_id?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'updated_at' | 'last_message_at'
  sortDirection?: 'asc' | 'desc'
}

/**
 * Paginated conversation list response
 */
export interface ConversationListOutput {
  data: ConversationOutput[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
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
 * @param model - Conversation database model
 * @returns Conversation output DTO
 */
export function toConversationOutput(model: ConversationModel): ConversationOutput {
  return {
    id: model.id,
    contact_id: model.contact_id,
    assigned_to: model.assigned_to,
    status: model.status,
    workflow_status: model.workflow_status,
    last_message: model.last_message,
    last_message_at: model.last_message_at,
    unread_count: model.unread_count,
    first_response_at: model.first_response_at,
    created_at: model.created_at,
    updated_at: model.updated_at,
  }
}

/**
 * Transform input DTO to database model (for create operations)
 * 
 * **Requirement 6.7**: Transform API request formats to database models
 * 
 * @param input - Create conversation input DTO
 * @param tenantId - Tenant ID to associate with the conversation
 * @returns Partial conversation model for database insertion
 */
export function fromCreateConversationInput(
  input: CreateConversationInput,
  tenantId: string
): Partial<ConversationModel> {
  return {
    tenant_id: tenantId,
    contact_id: input.contact_id,
    assigned_to: input.assigned_to ?? null,
    status: input.status || 'open',
    workflow_status: input.workflow_status || 'incoming',
    unread_count: 0,
    metadata: input.metadata || null,
  }
}

/**
 * Transform input DTO to database model (for update operations)
 * 
 * **Requirement 6.7**: Transform API request formats to database models
 * 
 * @param input - Update conversation input DTO
 * @returns Partial conversation model for database update
 */
export function fromUpdateConversationInput(
  input: UpdateConversationInput
): Partial<ConversationModel> {
  const update: Partial<ConversationModel> = {}

  if (input.assigned_to !== undefined) update.assigned_to = input.assigned_to
  if (input.status !== undefined) update.status = input.status
  if (input.workflow_status !== undefined) update.workflow_status = input.workflow_status
  if (input.last_message !== undefined) update.last_message = input.last_message
  if (input.last_message_at !== undefined) update.last_message_at = input.last_message_at
  if (input.unread_count !== undefined) update.unread_count = input.unread_count
  if (input.metadata !== undefined) update.metadata = input.metadata

  return update
}

/**
 * Transform array of models to array of output DTOs
 * 
 * **Requirement 6.6**: Transform database models to API response formats
 * 
 * @param models - Array of conversation database models
 * @returns Array of conversation output DTOs
 */
export function toConversationOutputList(models: ConversationModel[]): ConversationOutput[] {
  return models.map(toConversationOutput)
}
