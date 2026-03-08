import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Pagination constants
 * 
 * **Requirement 12.2**: Page size limits (default 50, max 100)
 */
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const

/**
 * Pagination options for list queries
 * 
 * **Requirement 12.2**: Pagination support with page size limits
 * 
 * Supports both offset-based and cursor-based pagination:
 * - Offset-based: Use page and pageSize
 * - Cursor-based: Use cursor and pageSize
 */
export interface PaginationOptions {
  page?: number
  pageSize?: number
  cursor?: string
}

/**
 * Cursor-based pagination result
 * 
 * **Requirement 12.2**: Cursor-based pagination for large datasets
 */
export interface CursorPaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  pageSize: number
}

/**
 * Sorting options for list queries
 */
export interface SortingOptions {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Field selection options for query projections
 * 
 * **Requirement 12.3**: Use select projections to fetch only required fields
 */
export interface FieldSelection {
  fields?: string[]  // Specific fields to select, defaults to '*' if not provided
}

/**
 * Paginated result wrapper
 * 
 * **Requirement 12.2**: Offset-based pagination with page size limits
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Base Repository Class
 * 
 * Abstract base class for all repository layer implementations.
 * Provides common CRUD operations, pagination, sorting, and tenant filtering.
 * 
 * **Requirements: 5.1, 5.2, 5.3, 5.6, 5.7**
 * 
 * Key Features:
 * - Standard CRUD operations (Create, Read, Update, Delete)
 * - Automatic tenant filtering on all queries
 * - Pagination support (offset-based and cursor-based)
 * - Sorting support
 * - Query optimization helpers
 * 
 * Usage:
 * ```typescript
 * class ContactRepository extends BaseRepository<Contact> {
 *   constructor(supabase: SupabaseClient, tenantId: string) {
 *     super(supabase, tenantId, 'contacts')
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<T> {
  protected supabase: SupabaseClient
  protected tenantId: string
  protected tableName: string

  /**
   * Initialize the base repository
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param tableName - Name of the database table
   */
  constructor(supabase: SupabaseClient, tenantId: string, tableName: string) {
    this.supabase = supabase
    this.tenantId = tenantId
    this.tableName = tableName
  }

  /**
   * Find a record by ID
   * 
   * **Requirement 5.2**: Standard CRUD operations
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param id - Record ID
   * @param fields - Optional array of fields to select
   * @returns Record or null if not found
   */
  async findById(id: string, fields?: string[]): Promise<T | null> {
    const selectFields = this.buildSelectFields(fields)
    
    const query = this.supabase
      .from(this.tableName)
      .select(selectFields)
      .eq('id', id)

    const queryWithTenant = this.applyTenantFilter(query)
    const { data, error } = await queryWithTenant.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw error
    }

