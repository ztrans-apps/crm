import { SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository, PaginatedResult, PaginationOptions, SortingOptions, PAGINATION_DEFAULTS } from './base-repository'
import { MessageModel, MessageStatus } from '@/lib/dto/message.dto'

/**
 * Message Statistics
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
 * Message Repository
 * 
 * Data access layer for message operations.
 * Extends BaseRepository to provide message-specific query methods.
 * 
 * **Requirements: 5.2, 5.3, 12.2, 12.3**
 * 
 * Key Features:
 * - Standard CRUD operations (inherited from BaseRepository)
 * - Find messages by conversation
 * - Find unread messages
 * - Mark messages as read
 * - Get message statistics
 * - Pagination support for message lists
 * - Automatic tenant isolation
 */
export class MessageRepository extends BaseRepository<MessageModel> {
  /**
   * Initialize the message repository
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId, 'messages')
  }

  /**
   * Find messages by conversation ID
   * 
   * Returns messages in chronological order (oldest first) with pagination.
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination for list queries with page size limits
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param conversationId - Conversation ID to filter by
   * @param options - Pagination and field selection options
   * @returns Paginated message results
   */
  async findByConversation(
    conversationId: string,
    options?: PaginationOptions & { fields?: string[] }
  ): Promise<PaginatedResult<MessageModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by conversation
    query = query.eq('conversation_id', conversationId)

    // Sort by created_at ascending (chronological order)
    query = query.order('created_at', { ascending: true })

    // Apply pagination
    query = this.applyPagination(query, { page, pageSize })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as MessageModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Find unread messages in a conversation
   * 
   * Returns messages that have not been read yet (read_at is null).
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param conversationId - Conversation ID to filter by
   * @param fields - Optional array of fields to select
   * @returns Array of unread messages
   */
  async findUnread(conversationId: string, fields?: string[]): Promise<MessageModel[]> {
    const selectFields = this.buildSelectFields(fields)
    
    let query = this.supabase
      .from(this.tableName)
      .select(selectFields)

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by conversation and unread status
    query = query
      .eq('conversation_id', conversationId)
      .is('read_at', null)

    // Sort by created_at ascending
    query = query.order('created_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data as MessageModel[]) || []
  }

  /**
   * Mark messages as read
   * 
   * Updates the read_at timestamp for multiple messages.
   * 
   * **Requirement 5.2**: Standard update operations
   * **Requirement 5.3**: Tenant isolation
   * 
   * @param messageIds - Array of message IDs to mark as read
   * @returns void
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) {
      return
    }

    const readAt = new Date().toISOString()

    let query = this.supabase
      .from(this.tableName)
      .update({ read_at: readAt })
      .in('id', messageIds)

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    const { error } = await query

    if (error) {
      throw error
    }
  }

  /**
   * Get message statistics for a conversation
   * 
   * Returns counts of messages by status.
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * 
   * @param conversationId - Conversation ID to get stats for
   * @returns Message statistics
   */
  async getMessageStats(conversationId: string): Promise<MessageStats> {
    let query = this.supabase
      .from(this.tableName)
      .select('status')

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by conversation
    query = query.eq('conversation_id', conversationId)

    const { data, error } = await query

    if (error) {
      throw error
    }

    const messages = (data as MessageModel[]) || []

    // Calculate statistics
    const stats: MessageStats = {
      total: messages.length,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      pending: 0,
    }

    messages.forEach((message) => {
      switch (message.status) {
        case 'sent':
          stats.sent++
          break
        case 'delivered':
          stats.delivered++
          break
        case 'read':
          stats.read++
          break
        case 'failed':
          stats.failed++
          break
        case 'pending':
          stats.pending++
          break
      }
    })

    return stats
  }

  /**
   * Find messages by status
   * 
   * Returns messages with a specific status.
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param status - Message status to filter by
   * @param options - Pagination, sorting, and field selection options
   * @returns Paginated message results
   */
  async findByStatus(
    status: MessageStatus,
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<MessageModel>> {
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
      data: (data as MessageModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Count messages by conversation
   * 
   * Returns the total count of messages in a conversation.
   * 
   * @param conversationId - Conversation ID to count messages for
   * @returns Total message count
   */
  async countByConversation(conversationId: string): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by conversation
    query = query.eq('conversation_id', conversationId)

    const { count, error } = await query

    if (error) {
      throw error
    }

    return count || 0
  }

  /**
   * Count unread messages by conversation
   * 
   * Returns the count of unread messages in a conversation.
   * 
   * @param conversationId - Conversation ID to count unread messages for
   * @returns Unread message count
   */
  async countUnreadByConversation(conversationId: string): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by conversation and unread status
    query = query
      .eq('conversation_id', conversationId)
      .is('read_at', null)

    const { count, error } = await query

    if (error) {
      throw error
    }

    return count || 0
  }

  /**
   * Update message status
   * 
   * Updates the status of a message.
   * 
   * @param messageId - Message ID to update
   * @param status - New status
   * @returns Updated message
   */
  async updateStatus(messageId: string, status: MessageStatus): Promise<MessageModel> {
    const updateData: Partial<MessageModel> = {
      status,
    }

    // Set delivered_at timestamp when status changes to delivered
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    // Set read_at timestamp when status changes to read
    if (status === 'read') {
      updateData.read_at = new Date().toISOString()
      // Also set delivered_at if not already set
      if (!updateData.delivered_at) {
        updateData.delivered_at = new Date().toISOString()
      }
    }

    return await this.update(messageId, updateData)
  }

  /**
   * Find latest message in a conversation
   * 
   * Returns the most recent message in a conversation.
   * 
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param conversationId - Conversation ID
   * @param fields - Optional array of fields to select
   * @returns Latest message or null if no messages
   */
  async findLatestByConversation(conversationId: string, fields?: string[]): Promise<MessageModel | null> {
    const selectFields = this.buildSelectFields(fields)
    
    let query = this.supabase
      .from(this.tableName)
      .select(selectFields)

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by conversation
    query = query.eq('conversation_id', conversationId)

    // Sort by created_at descending and limit to 1
    query = query.order('created_at', { ascending: false }).limit(1)

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data && data.length > 0 ? (data[0] as MessageModel) : null
  }
}
