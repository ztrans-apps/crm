/**
 * Contact Data Transfer Objects (DTOs)
 * 
 * Type-safe data transfer objects for contact operations.
 * Input DTOs define the structure for API requests.
 * Output DTOs define the structure for API responses (excluding sensitive fields).
 * 
 * **Requirements: 6.1, 6.2, 6.3, 6.5, 6.10**
 */

/**
 * Input DTO for creating a new contact
 * 
 * **Requirement 6.1**: Input data structure for API operations
 * **Requirement 6.3**: TypeScript interfaces for compile-time type checking
 */
export interface CreateContactInput {
  name?: string
  phone_number: string
  email?: string
  notes?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Input DTO for updating an existing contact
 * 
 * **Requirement 6.1**: Input data structure for API operations
 * **Requirement 6.3**: TypeScript interfaces for compile-time type checking
 */
export interface UpdateContactInput {
  name?: string
  email?: string
  notes?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Output DTO for contact responses
 * 
 * Excludes sensitive fields like tenant_id and internal metadata.
 * 
 * **Requirement 6.2**: Output data structure for API operations
 * **Requirement 6.5**: Exclude sensitive fields from API responses
 * **Requirement 6.10**: Clear type definitions for frontend consumption
 */
export interface ContactOutput {
  id: string
  name: string | null
  phone_number: string
  email: string | null
  notes: string | null
  tags: string[]
  avatar_url: string | null
  created_at: string
  updated_at: string
  // Excludes: tenant_id, internal metadata
}

/**
 * Database model for contacts (internal use only)
 * 
 * This represents the full database schema including sensitive fields.
 * Should not be exposed directly to API responses.
 */
export interface ContactModel {
  id: string
  tenant_id: string
  name: string | null
  phone_number: string
  email: string | null
  notes: string | null
  tags: string[] | null
  avatar_url: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Filter options for listing contacts
 */
export interface ContactFilters {
  search?: string
  tags?: string[]
  hasEmail?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortDirection?: 'asc' | 'desc'
}

/**
 * Paginated contact list response
 */
export interface ContactListOutput {
  data: ContactOutput[]
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
 * @param model - Contact database model
 * @returns Contact output DTO
 */
export function toContactOutput(model: ContactModel): ContactOutput {
  return {
    id: model.id,
    name: model.name,
    phone_number: model.phone_number,
    email: model.email,
    notes: model.notes,
    tags: model.tags || [],
    avatar_url: model.avatar_url,
    created_at: model.created_at,
    updated_at: model.updated_at,
  }
}

/**
 * Transform input DTO to database model (for create operations)
 * 
 * **Requirement 6.7**: Transform API request formats to database models
 * 
 * @param input - Create contact input DTO
 * @param tenantId - Tenant ID to associate with the contact
 * @returns Partial contact model for database insertion
 */
export function fromCreateContactInput(
  input: CreateContactInput,
  tenantId: string
): Partial<ContactModel> {
  return {
    tenant_id: tenantId,
    name: input.name || null,
    phone_number: input.phone_number,
    email: input.email || null,
    notes: input.notes || null,
    tags: input.tags || null,
    metadata: input.metadata || null,
  }
}

/**
 * Transform input DTO to database model (for update operations)
 * 
 * **Requirement 6.7**: Transform API request formats to database models
 * 
 * @param input - Update contact input DTO
 * @returns Partial contact model for database update
 */
export function fromUpdateContactInput(
  input: UpdateContactInput
): Partial<ContactModel> {
  const update: Partial<ContactModel> = {}

  if (input.name !== undefined) update.name = input.name || null
  if (input.email !== undefined) update.email = input.email || null
  if (input.notes !== undefined) update.notes = input.notes || null
  if (input.tags !== undefined) update.tags = input.tags
  if (input.metadata !== undefined) update.metadata = input.metadata

  return update
}

/**
 * Transform array of models to array of output DTOs
 * 
 * **Requirement 6.6**: Transform database models to API response formats
 * 
 * @param models - Array of contact database models
 * @returns Array of contact output DTOs
 */
export function toContactOutputList(models: ContactModel[]): ContactOutput[] {
  return models.map(toContactOutput)
}