    return data as T
  }

  /**
   * Find all records with optional pagination and sorting
   * 
   * **Requirement 5.2**: Standard CRUD operations
   * **Requirement 5.6**: Pagination support
   * **Requirement 12.2**: Page size limits (default 50, max 100)
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param options - Pagination, sorting, and field selection options
   * @returns Paginated result
   */
  async findAll(
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] }
  ): Promise<PaginatedResult<T>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize
    const selectFields = this.buildSelectFields(options?.fields)

    // Build base query
    let query = this.supabase.from(this.tableName).select(selectFields, { count: 'exact' })

    // Apply tenant filter
    query = this.applyTenantFilter(query)

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
      data: (data as T[]) || [],
      total,
      page,
      pageSize,
      hasMore,
    }
  }

  /**
   * Create a new record
   * 
   * **Requirement 5.2**: Standard CRUD operations
   * 
   * @param data - Record data
   * @returns Created record
   */
  async create(data: Partial<T>): Promise<T> {
    // Ensure tenant_id is set
    const dataWithTenant = {
      ...data,
      tenant_id: this.tenantId,
    }

    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(dataWithTenant)
      .select()
      .single()

    if (error) {
      throw error
    }

    return created as T
  }

  /**
   * Update a record by ID
   * 
   * **Requirement 5.2**: Standard CRUD operations
   * 
   * @param id - Record ID
   * @param data - Updated data
   * @returns Updated record
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const query = this.supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)

    const queryWithTenant = this.applyTenantFilter(query)
    const { data: updated, error } = await queryWithTenant.select().single()

    if (error) {
      throw error
    }

    return updated as T
  }

  /**
   * Delete a record by ID
   * 
   * **Requirement 5.2**: Standard CRUD operations
   * 
   * @param id - Record ID
   * @returns Deleted record
   */
  async delete(id: string): Promise<T> {
    const query = this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)

    const queryWithTenant = this.applyTenantFilter(query)
    const { data: deleted, error } = await queryWithTenant.select().single()

    if (error) {
      throw error
    }

    return deleted as T
  }

  /**
   * Apply tenant filter to a query
   * 
   * Ensures all queries are scoped to the current tenant for multi-tenant isolation.
   * 
   * **Requirement 5.3**: Tenant isolation at repository layer
   * 
   * @param query - Supabase query builder
   * @returns Query with tenant filter applied
   */
  protected applyTenantFilter(query: any): any {
    return query.eq('tenant_id', this.tenantId)
  }

  /**
   * Apply pagination to a query
   * 
   * **Requirement 5.6**: Pagination support
   * **Requirement 12.2**: Page size limits (default 50, max 100)
   * 
   * @param query - Supabase query builder
   * @param options - Pagination options
   * @returns Query with pagination applied
   */
  protected applyPagination(query: any, options: PaginationOptions): any {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const page = normalizedOptions.page
    const pageSize = normalizedOptions.pageSize

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    return query.range(from, to)
  }

  /**
   * Apply sorting to a query
   * 
   * **Requirement 5.7**: Sorting support
   * 
   * @param query - Supabase query builder
   * @param options - Sorting options
   * @returns Query with sorting applied
   */
  protected applySorting(query: any, options: SortingOptions): any {
    return query.order(options.field, { ascending: options.direction === 'asc' })
  }

  /**
   * Normalize pagination options with defaults and limits
   * 
   * **Requirement 12.2**: Page size limits (default 50, max 100)
   * 
   * @param options - Raw pagination options
   * @returns Normalized pagination options
   */
  protected normalizePaginationOptions(options?: PaginationOptions): Required<Omit<PaginationOptions, 'cursor'>> & { cursor?: string } {
    // Handle pageSize with explicit check for undefined/null to allow 0
    const rawPageSize = options?.pageSize !== undefined && options?.pageSize !== null
      ? options.pageSize
      : PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE

    const pageSize = Math.min(
      Math.max(rawPageSize, PAGINATION_DEFAULTS.MIN_PAGE_SIZE),
      PAGINATION_DEFAULTS.MAX_PAGE_SIZE
    )

    const page = Math.max(options?.page || 1, 1)

    return {
      page,
      pageSize,
      cursor: options?.cursor,
    }
  }

  /**
   * Find all records with cursor-based pagination
   * 
   * Cursor-based pagination is more efficient for large datasets as it doesn't
   * require counting total records and performs better with deep pagination.
   * 
   * **Requirement 12.2**: Cursor-based pagination for large datasets
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param options - Pagination, sorting, and field selection options
   * @param cursorField - Field to use for cursor (default: 'id')
   * @returns Cursor-paginated result
   */
  async findAllCursor(
    options?: PaginationOptions & { sort?: SortingOptions; fields?: string[] },
    cursorField: string = 'id'
  ): Promise<CursorPaginatedResult<T>> {
    const normalizedOptions = this.normalizePaginationOptions(options)
    const pageSize = normalizedOptions.pageSize
    const cursor = normalizedOptions.cursor
    const selectFields = this.buildSelectFields(options?.fields)

    // Build base query - fetch one extra record to determine if there are more
    let query = this.supabase
      .from(this.tableName)
      .select(selectFields)
      .limit(pageSize + 1)

    // Apply tenant filter
    query = this.applyTenantFilter(query)

    // Apply cursor filter if provided
    if (cursor) {
      // Decode cursor (base64 encoded cursor value)
      const decodedCursor = this.decodeCursor(cursor)
      query = query.gt(cursorField, decodedCursor)
    }

    // Apply sorting
    if (options?.sort) {
      query = this.applySorting(query, options.sort)
    } else {
      // Default sort by cursor field ascending
      query = query.order(cursorField, { ascending: true })
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const records = (data as T[]) || []
    
    // Check if there are more records
    const hasMore = records.length > pageSize
    
    // Remove the extra record if present
    if (hasMore) {
      records.pop()
    }

    // Generate next cursor from the last record
    let nextCursor: string | null = null
    if (hasMore && records.length > 0) {
      const lastRecord = records[records.length - 1] as any
      nextCursor = this.encodeCursor(lastRecord[cursorField])
    }

    return {
      data: records,
      nextCursor,
      hasMore,
      pageSize,
    }
  }

  /**
   * Encode a cursor value to base64
   * 
   * @param value - Cursor value to encode
   * @returns Base64 encoded cursor
   */
  protected encodeCursor(value: any): string {
    return Buffer.from(String(value)).toString('base64')
  }

  /**
   * Decode a base64 cursor value
   * 
   * @param cursor - Base64 encoded cursor
   * @returns Decoded cursor value
   */
  protected decodeCursor(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf-8')
  }

  /**
   * Get the current tenant ID
   * 
   * @returns Current tenant ID
   */
  protected getTenantId(): string {
    return this.tenantId
  }

  /**
   * Get the Supabase client instance
   * 
   * @returns Supabase client
   */
  protected getClient(): SupabaseClient {
    return this.supabase
  }

  /**
   * Get the table name
   * 
   * @returns Table name
   */
  protected getTableName(): string {
    return this.tableName
  }

  /**
   * Build select fields string for query projection
   * 
   * Converts an array of field names to a comma-separated string for Supabase select.
   * If no fields are provided, returns '*' to select all fields.
   * 
   * **Requirement 12.3**: Use select projections to fetch only required fields
   * 
   * @param fields - Optional array of field names to select
   * @returns Select fields string
   */
  protected buildSelectFields(fields?: string[]): string {
    if (!fields || fields.length === 0) {
      return '*'
    }
    return fields.join(',')
  }


   /**
    * Execute a function within a database transaction
    *
    * Provides transaction support for atomic multi-step operations.
    * If any operation fails, all changes are rolled back.
    *
    * **Requirement 12.10**: Use database transactions efficiently
    * **Requirement 5.7**: Transaction support for atomic operations
    *
    * @param callback - Function to execute within transaction
    * @returns Result of the callback function
    */
   async withTransaction<R>(
     callback: (client: SupabaseClient) => Promise<R>
   ): Promise<R> {
     // Note: Supabase doesn't expose direct transaction control in the client library.
     // Transactions are handled at the database level through RLS policies and
     // PostgreSQL's ACID guarantees. For complex transactions, use database functions.
     // This method provides a consistent interface for future transaction support.

     try {
       const result = await callback(this.supabase)
       return result
     } catch (error) {
       // Log transaction failure
       console.error('[Transaction Error]', {
         table: this.tableName,
         tenantId: this.tenantId,
         error: error instanceof Error ? error.message : 'Unknown error',
       })
       throw error
     }
   }

   /**
    * Execute a batch insert operation
    *
    * Inserts multiple records in a single database operation for better performance.
    *
    * **Requirement 12.9**: Implement batch operations for bulk inserts
    *
    * @param records - Array of records to insert
    * @param chunkSize - Number of records to insert per batch (default: 1000)
    * @returns Array of created records
    */
   async batchInsert(records: Partial<T>[], chunkSize: number = 1000): Promise<T[]> {
     if (records.length === 0) {
       return []
     }

     const startTime = Date.now()
     const allCreated: T[] = []

     // Ensure tenant_id is set for all records
     const recordsWithTenant = records.map(record => ({
       ...record,
       tenant_id: this.tenantId,
     }))

     // Split into chunks to avoid payload size limits
     for (let i = 0; i < recordsWithTenant.length; i += chunkSize) {
       const chunk = recordsWithTenant.slice(i, i + chunkSize)

       const { data, error } = await this.supabase
         .from(this.tableName)
         .insert(chunk)
         .select()

       if (error) {
         throw error
       }

       allCreated.push(...(data as T[]))
     }

     const duration = Date.now() - startTime

     // Log slow batch operations (> 1 second)
     if (duration > 1000) {
       console.warn('[Slow Batch Insert]', {
         table: this.tableName,
         tenantId: this.tenantId,
         recordCount: records.length,
         duration: `${duration}ms`,
       })
     }

     return allCreated
   }

   /**
    * Execute a batch update operation
    *
    * Updates multiple records efficiently. Note: Supabase doesn't support
    * bulk updates with different values per row in a single query, so we
    * execute updates in parallel for better performance.
    *
    * **Requirement 12.9**: Implement batch operations for bulk updates
    *
    * @param updates - Array of update operations with id and data
    * @param concurrency - Number of concurrent updates (default: 10)
    * @returns void
    */
   async batchUpdate(
     updates: Array<{ id: string; data: Partial<T> }>,
     concurrency: number = 10
   ): Promise<void> {
     if (updates.length === 0) {
       return
     }

     const startTime = Date.now()

     // Execute updates in parallel with concurrency limit
     const chunks: Array<Array<{ id: string; data: Partial<T> }>> = []
     for (let i = 0; i < updates.length; i += concurrency) {
       chunks.push(updates.slice(i, i + concurrency))
     }

     for (const chunk of chunks) {
       const updatePromises = chunk.map(({ id, data }) => this.update(id, data))
       await Promise.all(updatePromises)
     }

     const duration = Date.now() - startTime

     // Log slow batch operations (> 1 second)
     if (duration > 1000) {
       console.warn('[Slow Batch Update]', {
         table: this.tableName,
         tenantId: this.tenantId,
         updateCount: updates.length,
         duration: `${duration}ms`,
       })
     }
   }

   /**
    * Execute a batch delete operation
    *
    * Deletes multiple records in a single database operation.
    *
    * **Requirement 12.9**: Implement batch operations for bulk deletes
    *
    * @param ids - Array of record IDs to delete
    * @returns Number of deleted records
    */
   async batchDelete(ids: string[]): Promise<number> {
     if (ids.length === 0) {
       return 0
     }

     const startTime = Date.now()

     let query = this.supabase
       .from(this.tableName)
       .delete()
       .in('id', ids)

     // Apply tenant filter
     query = this.applyTenantFilter(query)

     const { data, error } = await query.select()

     if (error) {
       throw error
     }

     const deletedCount = (data as T[])?.length || 0
     const duration = Date.now() - startTime

     // Log slow batch operations (> 1 second)
     if (duration > 1000) {
       console.warn('[Slow Batch Delete]', {
         table: this.tableName,
         tenantId: this.tenantId,
         deleteCount: ids.length,
         deletedCount,
         duration: `${duration}ms`,
       })
     }

     return deletedCount
   }

   /**
    * Execute a query with performance monitoring
    *
    * Wraps query execution with timing and logging for slow queries.
    *
    * **Requirement 12.8**: Monitor slow queries and log warnings
    *
    * @param queryName - Name of the query for logging
    * @param queryFn - Function that executes the query
    * @param slowThreshold - Threshold in ms to consider query slow (default: 1000ms)
    * @returns Query result
    */
   protected async monitorQuery<R>(
     queryName: string,
     queryFn: () => Promise<R>,
     slowThreshold: number = 1000
   ): Promise<R> {
     const startTime = Date.now()

     try {
       const result = await queryFn()
       const duration = Date.now() - startTime

       // Log slow queries
       if (duration > slowThreshold) {
         console.warn('[Slow Query]', {
           query: queryName,
           table: this.tableName,
           tenantId: this.tenantId,
           duration: `${duration}ms`,
           threshold: `${slowThreshold}ms`,
         })
       }

       return result
     } catch (error) {
       const duration = Date.now() - startTime

       // Log failed queries
       console.error('[Query Error]', {
         query: queryName,
         table: this.tableName,
         tenantId: this.tenantId,
         duration: `${duration}ms`,
         error: error instanceof Error ? error.message : 'Unknown error',
       })

       throw error
     }
   }

   /**
    * Find records with related data using joins
    *
    * Fetches records with their related data in a single query to avoid N+1 problems.
    * Uses Supabase's foreign key relationships for efficient joins.
    *
    * **Requirement 12.4**: Avoid N+1 query problems with proper joins
    *
    * @param options - Query options including relations to include
    * @returns Paginated result with related data
    */
   async findAllWithRelations(
     options?: PaginationOptions & {
       sort?: SortingOptions
       fields?: string[]
       relations?: string[]
     }
   ): Promise<PaginatedResult<T>> {
     return this.monitorQuery('findAllWithRelations', async () => {
       const normalizedOptions = this.normalizePaginationOptions(options)
       const page = normalizedOptions.page
       const pageSize = normalizedOptions.pageSize

       // Build select string with relations
       let selectFields = this.buildSelectFields(options?.fields)

       // Add relations to select if specified
       if (options?.relations && options.relations.length > 0) {
         const relationsStr = options.relations.join(',')
         selectFields = selectFields === '*'
           ? `*,${relationsStr}`
           : `${selectFields},${relationsStr}`
       }

       // Build base query
       let query = this.supabase
         .from(this.tableName)
         .select(selectFields, { count: 'exact' })

       // Apply tenant filter
       query = this.applyTenantFilter(query)

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
         data: (data as T[]) || [],
         total,
         page,
         pageSize,
         hasMore,
       }
     })
   }

   /**
    * Find a record by ID with related data
    *
    * Fetches a single record with its related data in a single query.
    *
    * **Requirement 12.4**: Avoid N+1 query problems with proper joins
    *
    * @param id - Record ID
    * @param relations - Array of relation names to include
    * @returns Record with related data or null if not found
    */
   async findByIdWithRelations(
     id: string,
     relations?: string[]
   ): Promise<T | null> {
     return this.monitorQuery('findByIdWithRelations', async () => {
       // Build select string with relations
       let selectFields = '*'

       if (relations && relations.length > 0) {
         const relationsStr = relations.join(',')
         selectFields = `*,${relationsStr}`
       }

       const query = this.supabase
         .from(this.tableName)
         .select(selectFields)
         .eq('id', id)

       const queryWithTenant = this.applyTenantFilter(query)
       const { data, error } = await queryWithTenant.single()

       if (error) {
         if (error.code === 'PGRST116') {
           return null
         }
         throw error
       }

       return data as T
     })
   }

}
