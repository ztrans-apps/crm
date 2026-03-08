import { SupabaseClient } from '@supabase/supabase-js'
import { BaseService } from './base-service'
import { ConversationRepository } from '@/lib/repositories/conversation-repository'
import {
  ConversationModel,
  ConversationOutput,
  CreateConversationInput,
  UpdateConversationInput,
  ConversationFilters,
  toConversationOutput,
  toConversationOutputList,
  fromCreateConversationInput,
  fromUpdateConversationInput,
} from '@/lib/dto/conversation.dto'
import { PaginatedResult } from '@/lib/repositories/base-repository'
import { AuditLogger } from '@/lib/security/audit-logger'

/**
 * Conversation Service
 * 
 * Business logic layer for conversation operations.
 * Handles validation, business rules, and orchestrates repository operations.
 * 
 * **Requirements: 4.1, 4.4, 4.6, 4.7, 4.10**
 * 
 * Key Features:
 * - Conversation CRUD operations with business rule validation
 * - Conversation assignment and status management
 * - Conversation filtering and search
 * - Automatic tenant isolation
 */
export class ConversationService extends BaseService {
  private repository: ConversationRepository
  private auditLogger: AuditLogger

  /**
   * Initialize the conversation service
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId)
    this.repository = new ConversationRepository(supabase, tenantId)
    this.auditLogger = new AuditLogger(supabase)
  }

  /**
   * Create a new conversation
   * 
   * Validates business rules:
   * - Contact must exist
   * - Contact must belong to current tenant
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param input - Conversation creation data
   * @param userId - ID of the user creating the conversation
   * @returns Created conversation output DTO
   * @throws Error if validation fails
   */
  async createConversation(input: CreateConversationInput, userId?: string): Promise<ConversationOutput> {
    // Validate business rules: check if contact exists and belongs to tenant
    const { data: contact, error: contactError } = await this.supabase
      .from('contacts')
      .select('id, tenant_id')
      .eq('id', input.contact_id)
      .eq('tenant_id', this.tenantId)
      .maybeSingle()

    if (contactError) {
      throw new Error(`Failed to validate contact: ${contactError.message}`)
    }

    if (!contact) {
      throw new Error(`Contact with ID ${input.contact_id} not found or does not belong to tenant`)
    }

    // Transform input to model
    const conversationData = fromCreateConversationInput(input, this.tenantId)

    // Create conversation
    const created = await this.repository.create(conversationData)

    // Audit log: conversation creation
    await this.auditLogger.logAction({
      tenant_id: this.tenantId,
      user_id: userId || null,
      action: 'conversation.create',
      resource_type: 'conversation',
      resource_id: created.id,
      changes: {
        contact_id: { old: null, new: created.contact_id },
        assigned_to: { old: null, new: created.assigned_to },
        status: { old: null, new: created.status },
      },
    })

    // Transform to output DTO
    return toConversationOutput(created)
  }

