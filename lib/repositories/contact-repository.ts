import { SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository, PaginatedResult, PaginationOptions, SortingOptions, PAGINATION_DEFAULTS } from './base-repository'
import { ContactModel } from '@/lib/dto/contact.dto'
import { cacheAside, generateCacheKey, invalidateResourceCache, CACHE_TTL } from '@/lib/cache/cache-layer'

/**
 * Contact Repository
 * 
 * Data access layer for contact operations.
 * Extends BaseRepository to provide contact-specific query methods.
 * 
 * **Requirements: 5.2, 5.3, 5.9, 12.4, 12.9**
 * 
 * Key Features:
 * - Standard CRUD operations (inherited from BaseRepository)
 * - Find contacts by phone number or email
 * - Full-text search across contact fields
 * - Filter contacts by tags
 * - Bulk create and update operations
 * - Automatic tenant isolation
 */
export class ContactRepository extends BaseRepository<ContactModel> {
  /**
   * Initialize the contact repository
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId, 'contacts')
  }

  /**
   * Find a contact by phone number
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param phoneNumber - Phone number to search for
   * @param fields - Optional array of fields to select
   * @returns Contact or null if not found
   */
  async findByPhoneNumber(phoneNumber: string, fields?: string[]): Promise<ContactModel | null> {
    const selectFields = this.buildSelectFields(fields)
    
    const query = this.supabase
      .from(this.tableName)
      .select(selectFields)
      .eq('phone_number', phoneNumber)

    const queryWithTenant = this.applyTenantFilter(query)
    const { data, error } = await queryWithTenant.maybeSingle()

    if (error) {
      throw error
    }

    return data as ContactModel | null
  }

  /**
   * Find a contact by email
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param email - Email address to search for
   * @param fields - Optional array of fields to select
   * @returns Contact or null if not found
   */
  async findByEmail(email: string, fields?: string[]): Promise<ContactModel | null> {
    const selectFields = this.buildSelectFields(fields)
    
    const query = this.supabase
      .from(this.tableName)
      .select(selectFields)
      .eq('email', email)

    const queryWithTenant = this.applyTenantFilter(query)
    const { data, error } = await queryWithTenant.maybeSingle()

    if (error) {
      throw error
    }

    return data as ContactModel | null
  }

