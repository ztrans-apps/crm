import { SupabaseClient } from '@supabase/supabase-js'
import { BaseService } from './base-service'
import { ContactRepository } from '@/lib/repositories/contact-repository'
import {
  ContactModel,
  ContactOutput,
  CreateContactInput,
  UpdateContactInput,
  ContactFilters,
  toContactOutput,
  toContactOutputList,
  fromCreateContactInput,
  fromUpdateContactInput,
} from '@/lib/dto/contact.dto'
import { PaginatedResult } from '@/lib/repositories/base-repository'
import { AuditLogger } from '@/lib/security/audit-logger'

/**
 * Contact Service
 * 
 * Business logic layer for contact operations.
 * Handles validation, business rules, and orchestrates repository operations.
 * 
 * **Requirements: 4.1, 4.4, 4.6, 4.7, 4.10**
 * 
 * Key Features:
 * - Contact CRUD operations with business rule validation
 * - Duplicate detection (phone number, email)
 * - Contact search and filtering
 * - Contact merging
 * - Automatic tenant isolation
 */
export class ContactService extends BaseService {
  private repository: ContactRepository
  private auditLogger: AuditLogger

  /**
   * Initialize the contact service
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId)
    this.repository = new ContactRepository(supabase, tenantId)
    this.auditLogger = new AuditLogger(supabase)
  }

  /**
   * Create a new contact
   * 
   * Validates business rules:
   * - Phone number must be unique within tenant
   * - Email must be unique within tenant (if provided)
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param input - Contact creation data
   * @param userId - ID of the user creating the contact
   * @returns Created contact output DTO
   * @throws Error if validation fails or duplicate exists
   */
  async createContact(input: CreateContactInput, userId?: string): Promise<ContactOutput> {
    // Validate business rules: check for duplicate phone number
    const existingByPhone = await this.repository.findByPhoneNumber(input.phone_number)
    if (existingByPhone) {
      throw new Error(`Contact with phone number ${input.phone_number} already exists`)
    }

    // Validate business rules: check for duplicate email (if provided)
    if (input.email) {
      const existingByEmail = await this.repository.findByEmail(input.email)
      if (existingByEmail) {
        throw new Error(`Contact with email ${input.email} already exists`)
      }
    }

    // Transform input to model
    const contactData = fromCreateContactInput(input, this.tenantId)

    // Create contact
    const created = await this.repository.create(contactData)

    // Audit log: contact creation
    await this.auditLogger.logAction({
      tenant_id: this.tenantId,
      user_id: userId || null,
      action: 'contact.create',
      resource_type: 'contact',
      resource_id: created.id,
      changes: {
        name: { old: null, new: created.name },
        phone_number: { old: null, new: created.phone_number },
        email: { old: null, new: created.email },
      },
    })

    // Transform to output DTO
    return toContactOutput(created)
  }

