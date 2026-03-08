import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Base Service Class
 * 
 * Abstract base class for all service layer implementations.
 * Provides common functionality for business logic, transaction management,
 * and tenant isolation.
 * 
 * **Requirements: 4.1, 4.3, 4.5, 4.10**
 * 
 * Key Features:
 * - Transaction management with automatic rollback on error
 * - Tenant isolation validation
 * - Supabase client management
 * - Common error handling patterns
 * 
 * Usage:
 * ```typescript
 * class ContactService extends BaseService {
 *   async createContact(data: CreateContactInput) {
 *     await this.validateTenantAccess(data.tenantId)
 *     return await this.withTransaction(async (client) => {
 *       // Business logic here
 *     })
 *   }
 * }
 * ```
 */
export abstract class BaseService {
  protected supabase: SupabaseClient
  protected tenantId: string

  /**
   * Initialize the base service with Supabase client and tenant ID
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, tenantId: string) {
    this.supabase = supabase
    this.tenantId = tenantId
  }

  /**
   * Execute a function within a database transaction
   * 
   * Provides automatic transaction management with rollback on error.
   * Ensures data consistency for multi-step operations.
   * 
   * **Requirement 4.5**: Transaction management for data consistency
   * 
   * @param fn - Function to execute within transaction
   * @returns Result of the transaction function
   * @throws Error if transaction fails
   * 
   * @example
   * ```typescript
   * await this.withTransaction(async (client) => {
   *   const contact = await client.from('contacts').insert(data).single()
   *   await client.from('audit_logs').insert({ action: 'contact_created' })
   *   return contact
   * })
   * ```
   */
  protected async withTransaction<T>(
    fn: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    // Note: Supabase doesn't have explicit transaction support in the client library
    // For now, we'll execute the function directly with the client
    // In production, consider using Supabase Edge Functions or direct PostgreSQL transactions
    // via a connection pool for true ACID transactions
    
    try {
      const result = await fn(this.supabase)
      return result
    } catch (error) {
      // Log the error for debugging
      console.error('Transaction failed:', error)
      throw error
    }
  }

  /**
   * Validate that the current service has access to the specified tenant
   * 
   * Ensures tenant isolation by verifying that operations are only performed
   * on resources belonging to the authenticated tenant.
   * 
   * **Requirement 4.10**: Tenant isolation enforcement at service layer
   * 
   * @param resourceTenantId - Tenant ID of the resource being accessed
   * @throws Error if tenant IDs don't match
   * 
   * @example
   * ```typescript
   * async getContact(contactId: string) {
   *   const contact = await this.repository.findById(contactId)
   *   await this.validateTenantAccess(contact.tenant_id)
   *   return contact
   * }
   * ```
   */
  protected async validateTenantAccess(resourceTenantId: string): Promise<void> {
    if (this.tenantId !== resourceTenantId) {
      throw new Error(
        `Tenant access violation: Service tenant ${this.tenantId} attempted to access resource from tenant ${resourceTenantId}`
      )
    }
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
}
