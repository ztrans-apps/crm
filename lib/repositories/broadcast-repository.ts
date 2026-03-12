import { SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository, PaginatedResult, PaginationOptions, SortingOptions, PAGINATION_DEFAULTS } from './base-repository'
import { BroadcastModel, BroadcastStatus, BroadcastRecipient } from '@/lib/dto/broadcast.dto'

/**
 * Broadcast Repository
 * 
 * Data access layer for broadcast operations.
 * Extends BaseRepository to provide broadcast-specific query methods.
 * 
 * **Requirements: 5.2, 5.3, 12.2**
 * 
 * Key Features:
 * - Standard CRUD operations (inherited from BaseRepository)
 * - Find scheduled broadcasts
 * - Find broadcasts by status
 * - Update broadcast statistics
 * - Get broadcast recipients
 * - Automatic tenant isolation
 */
export class BroadcastRepository extends BaseRepository<BroadcastModel> {
  /**
   * Initialize the broadcast repository
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId, 'broadcast_campaigns')
  }

  /**
   * Find scheduled broadcasts
   * 
   * Returns broadcasts that are scheduled to be sent in the future.
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param fields - Optional array of fields to select
   * @returns Array of scheduled broadcasts
   */
  async findScheduled(fields?: string[]): Promise<BroadcastModel[]> {
    const now = new Date().toISOString()
    const selectFields = this.buildSelectFields(fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields)

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by scheduled status and future scheduled_at
    query = query
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)

    // Sort by scheduled_at ascending
    query = query.order('scheduled_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data as BroadcastModel[]) || []
  }

  /**
   * Find broadcasts by status
   * 
   * Returns broadcasts with a specific status.
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination for list queries with page size limits
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param status - Broadcast status to filter by
   * @param options - Pagination, sorting, and field selection options
   * @returns Paginated broadcast results
   */
  async findByStatus(
    status: BroadcastStatus,
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<BroadcastModel>> {
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
      // Default sort by created_at descending
      query = query.order('created_at', { ascending: false })
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
      data: (data as BroadcastModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Update broadcast statistics
   * 
   * Updates the sent, delivered, and failed counts for a broadcast.
   * 
   * **Requirement 5.2**: Standard update operations
   * **Requirement 5.3**: Tenant isolation
   * 
   * @param id - Broadcast ID
   * @param stats - Statistics to update
   * @returns void
   */
  async updateStats(
    id: string,
    stats: {
      sent_count?: number
      delivered_count?: number
      failed_count?: number
    }
  ): Promise<void> {
    const updateData: Partial<BroadcastModel> = {}

    if (stats.sent_count !== undefined) {
      updateData.sent_count = stats.sent_count
    }
    if (stats.delivered_count !== undefined) {
      updateData.delivered_count = stats.delivered_count
    }
    if (stats.failed_count !== undefined) {
      updateData.failed_count = stats.failed_count
    }

    await this.update(id, updateData)
  }

  /**
   * Get broadcast recipients
   * 
   * Returns the list of recipients for a broadcast with their delivery status.
   * Note: This assumes a broadcast_recipients table exists.
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param broadcastId - Broadcast ID
   * @param options - Pagination and field selection options
   * @returns Paginated recipient results
   */
  async getBroadcastRecipients(
    broadcastId: string,
    options?: PaginationOptions & { fields?: string[] }
  ): Promise<PaginatedResult<BroadcastRecipient>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    // First verify the broadcast belongs to this tenant
    const broadcast = await this.findById(broadcastId)
    if (!broadcast) {
      throw new Error(`Broadcast with ID ${broadcastId} not found`)
    }

    // Query broadcast_recipients table
    let query = this.supabase
      .from('broadcast_recipients')
      .select(selectFields, { count: 'exact' })
      .eq('broadcast_id', broadcastId)

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as BroadcastRecipient[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Update broadcast status
   * 
   * Updates the status of a broadcast and sets appropriate timestamps.
   * 
   * @param id - Broadcast ID
   * @param status - New status
   * @returns Updated broadcast
   */
  async updateStatus(id: string, status: BroadcastStatus): Promise<BroadcastModel> {
    const updateData: Partial<BroadcastModel> = {
      status,
    }

    // Set started_at when status changes to sending
    if (status === 'sending') {
      updateData.started_at = new Date().toISOString()
    }

    // Set completed_at when status changes to completed or failed
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateData.completed_at = new Date().toISOString()
    }

    return await this.update(id, updateData)
  }

  /**
   * Find broadcasts scheduled for a specific time range
   * 
   * Returns broadcasts scheduled between start and end dates.
   * 
   * **Requirement 12.2**: Pagination with page size limits
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @param options - Pagination and field selection options
   * @returns Paginated broadcast results
   */
  async findScheduledBetween(
    startDate: string,
    endDate: string,
    options?: PaginationOptions & { fields?: string[] }
  ): Promise<PaginatedResult<BroadcastModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by scheduled status and date range
    query = query
      .eq('status', 'scheduled')
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)

    // Sort by scheduled_at ascending
    query = query.order('scheduled_at', { ascending: true })

    // Apply pagination
    query = this.applyPagination(query, { page, pageSize })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as BroadcastModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Count broadcasts by status
   * 
   * Returns the count of broadcasts with a specific status.
   * 
   * @param status - Broadcast status to count
   * @returns Count of broadcasts
   */
  async countByStatus(status: BroadcastStatus): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by status
    query = query.eq('status', status)

    const { count, error } = await query

    if (error) {
      throw error
    }

    return count || 0
  }

  /**
   * Find active broadcasts
   * 
   * Returns broadcasts that are currently being sent.
   * 
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param fields - Optional array of fields to select
   * @returns Array of active broadcasts
   */
  async findActive(fields?: string[]): Promise<BroadcastModel[]> {
    const selectFields = this.buildSelectFields(fields)
    
    let query = this.supabase
      .from(this.tableName)
      .select(selectFields)

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by sending status
    query = query.eq('status', 'sending')

    // Sort by started_at ascending
    query = query.order('started_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data as BroadcastModel[]) || []
  }
}