  /**
   * Update an existing contact
   * 
   * Validates business rules:
   * - Contact must exist
   * - Contact must belong to current tenant
   * - Email must be unique (if changed)
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param id - Contact ID
   * @param input - Contact update data
   * @param userId - ID of the user updating the contact
   * @returns Updated contact output DTO
   * @throws Error if validation fails or contact not found
   */
  async updateContact(id: string, input: UpdateContactInput, userId?: string): Promise<ContactOutput> {
    // Fetch existing contact
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error(`Contact with ID ${id} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(existing.tenant_id)

    // Validate business rules: check for duplicate email (if changed)
    if (input.email && input.email !== existing.email) {
      const existingByEmail = await this.repository.findByEmail(input.email)
      if (existingByEmail && existingByEmail.id !== id) {
        throw new Error(`Contact with email ${input.email} already exists`)
      }
    }

    // Transform input to model
    const updateData = fromUpdateContactInput(input)

    // Update contact
    const updated = await this.repository.update(id, updateData)

    // Audit log: contact update
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    if (input.name !== undefined && input.name !== existing.name) {
      changes.name = { old: existing.name, new: updated.name }
    }
    if (input.email !== undefined && input.email !== existing.email) {
      changes.email = { old: existing.email, new: updated.email }
    }
    if (input.notes !== undefined && input.notes !== existing.notes) {
      changes.notes = { old: existing.notes, new: updated.notes }
    }

    if (Object.keys(changes).length > 0) {
      await this.auditLogger.logAction({
        tenant_id: this.tenantId,
        user_id: userId || null,
        action: 'contact.update',
        resource_type: 'contact',
        resource_id: id,
        changes,
      })
    }

    // Transform to output DTO
    return toContactOutput(updated)
  }

  /**
   * Get a contact by ID
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param id - Contact ID
   * @returns Contact output DTO
   * @throws Error if contact not found or access denied
   */
  async getContact(id: string): Promise<ContactOutput> {
    const contact = await this.repository.findById(id)
    if (!contact) {
      throw new Error(`Contact with ID ${id} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(contact.tenant_id)

    return toContactOutput(contact)
  }

  /**
   * List contacts with filtering, pagination, and sorting
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param filters - Filter, pagination, and sorting options
   * @returns Paginated list of contacts
   */
  async listContacts(filters: ContactFilters): Promise<PaginatedResult<ContactOutput>> {
    let result: PaginatedResult<ContactModel>

    // Apply filters
    if (filters.search) {
      // Use search if query provided
      result = await this.repository.search(filters.search, {
        page: filters.page,
        pageSize: filters.pageSize,
        sort: filters.sortBy
          ? { field: filters.sortBy, direction: filters.sortDirection || 'asc' }
          : undefined,
      })
    } else if (filters.tags && filters.tags.length > 0) {
      // Filter by tags
      result = await this.repository.findByTags(filters.tags, {
        page: filters.page,
        pageSize: filters.pageSize,
        sort: filters.sortBy
          ? { field: filters.sortBy, direction: filters.sortDirection || 'asc' }
          : undefined,
      })
    } else {
      // Get all contacts
      result = await this.repository.findAll({
        page: filters.page,
        pageSize: filters.pageSize,
        sort: filters.sortBy
          ? { field: filters.sortBy, direction: filters.sortDirection || 'asc' }
          : undefined,
      })
    }

    // Transform to output DTOs
    return {
      ...result,
      data: toContactOutputList(result.data),
    }
  }

  /**
   * Delete a contact
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param id - Contact ID
   * @param userId - ID of the user deleting the contact
   * @returns void
   * @throws Error if contact not found or access denied
   */
  async deleteContact(id: string, userId?: string): Promise<void> {
    // Fetch existing contact to validate tenant access
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error(`Contact with ID ${id} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(existing.tenant_id)

    // Delete contact
    await this.repository.delete(id)

    // Audit log: contact deletion
    await this.auditLogger.logAction({
      tenant_id: this.tenantId,
      user_id: userId || null,
      action: 'contact.delete',
      resource_type: 'contact',
      resource_id: id,
      changes: {
        name: { old: existing.name, new: null },
        phone_number: { old: existing.phone_number, new: null },
      },
    })
  }

  /**
   * Search contacts by query string
   * 
   * Searches across name, phone number, email, and notes.
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param query - Search query
   * @param options - Pagination and sorting options
   * @returns Paginated search results
   */
  async searchContacts(
    query: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResult<ContactOutput>> {
    const result = await this.repository.search(query, options)

    // Transform to output DTOs
    return {
      ...result,
      data: toContactOutputList(result.data),
    }
  }

  /**
   * Merge two contacts
   * 
   * Merges source contact into target contact, combining their data.
   * The source contact is deleted after merge.
   * 
   * Business rules:
   * - Both contacts must exist
   * - Both contacts must belong to current tenant
   * - Target contact data takes precedence
   * - Tags are combined (deduplicated)
   * - Metadata is merged (target values take precedence)
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param sourceId - ID of contact to merge from (will be deleted)
   * @param targetId - ID of contact to merge into (will be updated)
   * @returns Merged contact output DTO
   * @throws Error if validation fails or contacts not found
   */
  async mergeContacts(sourceId: string, targetId: string): Promise<ContactOutput> {
    // Fetch both contacts
    const source = await this.repository.findById(sourceId)
    if (!source) {
      throw new Error(`Source contact with ID ${sourceId} not found`)
    }

    const target = await this.repository.findById(targetId)
    if (!target) {
      throw new Error(`Target contact with ID ${targetId} not found`)
    }

    // Validate tenant access for both contacts
    await this.validateTenantAccess(source.tenant_id)
    await this.validateTenantAccess(target.tenant_id)

    // Merge data (target takes precedence)
    const mergedData: Partial<ContactModel> = {
      // Use target values if present, otherwise use source values
      name: target.name || source.name,
      email: target.email || source.email,
      notes: target.notes
        ? source.notes
          ? `${target.notes}\n\n--- Merged from contact ${sourceId} ---\n${source.notes}`
          : target.notes
        : source.notes,
      // Combine and deduplicate tags
      tags: Array.from(
        new Set([...(target.tags || []), ...(source.tags || [])])
      ),
      // Merge metadata (target values take precedence)
      metadata: {
        ...(source.metadata || {}),
        ...(target.metadata || {}),
      },
    }

    // Update target contact with merged data
    const merged = await this.repository.update(targetId, mergedData)

    // Delete source contact
    await this.repository.delete(sourceId)

    // Transform to output DTO
    return toContactOutput(merged)
  }

  /**
   * Get contact by phone number
   * 
   * @param phoneNumber - Phone number to search for
   * @returns Contact output DTO or null if not found
   */
  async getContactByPhoneNumber(phoneNumber: string): Promise<ContactOutput | null> {
    const contact = await this.repository.findByPhoneNumber(phoneNumber)
    if (!contact) {
      return null
    }

    // Validate tenant access
    await this.validateTenantAccess(contact.tenant_id)

    return toContactOutput(contact)
  }

  /**
   * Get contact by email
   * 
   * @param email - Email to search for
   * @returns Contact output DTO or null if not found
   */
  async getContactByEmail(email: string): Promise<ContactOutput | null> {
    const contact = await this.repository.findByEmail(email)
    if (!contact) {
      return null
    }

    // Validate tenant access
    await this.validateTenantAccess(contact.tenant_id)

    return toContactOutput(contact)
  }

  /**
   * Bulk create contacts
   * 
   * Creates multiple contacts in a single operation.
   * Skips contacts with duplicate phone numbers.
   * 
   * @param inputs - Array of contact creation data
   * @returns Array of created contact output DTOs
   */
  async bulkCreateContacts(inputs: CreateContactInput[]): Promise<ContactOutput[]> {
    // Filter out duplicates within the input array
    const uniqueInputs = inputs.filter(
      (input, index, self) =>
        index === self.findIndex((t) => t.phone_number === input.phone_number)
    )

    // Check for existing contacts and filter them out
    const existingChecks = await Promise.all(
      uniqueInputs.map((input) => this.repository.existsByPhoneNumber(input.phone_number))
    )

    const newInputs = uniqueInputs.filter((_, index) => !existingChecks[index])

    if (newInputs.length === 0) {
      return []
    }

    // Transform inputs to models
    const contactsData = newInputs.map((input) =>
      fromCreateContactInput(input, this.tenantId)
    )

    // Bulk create
    const created = await this.repository.bulkCreate(contactsData)

    // Transform to output DTOs
    return toContactOutputList(created)
  }
}
