import { SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository, PaginatedResult, PaginationOptions, SortingOptions } from './base-repository'
import { ConversationModel } from '@/lib/dto/conversation.dto'

/**
 * Conversation Repository
 * 
 * Data access layer for conversation operations.
 * Extends BaseRepository to provide conversation-specific query methods.
 * 
 * **Requirements: 5.2, 5.3, 5.9, 12.4, 12.9**
 * 
 * Key Features:
 * - Standard CRUD operations (inherited from BaseRepository)
 * - Find conversations by contact, assigned agent, or status
 * - Filter conversations by workflow status
 * - Bulk update operations
 * - Automatic tenant isolation
 */
export class ConversationRepository extends BaseRepository<ConversationModel> {
  /**
   * Initialize the conversation repository
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId, 'conversations')
  }

  /**
   * Find conversations by contact ID
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param contactId - Contact ID to search for
   * @param options - Pagination, sorting, and field selection options
   * @returns Paginated list of conversations
   */
  async findByContactId(
    contactId: string,
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<ConversationModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by contact ID
    query = query.eq('contact_id', contactId)

    // Apply sorting
    if (options?.sort) {
      query = this.applySorting(query, options.sort)
    } else {
      // Default sort by last_message_at descending
      query = query.order('last_message_at', { ascending: false, nullsFirst: false })
    }

    // Apply pagination
    query = this.applyPagination(query, { page, pageSize })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as ConversationModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Find conversations by assigned agent
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * 
   * @param assignedTo - User ID of assigned agent (null for unassigned)
   * @param options - Pagination and sorting options
   * @returns Paginated list of conversations
   */
  async findByAssignedTo(
    assignedTo: string | null,
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<ConversationModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by assigned_to
    if (assignedTo === null) {
      query = query.is('assigned_to', null)
    } else {
      query = query.eq('assigned_to', assignedTo)
    }

    // Apply sorting
    if (options?.sort) {
      query = this.applySorting(query, options.sort)
    } else {
      // Default sort by updated_at descending
      query = query.order('updated_at', { ascending: false })
    }

    // Apply pagination
    query = this.applyPagination(query, { page, pageSize })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as ConversationModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Find conversations by status
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * 
   * @param status - Conversation status ('open' or 'closed')
   * @param options - Pagination and sorting options
   * @returns Paginated list of conversations
   */
  async findByStatus(
    status: 'open' | 'closed',
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<ConversationModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by status
    query = query.eq('status', status)

    // Apply sorting
    if (options?.sort) {
      query = this.applySorting(query, options.sort)
    } else {
      // Default sort by updated_at descending
      query = query.order('updated_at', { ascending: false })
    }

    // Apply pagination
    query = this.applyPagination(query, { page, pageSize })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as ConversationModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Find conversations by workflow status
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * 
   * @param workflowStatus - Workflow status
   * @param options - Pagination and sorting options
   * @returns Paginated list of conversations
   */
  async findByWorkflowStatus(
    workflowStatus: 'incoming' | 'waiting' | 'in_progress' | 'done',
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<ConversationModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by workflow_status
    query = query.eq('workflow_status', workflowStatus)

    // Apply sorting
    if (options?.sort) {
      query = this.applySorting(query, options.sort)
    } else {
      // Default sort by updated_at descending
      query = query.order('updated_at', { ascending: false })
    }

    // Apply pagination
    query = this.applyPagination(query, { page, pageSize })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as ConversationModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Find conversations with complex filters
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * 
   * @param filters - Filter criteria
   * @param options - Pagination and sorting options
   * @returns Paginated list of conversations
   */
  async findWithFilters(
    filters: {
      status?: 'open' | 'closed'
      workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
      assigned_to?: string | null
      contact_id?: string
    },
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<ConversationModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Apply filters
    if (filters.status !== undefined) {
      query = query.eq('status', filters.status)
    }

    if (filters.workflow_status !== undefined) {
      query = query.eq('workflow_status', filters.workflow_status)
    }

    if (filters.assigned_to !== undefined) {
      if (filters.assigned_to === null) {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', filters.assigned_to)
      }
    }

    if (filters.contact_id !== undefined) {
      query = query.eq('contact_id', filters.contact_id)
    }

    // Apply sorting
    if (options?.sort) {
      query = this.applySorting(query, options.sort)
    } else {
      // Default sort by updated_at descending
      query = query.order('updated_at', { ascending: false })
    }

    // Apply pagination
    query = this.applyPagination(query, { page, pageSize })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as ConversationModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Bulk update conversations
   * 
   * Updates multiple conversations in separate operations.
   * 
   * **Requirement 5.9**: Batch operations for bulk updates
   * **Requirement 12.9**: Batch operations for performance
   * 
   * @param updates - Array of update operations with id and data
   * @returns void
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: Partial<ConversationModel> }>
  ): Promise<void> {
    // Execute updates in parallel for better performance
    const updatePromises = updates.map(({ id, data }) => this.update(id, data))

    await Promise.all(updatePromises)
  }

  /**
   * Count conversations by filter criteria
   * 
   * @param filters - Optional filter criteria
   * @returns Total count of conversations matching filters
   */
  async count(filters?: {
    status?: 'open' | 'closed'
    workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
    assigned_to?: string | null
  }): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Apply optional filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.workflow_status) {
      query = query.eq('workflow_status', filters.workflow_status)
    }

    if (filters?.assigned_to !== undefined) {
      if (filters.assigned_to === null) {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', filters.assigned_to)
      }
    }

    const { count, error } = await query

    if (error) {
      throw error
    }

    return count || 0
  }

  /**
   * Get unread conversations count for a user
   * 
   * @param assignedTo - User ID
   * @returns Count of unread conversations
   */
  async getUnreadCount(assignedTo: string): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by assigned user and unread count > 0
    query = query.eq('assigned_to', assignedTo).gt('unread_count', 0)

    const { count, error } = await query

    if (error) {
      throw error
    }

    return count || 0
  }
}
