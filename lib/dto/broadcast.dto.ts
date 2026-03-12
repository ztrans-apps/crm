/**
 * Broadcast Data Transfer Objects (DTOs)
 * 
 * Type-safe data transfer objects for broadcast operations.
 * Input DTOs define the structure for API requests.
 * Output DTOs define the structure for API responses (excluding sensitive fields).
 * 
 * **Requirements: 6.1, 6.2, 6.3, 6.5, 6.10**
 */

/**
 * Broadcast status
 */
export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled'

/**
 * Input DTO for creating a new broadcast
 * 
 * **Requirement 6.1**: Input data structure for API operations
 * **Requirement 6.3**: TypeScript interfaces for compile-time type checking
 */
export interface CreateBroadcastInput {
  name: string
  message_template: string
  target_filter?: Record<string, unknown>
  scheduled_at?: string
  metadata?: Record<string, unknown>
}

/**
 * Input DTO for updating a broadcast
 * 
 * **Requirement 6.1**: Input data structure for API operations
 * **Requirement 6.3**: TypeScript interfaces for compile-time type checking
 */
export interface UpdateBroadcastInput {
  name?: string
  message_template?: string
  scheduled_at?: string
  metadata?: Record<string, unknown>
}

/**
 * Output DTO for broadcast responses
 * 
 * Excludes sensitive fields like tenant_id and internal metadata.
 * 
 * **Requirement 6.2**: Output data structure for API operations
 * **Requirement 6.5**: Exclude sensitive fields from API responses
 * **Requirement 6.10**: Clear type definitions for frontend consumption
 */
export interface BroadcastOutput {
  id: string
  name: string
  message_template: string
  status: BroadcastStatus
  total_recipients: number
  sent_count: number
  delivered_count: number
  failed_count: number
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Excludes: tenant_id, target data, internal metadata
}

/**
 * Database model for broadcasts (internal use only)
 * 
 * This represents the full database schema including sensitive fields.
 * Should not be exposed directly to API responses.
 */
export interface BroadcastModel {
  id: string
  tenant_id: string
  created_by: string
  name: string
  message_template: string
  target_filter?: Record<string, unknown> | null
  status: BroadcastStatus
  total_recipients: number
  sent_count: number
  delivered_count: number
  failed_count: number
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Filter options for listing broadcasts
 */
export interface BroadcastFilters {
  status?: BroadcastStatus
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'created_at' | 'scheduled_at'
  sortDirection?: 'asc' | 'desc'
}

/**
 * Paginated broadcast list response
 */
export interface BroadcastListOutput {
  data: BroadcastOutput[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Broadcast statistics
 */
export interface BroadcastStats {
  id: string
  name: string
  status: BroadcastStatus
  total_recipients: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  pending_count: number
  success_rate: number
  delivery_rate: number
  read_rate: number
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
}

/**
 * Broadcast recipient status
 */
export interface BroadcastRecipient {
  id: string
  broadcast_id: string
  contact_id: string
  contact_name: string | null
  contact_phone: string
  message_id: string | null
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  error_message: string | null
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
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
 * Excludes sensitive fields (tenant_id, recipient_list_id, internal metadata) from the response.
 * 
 * **Requirement 6.6**: Transform database models to API response formats
 * **Requirement 6.5**: Exclude sensitive fields from API responses
 * 
 * @param model - Broadcast database model
 * @returns Broadcast output DTO
 */
export function toBroadcastOutput(model: BroadcastModel): BroadcastOutput {
  return {
    id: model.id,
    name: model.name,
    message_template: model.message_template,
    status: model.status,
    total_recipients: model.total_recipients,
    sent_count: model.sent_count,
    delivered_count: model.delivered_count,
    failed_count: model.failed_count,
    scheduled_at: model.scheduled_at,
    started_at: model.started_at,
    completed_at: model.completed_at,
    created_at: model.created_at,
    updated_at: model.updated_at,
  }
}

/**
 * Transform input DTO to database model (for create operations)
 * 
 * **Requirement 6.7**: Transform API request formats to database models
 * 
 * @param input - Create broadcast input DTO
 * @param tenantId - Tenant ID to associate with the broadcast
 * @returns Partial broadcast model for database insertion
 */
export function fromCreateBroadcastInput(
  input: CreateBroadcastInput,
  tenantId: string,
  userId: string
): Partial<BroadcastModel> {
  return {
    tenant_id: tenantId,
    created_by: userId,
    name: input.name,
    message_template: input.message_template,
    target_filter: input.target_filter || null,
    status: 'draft',
    total_recipients: 0,
    sent_count: 0,
    delivered_count: 0,
    failed_count: 0,
    scheduled_at: input.scheduled_at || null,
    metadata: input.metadata || null,
  }
}

/**
 * Transform input DTO to database model (for update operations)
 * 
 * **Requirement 6.7**: Transform API request formats to database models
 * 
 * @param input - Update broadcast input DTO
 * @returns Partial broadcast model for database update
 */
export function fromUpdateBroadcastInput(
  input: UpdateBroadcastInput
): Partial<BroadcastModel> {
  const update: Partial<BroadcastModel> = {}

  if (input.name !== undefined) update.name = input.name
  if (input.message_template !== undefined) update.message_template = input.message_template
  if (input.scheduled_at !== undefined) update.scheduled_at = input.scheduled_at || null
  if (input.metadata !== undefined) update.metadata = input.metadata

  return update
}

/**
 * Transform array of models to array of output DTOs
 * 
 * **Requirement 6.6**: Transform database models to API response formats
 * 
 * @param models - Array of broadcast database models
 * @returns Array of broadcast output DTOs
 */
export function toBroadcastOutputList(models: BroadcastModel[]): BroadcastOutput[] {
  return models.map(toBroadcastOutput)
}

/**
 * Calculate broadcast statistics from model
 * 
 * @param model - Broadcast database model
 * @returns Broadcast statistics
 */
export function toBroadcastStats(model: BroadcastModel): BroadcastStats {
  const successRate = model.total_recipients > 0
    ? (model.delivered_count / model.total_recipients) * 100
    : 0

  const deliveryRate = model.sent_count > 0
    ? (model.delivered_count / model.sent_count) * 100
    : 0

  const readCount = 0 // Would need to query message read status
  const readRate = model.delivered_count > 0
    ? (readCount / model.delivered_count) * 100
    : 0

  const pendingCount = model.total_recipients - model.sent_count

  let durationSeconds: number | null = null
  if (model.started_at && model.completed_at) {
    const start = new Date(model.started_at).getTime()
    const end = new Date(model.completed_at).getTime()
    durationSeconds = Math.floor((end - start) / 1000)
  }

  return {
    id: model.id,
    name: model.name,
    status: model.status,
    total_recipients: model.total_recipients,
    sent_count: model.sent_count,
    delivered_count: model.delivered_count,
    read_count: readCount,
    failed_count: model.failed_count,
    pending_count: pendingCount,
    success_rate: Math.round(successRate * 100) / 100,
    delivery_rate: Math.round(deliveryRate * 100) / 100,
    read_rate: Math.round(readRate * 100) / 100,
    started_at: model.started_at,
    completed_at: model.completed_at,
    duration_seconds: durationSeconds,
  }
}
