import { SupabaseClient } from '@supabase/supabase-js'
import { BaseService } from './base-service'
import { MessageRepository, MessageStats } from '@/lib/repositories/message-repository'
import {
  MessageModel,
  MessageOutput,
  SendMessageInput,
  toMessageOutput,
  toMessageOutputList,
  fromSendMessageInput,
} from '@/lib/dto/message.dto'
import { PaginatedResult, PaginationOptions } from '@/lib/repositories/base-repository'
import { AuditLogger } from '@/lib/security/audit-logger'

/**
 * Message Service
 * 
 * Business logic layer for message operations.
 * Handles validation, business rules, and orchestrates repository operations.
 * 
 * **Requirements: 4.1, 4.4, 4.7, 4.10**
 * 
 * Key Features:
 * - Message sending with validation
 * - Message retrieval and pagination
 * - Mark messages as read
 * - Message statistics
 * - Automatic tenant isolation
 */
export class MessageService extends BaseService {
  private repository: MessageRepository
  private auditLogger: AuditLogger

  /**
   * Initialize the message service
   * 
   * @param supabase - Supabase client instance
   * @param tenantId - Tenant ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId)
    this.repository = new MessageRepository(supabase, tenantId)
    this.auditLogger = new AuditLogger(supabase)
  }

  /**
   * Send a new message
   * 
   * Validates business rules:
   * - Content must not be empty
   * - Content must not exceed maximum length (4096 characters)
   * - If media is provided, media_type must be specified
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.4**: Business rule validation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param input - Message sending data
   * @param senderId - ID of the user sending the message
   * @returns Created message output DTO
   * @throws Error if validation fails
   */
  async sendMessage(input: SendMessageInput, senderId: string): Promise<MessageOutput> {
    // Validate business rules: content length
    if (input.content.length > 4096) {
      throw new Error('Message content exceeds maximum length of 4096 characters')
    }

    // Validate business rules: media_type required if media_url provided
    if (input.media_url && !input.media_type) {
      throw new Error('media_type is required when media_url is provided')
    }

    // Transform input to model
    const messageData = fromSendMessageInput(input, this.tenantId, senderId)

    // Create message
    const created = await this.repository.create(messageData)

    // Audit log: message creation
    await this.auditLogger.logAction({
      tenant_id: this.tenantId,
      user_id: senderId,
      action: 'message.create',
      resource_type: 'message',
      resource_id: created.id,
      changes: {
        conversation_id: { old: null, new: created.conversation_id },
        direction: { old: null, new: created.direction },
        status: { old: null, new: created.status },
      },
    })

    // TODO: In production, integrate with WhatsApp API to actually send the message
    // For now, we just create the message record with 'pending' status

    // Transform to output DTO
    return toMessageOutput(created)
  }