  /**
   * Update an existing conversation
   * 
   * Validates business rules:
   * - Conversation must exist
   * - Conversation must belong to current tenant
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param id - Conversation ID
   * @param input - Conversation update data
   * @param userId - ID of the user updating the conversation
   * @returns Updated conversation output DTO
   * @throws Error if validation fails or conversation not found
   */
  async updateConversation(id: string, input: UpdateConversationInput, userId?: string): Promise<ConversationOutput> {
    // Fetch existing conversation
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error(`Conversation with ID ${id} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(existing.tenant_id)

    // Transform input to model
    const updateData = fromUpdateConversationInput(input)

    // Update conversation
    const updated = await this.repository.update(id, updateData)

    // Audit log: conversation update
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    if (input.assigned_to !== undefined && input.assigned_to !== existing.assigned_to) {
      changes.assigned_to = { old: existing.assigned_to, new: updated.assigned_to }
    }
    if (input.status !== undefined && input.status !== existing.status) {
      changes.status = { old: existing.status, new: updated.status }
    }
    if (input.workflow_status !== undefined && input.workflow_status !== existing.workflow_status) {
      changes.workflow_status = { old: existing.workflow_status, new: updated.workflow_status }
    }

    if (Object.keys(changes).length > 0) {
      await this.auditLogger.logAction({
        tenant_id: this.tenantId,
        user_id: userId || null,
        action: 'conversation.update',
        resource_type: 'conversation',
        resource_id: id,
        changes,
      })
    }

    // Transform to output DTO
    return toConversationOutput(updated)
  }

  /**
   * Get a conversation by ID
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param id - Conversation ID
   * @returns Conversation output DTO
   * @throws Error if conversation not found or access denied
   */
  async getConversation(id: string): Promise<ConversationOutput> {
    const conversation = await this.repository.findById(id)
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(conversation.tenant_id)

    return toConversationOutput(conversation)
  }

  /**
   * List conversations with filtering, pagination, and sorting
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param filters - Filter, pagination, and sorting options
   * @returns Paginated list of conversations
   */
  async listConversations(filters: ConversationFilters): Promise<PaginatedResult<ConversationOutput>> {
    let result: PaginatedResult<ConversationModel>

    // Build filter object for repository
    const repoFilters: {
      status?: 'open' | 'closed'
      workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
      assigned_to?: string | null
      contact_id?: string
    } = {}

    if (filters.status) {
      repoFilters.status = filters.status
    }

    if (filters.workflow_status) {
      repoFilters.workflow_status = filters.workflow_status
    }

    if (filters.assigned_to !== undefined) {
      repoFilters.assigned_to = filters.assigned_to
    }

    if (filters.contact_id) {
      repoFilters.contact_id = filters.contact_id
    }

    // Get conversations with filters
    result = await this.repository.findWithFilters(repoFilters, {
      page: filters.page,
      pageSize: filters.pageSize,
      sort: filters.sortBy
        ? { field: filters.sortBy, direction: filters.sortDirection || 'desc' }
        : undefined,
    })

    // Transform to output DTOs
    return {
      ...result,
      data: toConversationOutputList(result.data),
    }
  }

  /**
   * Delete a conversation
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param id - Conversation ID
   * @param userId - ID of the user deleting the conversation
   * @returns void
   * @throws Error if conversation not found or access denied
   */
  async deleteConversation(id: string, userId?: string): Promise<void> {
    // Fetch existing conversation to validate tenant access
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error(`Conversation with ID ${id} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(existing.tenant_id)

    // Delete conversation
    await this.repository.delete(id)

    // Audit log: conversation deletion
    await this.auditLogger.logAction({
      tenant_id: this.tenantId,
      user_id: userId || null,
      action: 'conversation.delete',
      resource_type: 'conversation',
      resource_id: id,
      changes: {
        contact_id: { old: existing.contact_id, new: null },
        status: { old: existing.status, new: null },
      },
    })
  }

  /**
   * Assign a conversation to a user
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param conversationId - Conversation ID
   * @param assignedTo - User ID to assign to (null to unassign)
   * @param userId - ID of the user performing the assignment
   * @returns Updated conversation output DTO
   * @throws Error if validation fails
   */
  async assignConversation(
    conversationId: string,
    assignedTo: string | null,
    userId?: string
  ): Promise<ConversationOutput> {
    return this.updateConversation(
      conversationId,
      { assigned_to: assignedTo },
      userId
    )
  }

  /**
   * Update conversation status
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param conversationId - Conversation ID
   * @param status - New status
   * @param userId - ID of the user updating the status
   * @returns Updated conversation output DTO
   * @throws Error if validation fails
   */
  async updateStatus(
    conversationId: string,
    status: 'open' | 'closed',
    userId?: string
  ): Promise<ConversationOutput> {
    return this.updateConversation(
      conversationId,
      { status },
      userId
    )
  }

  /**
   * Update conversation workflow status
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param conversationId - Conversation ID
   * @param workflowStatus - New workflow status
   * @param userId - ID of the user updating the workflow status
   * @returns Updated conversation output DTO
   * @throws Error if validation fails
   */
  async updateWorkflowStatus(
    conversationId: string,
    workflowStatus: 'incoming' | 'waiting' | 'in_progress' | 'done',
    userId?: string
  ): Promise<ConversationOutput> {
    return this.updateConversation(
      conversationId,
      { workflow_status: workflowStatus },
      userId
    )
  }

  /**
   * Get conversations by contact ID
   * 
   * @param contactId - Contact ID
   * @param options - Pagination and sorting options
   * @returns Paginated list of conversations
   */
  async getConversationsByContact(
    contactId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResult<ConversationOutput>> {
    const result = await this.repository.findByContactId(contactId, options)

    // Transform to output DTOs
    return {
      ...result,
      data: toConversationOutputList(result.data),
    }
  }

  /**
   * Get conversations assigned to a user
   * 
   * @param assignedTo - User ID (null for unassigned conversations)
   * @param options - Pagination and sorting options
   * @returns Paginated list of conversations
   */
  async getConversationsByAssignedTo(
    assignedTo: string | null,
    options?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResult<ConversationOutput>> {
    const result = await this.repository.findByAssignedTo(assignedTo, options)

    // Transform to output DTOs
    return {
      ...result,
      data: toConversationOutputList(result.data),
    }
  }

  /**
   * Get unread conversations count for a user
   * 
   * @param assignedTo - User ID
   * @returns Count of unread conversations
   */
  async getUnreadCount(assignedTo: string): Promise<number> {
    return this.repository.getUnreadCount(assignedTo)
  }

  /**
   * Mark conversation as read
   * 
   * @param conversationId - Conversation ID
   * @param userId - ID of the user marking as read
   * @returns Updated conversation output DTO
   */
  async markAsRead(conversationId: string, userId?: string): Promise<ConversationOutput> {
    return this.updateConversation(
      conversationId,
      { unread_count: 0 },
      userId
    )
  }

  /**
   * Increment unread count
   * 
   * @param conversationId - Conversation ID
   * @returns void
   */
  async incrementUnreadCount(conversationId: string): Promise<void> {
    const conversation = await this.repository.findById(conversationId)
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`)
    }

    await this.repository.update(conversationId, {
      unread_count: (conversation.unread_count || 0) + 1,
    })
  }
}