  /**
   * Search contacts by query string
   * 
   * Searches across name, phone number, email, and notes fields.
   * Implements query result caching for expensive search operations.
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * **Requirement 12.6**: Implement query result caching where appropriate
   * 
   * @param query - Search query string
   * @param options - Pagination, sorting, and field selection options
   * @returns Paginated search results
   */
  async search(
    query: string,
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<ContactModel>> {
    // Generate cache key for this search query
    const cacheKey = generateCacheKey(
      this.tenantId,
      'contacts:search',
      query,
      JSON.stringify(options || {})
    )

    // Use cache-aside pattern for expensive search queries
    return cacheAside(
      cacheKey,
      async () => {
        return this.executeSearch(query, options)
      },
      CACHE_TTL.SEARCH_RESULTS,
      this.tenantId
    )
  }

  /**
   * Execute search query (internal method)
   * 
   * @param query - Search query string
   * @param options - Pagination, sorting, and field selection options
   * @returns Paginated search results
   */
  private async executeSearch(
    query: string,
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<ContactModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    // Build search query using OR conditions
    let searchQuery = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter first
    searchQuery = this.applyTenantFilter(searchQuery)

    // Apply search filters using OR conditions
    // Note: Supabase doesn't support OR directly in the query builder,
    // so we use ilike on multiple fields
    const searchTerm = `%${query}%`
    searchQuery = searchQuery.or(
      `name.ilike.${searchTerm},phone_number.ilike.${searchTerm},email.ilike.${searchTerm},notes.ilike.${searchTerm}`
    )

    // Apply sorting
    if (options?.sort) {
      searchQuery = this.applySorting(searchQuery, options.sort)
    } else {
      // Default sort by name
      searchQuery = searchQuery.order('name', { ascending: true })
    }

    // Apply pagination
    searchQuery = this.applyPagination(searchQuery, { page, pageSize })

    const { data, error, count } = await searchQuery

    if (error) {
      throw error
    }

    const total = count || 0
    const hasMore = page * pageSize < total

    return {
      data: (data as ContactModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Find contacts by tags
   * 
   * Returns contacts that have any of the specified tags.
   * 
   * **Requirement 5.2**: Standard query operations
   * **Requirement 5.3**: Tenant isolation
   * **Requirement 12.2**: Pagination with page size limits
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param tags - Array of tags to filter by
   * @param options - Pagination, sorting, and field selection options
   * @returns Paginated results
   */
  async findByTags(
    tags: string[],
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<ContactModel>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    let query = this.supabase
      .from(this.tableName)
      .select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Filter by tags using array overlap operator
    query = query.overlaps('tags', tags)

    // Apply sorting
    if (options?.sort) {
      query = this.applySorting(query, options.sort)
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
      data: (data as ContactModel[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Bulk create contacts
   * 
   * Creates multiple contacts in a single database operation.
   * Invalidates contact cache after creation.
   * 
   * **Requirement 5.9**: Batch operations for bulk inserts
   * **Requirement 12.9**: Batch operations for performance
   * **Requirement 12.6**: Cache invalidation on data updates
   * 
   * @param contacts - Array of contact data
   * @returns Array of created contacts
   */
  async bulkCreate(contacts: Partial<ContactModel>[]): Promise<ContactModel[]> {
    // Ensure tenant_id is set for all contacts
    const contactsWithTenant = contacts.map(contact => ({
      ...contact,
      tenant_id: this.tenantId,
    }))

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(contactsWithTenant)
      .select()

    if (error) {
      throw error
    }

    // Invalidate contact cache after bulk creation
    await invalidateResourceCache(this.tenantId, 'contacts')

    return data as ContactModel[]
  }

  /**
   * Bulk update contacts
   * 
   * Updates multiple contacts in separate operations.
   * Invalidates contact cache after updates.
   * Note: Supabase doesn't support bulk updates with different values per row,
   * so we execute updates sequentially but could be optimized with transactions.
   * 
   * **Requirement 5.9**: Batch operations for bulk updates
   * **Requirement 12.9**: Batch operations for performance
   * **Requirement 12.6**: Cache invalidation on data updates
   * 
   * @param updates - Array of update operations with id and data
   * @returns void
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: Partial<ContactModel> }>
  ): Promise<void> {
    // Execute updates in parallel for better performance
    const updatePromises = updates.map(({ id, data }) => this.update(id, data))

    await Promise.all(updatePromises)

    // Invalidate contact cache after bulk updates
    await invalidateResourceCache(this.tenantId, 'contacts')
  }

  /**
   * Count contacts by filter criteria
   * 
   * @param filters - Optional filter criteria
   * @returns Total count of contacts matching filters
   */
  async count(filters?: { hasEmail?: boolean; hasTags?: boolean }): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Apply optional filters
    if (filters?.hasEmail) {
      query = query.not('email', 'is', null)
    }

    if (filters?.hasTags) {
      query = query.not('tags', 'is', null)
    }

    const { count, error } = await query

    if (error) {
      throw error
    }

    return count || 0
  }

  /**
   * Check if a contact exists by phone number
   * 
   * @param phoneNumber - Phone number to check
   * @returns True if contact exists, false otherwise
   */
  async existsByPhoneNumber(phoneNumber: string): Promise<boolean> {
    const contact = await this.findByPhoneNumber(phoneNumber)
    return contact !== null
  }

  /**
   * Check if a contact exists by email
   * 
   * @param email - Email to check
   * @returns True if contact exists, false otherwise
   */
  async existsByEmail(email: string): Promise<boolean> {
    const contact = await this.findByEmail(email)
    return contact !== null
  }

  /**
   * Create a new contact
   * 
   * Overrides base repository to add cache invalidation.
   * 
   * **Requirement 5.2**: Standard CRUD operations
   * **Requirement 12.6**: Cache invalidation on data updates
   * 
   * @param data - Contact data
   * @returns Created contact
   */
  async create(data: Partial<ContactModel>): Promise<ContactModel> {
    const contact = await super.create(data)
    
    // Invalidate contact cache after creation
    await invalidateResourceCache(this.tenantId, 'contacts')
    
    return contact
  }

  /**
   * Update a contact by ID
   * 
   * Overrides base repository to add cache invalidation.
   * 
   * **Requirement 5.2**: Standard CRUD operations
   * **Requirement 12.6**: Cache invalidation on data updates
   * 
   * @param id - Contact ID
   * @param data - Updated data
   * @returns Updated contact
   */
  async update(id: string, data: Partial<ContactModel>): Promise<ContactModel> {
    const contact = await super.update(id, data)
    
    // Invalidate contact cache after update
    await invalidateResourceCache(this.tenantId, 'contacts')
    
    return contact
  }

  /**
   * Delete a contact by ID
   * 
   * Overrides base repository to add cache invalidation.
   * 
   * **Requirement 5.2**: Standard CRUD operations
   * **Requirement 12.6**: Cache invalidation on data updates
   * 
   * @param id - Contact ID
   * @returns Deleted contact
   */
  async delete(id: string): Promise<ContactModel> {
    const contact = await super.delete(id)
    
    // Invalidate contact cache after deletion
    await invalidateResourceCache(this.tenantId, 'contacts')
    
    return contact
  }
}