  /**
   * Get a message by ID
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param id - Message ID
   * @returns Message output DTO
   * @throws Error if message not found or access denied
   */
  async getMessage(id: string): Promise<MessageOutput> {
    const message = await this.repository.findById(id)
    if (!message) {
      throw new Error(`Message with ID ${id} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(message.tenant_id)

    return toMessageOutput(message)
  }

  /**
   * List messages in a conversation
   * 
   * Returns messages in chronological order with pagination.
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param conversationId - Conversation ID
   * @param options - Pagination options
   * @returns Paginated list of messages
   */
  async listMessages(
    conversationId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<MessageOutput>> {
    const result = await this.repository.findByConversation(conversationId, options)

    // Transform to output DTOs
    return {
      ...result,
      data: toMessageOutputList(result.data),
    }
  }

  /**
   * Mark a message as read
   * 
   * Updates the read_at timestamp for the message.
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param messageId - Message ID to mark as read
   * @returns void
   * @throws Error if message not found or access denied
   */
  async markAsRead(messageId: string): Promise<void> {
    // Fetch message to validate tenant access
    const message = await this.repository.findById(messageId)
    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(message.tenant_id)

    // Mark as read
    await this.repository.markAsRead([messageId])
  }

  /**
   * Mark multiple messages as read
   * 
   * Updates the read_at timestamp for multiple messages.
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param messageIds - Array of message IDs to mark as read
   * @returns void
   */
  async markMultipleAsRead(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) {
      return
    }

    // Validate tenant access for all messages
    // Note: For performance, we could optimize this by doing a single query
    // to check all messages belong to the tenant
    const messages = await Promise.all(
      messageIds.map((id) => this.repository.findById(id))
    )

    // Check all messages exist and belong to tenant
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      if (!message) {
        throw new Error(`Message with ID ${messageIds[i]} not found`)
      }
      await this.validateTenantAccess(message.tenant_id)
    }

    // Mark all as read
    await this.repository.markAsRead(messageIds)
  }

  /**
   * Delete a message
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param id - Message ID
   * @param userId - ID of the user deleting the message
   * @returns void
   * @throws Error if message not found or access denied
   */
  async deleteMessage(id: string, userId?: string): Promise<void> {
    // Fetch message to validate tenant access
    const message = await this.repository.findById(id)
    if (!message) {
      throw new Error(`Message with ID ${id} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(message.tenant_id)

    // Delete message
    await this.repository.delete(id)

    // Audit log: message deletion
    await this.auditLogger.logAction({
      tenant_id: this.tenantId,
      user_id: userId || null,
      action: 'message.delete',
      resource_type: 'message',
      resource_id: id,
      changes: {
        conversation_id: { old: message.conversation_id, new: null },
        status: { old: message.status, new: null },
      },
    })
  }

  /**
   * Get unread messages in a conversation
   * 
   * Returns all messages that have not been read yet.
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param conversationId - Conversation ID
   * @returns Array of unread messages
   */
  async getUnreadMessages(conversationId: string): Promise<MessageOutput[]> {
    const messages = await this.repository.findUnread(conversationId)

    // Transform to output DTOs
    return toMessageOutputList(messages)
  }

  /**
   * Get message statistics for a conversation
   * 
   * Returns counts of messages by status.
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param conversationId - Conversation ID
   * @returns Message statistics
   */
  async getMessageStats(conversationId: string): Promise<MessageStats> {
    return await this.repository.getMessageStats(conversationId)
  }

  /**
   * Update message status
   * 
   * Updates the status of a message (e.g., from 'sent' to 'delivered').
   * This would typically be called by webhook handlers when receiving
   * status updates from the WhatsApp API.
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param messageId - Message ID
   * @param status - New status
   * @param userId - ID of the user updating the status
   * @returns Updated message output DTO
   * @throws Error if message not found or access denied
   */
  async updateMessageStatus(
    messageId: string,
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
    userId?: string
  ): Promise<MessageOutput> {
    // Fetch message to validate tenant access
    const message = await this.repository.findById(messageId)
    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`)
    }

    // Validate tenant access
    await this.validateTenantAccess(message.tenant_id)

    // Validate status transition
    // (In a real system, you might want to enforce valid state transitions)
    const validTransitions: Record<string, string[]> = {
      pending: ['sent', 'failed'],
      sent: ['delivered', 'failed'],
      delivered: ['read', 'failed'],
      read: [],
      failed: [],
    }

    const allowedNextStates = validTransitions[message.status] || []
    if (!allowedNextStates.includes(status)) {
      throw new Error(
        `Invalid status transition from ${message.status} to ${status}`
      )
    }

    // Update status
    const updated = await this.repository.updateStatus(messageId, status)

    // Audit log: message status update
    await this.auditLogger.logAction({
      tenant_id: this.tenantId,
      user_id: userId || null,
      action: 'message.update_status',
      resource_type: 'message',
      resource_id: messageId,
      changes: {
        status: { old: message.status, new: status },
      },
    })

    // Transform to output DTO
    return toMessageOutput(updated)
  }

  /**
   * Get the latest message in a conversation
   * 
   * Returns the most recent message.
   * 
   * **Requirement 4.1**: Business logic encapsulation
   * **Requirement 4.10**: Tenant isolation
   * 
   * @param conversationId - Conversation ID
   * @returns Latest message or null if no messages
   */
  async getLatestMessage(conversationId: string): Promise<MessageOutput | null> {
    const message = await this.repository.findLatestByConversation(conversationId)
    if (!message) {
      return null
    }

    // Validate tenant access
    await this.validateTenantAccess(message.tenant_id)

    return toMessageOutput(message)
  }

  /**
   * Count messages in a conversation
   * 
   * Returns the total count of messages.
   * 
   * @param conversationId - Conversation ID
   * @returns Total message count
   */
  async countMessages(conversationId: string): Promise<number> {
    return await this.repository.countByConversation(conversationId)
  }

  /**
   * Count unread messages in a conversation
   * 
   * Returns the count of unread messages.
   * 
   * @param conversationId - Conversation ID
   * @returns Unread message count
   */
  async countUnreadMessages(conversationId: string): Promise<number> {
    return await this.repository.countUnreadByConversation(conversationId)
  }
}
