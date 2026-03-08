import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessageService } from '@/lib/services/message-service'
import { MessageRepository } from '@/lib/repositories/message-repository'
import { SendMessageInput, MessageModel } from '@/lib/dto/message.dto'

/**
 * Unit Tests for MessageService
 * 
 * Tests business logic, validation, and error handling.
 * 
 * **Requirements: 4.4, 4.7**
 */

// Mock the repository
vi.mock('@/lib/repositories/message-repository')

describe('MessageService', () => {
  let service: MessageService
  let mockRepository: any
  const tenantId = 'test-tenant-id'
  const senderId = 'test-sender-id'
  const mockSupabase = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new MessageService(mockSupabase, tenantId)
    mockRepository = (service as any).repository
  })

  describe('sendMessage', () => {
    const validInput: SendMessageInput = {
      conversation_id: 'conv-123',
      content: 'Hello, world!',
    }

    it('should send a message successfully', async () => {
      mockRepository.create = vi.fn().mockResolvedValue({
        id: 'message-1',
        tenant_id: tenantId,
        conversation_id: validInput.conversation_id,
        sender_id: senderId,
        content: validInput.content,
        media_url: null,
        media_type: null,
        status: 'pending',
        direction: 'outbound',
        metadata: null,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        updated_at: new Date().toISOString(),
      } as MessageModel)

      const result = await service.sendMessage(validInput, senderId)

      expect(result).toBeDefined()
      expect(result.content).toBe(validInput.content)
      expect(result.conversation_id).toBe(validInput.conversation_id)
      expect(result.status).toBe('pending')
      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('should reject message with content exceeding max length', async () => {
      const longContent = 'a'.repeat(4097) // Exceeds 4096 limit
      const invalidInput: SendMessageInput = {
        ...validInput,
        content: longContent,
      }

      await expect(service.sendMessage(invalidInput, senderId)).rejects.toThrow(
        'Message content exceeds maximum length'
      )

      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should send message with media', async () => {
      const inputWithMedia: SendMessageInput = {
        ...validInput,
        media_url: 'https://example.com/image.jpg',
        media_type: 'image',
      }

      mockRepository.create = vi.fn().mockResolvedValue({
        id: 'message-1',
        tenant_id: tenantId,
        conversation_id: inputWithMedia.conversation_id,
        sender_id: senderId,
        content: inputWithMedia.content,
        media_url: inputWithMedia.media_url,
        media_type: inputWithMedia.media_type,
        status: 'pending',
        direction: 'outbound',
        metadata: null,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        updated_at: new Date().toISOString(),
      } as MessageModel)

      const result = await service.sendMessage(inputWithMedia, senderId)

      expect(result).toBeDefined()
      expect(result.media_url).toBe(inputWithMedia.media_url)
      expect(result.media_type).toBe(inputWithMedia.media_type)
    })

    it('should reject media_url without media_type', async () => {
      const invalidInput: SendMessageInput = {
        ...validInput,
        media_url: 'https://example.com/image.jpg',
        // media_type is missing
      }

      await expect(service.sendMessage(invalidInput, senderId)).rejects.toThrow(
        'media_type is required when media_url is provided'
      )

      expect(mockRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('getMessage', () => {
    const messageId = 'message-1'
    const existingMessage: MessageModel = {
      id: messageId,
      tenant_id: tenantId,
      conversation_id: 'conv-123',
      sender_id: senderId,
      content: 'Test message',
      media_url: null,
      media_type: null,
      status: 'sent',
      direction: 'outbound',
      metadata: null,
      created_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      updated_at: new Date().toISOString(),
    }

    it('should get a message successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(existingMessage)

      const result = await service.getMessage(messageId)

      expect(result).toBeDefined()
      expect(result.id).toBe(messageId)
      expect(result.content).toBe(existingMessage.content)
      expect(mockRepository.findById).toHaveBeenCalledWith(messageId)
    })

    it('should reject get for non-existent message', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.getMessage(messageId)).rejects.toThrow(
        `Message with ID ${messageId} not found`
      )
    })

    it('should reject get for message from different tenant', async () => {
      const differentTenantMessage = {
        ...existingMessage,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(differentTenantMessage)

      await expect(service.getMessage(messageId)).rejects.toThrow(
        /Tenant access violation/
      )
    })
  })

  describe('markAsRead', () => {
    const messageId = 'message-1'
    const existingMessage: MessageModel = {
      id: messageId,
      tenant_id: tenantId,
      conversation_id: 'conv-123',
      sender_id: senderId,
      content: 'Test message',
      media_url: null,
      media_type: null,
      status: 'delivered',
      direction: 'inbound',
      metadata: null,
      created_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
      read_at: null,
      updated_at: new Date().toISOString(),
    }

    it('should mark a message as read successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(existingMessage)
      mockRepository.markAsRead = vi.fn().mockResolvedValue(undefined)

      await service.markAsRead(messageId)

      expect(mockRepository.findById).toHaveBeenCalledWith(messageId)
      expect(mockRepository.markAsRead).toHaveBeenCalledWith([messageId])
    })

    it('should reject mark as read for non-existent message', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.markAsRead(messageId)).rejects.toThrow(
        `Message with ID ${messageId} not found`
      )

      expect(mockRepository.markAsRead).not.toHaveBeenCalled()
    })

    it('should reject mark as read for message from different tenant', async () => {
      const differentTenantMessage = {
        ...existingMessage,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(differentTenantMessage)

      await expect(service.markAsRead(messageId)).rejects.toThrow(
        /Tenant access violation/
      )

      expect(mockRepository.markAsRead).not.toHaveBeenCalled()
    })
  })

  describe('deleteMessage', () => {
    const messageId = 'message-1'
    const existingMessage: MessageModel = {
      id: messageId,
      tenant_id: tenantId,
      conversation_id: 'conv-123',
      sender_id: senderId,
      content: 'Test message',
      media_url: null,
      media_type: null,
      status: 'sent',
      direction: 'outbound',
      metadata: null,
      created_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      updated_at: new Date().toISOString(),
    }

    it('should delete a message successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(existingMessage)
      mockRepository.delete = vi.fn().mockResolvedValue(existingMessage)

      await service.deleteMessage(messageId)

      expect(mockRepository.findById).toHaveBeenCalledWith(messageId)
      expect(mockRepository.delete).toHaveBeenCalledWith(messageId)
    })

    it('should reject delete for non-existent message', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.deleteMessage(messageId)).rejects.toThrow(
        `Message with ID ${messageId} not found`
      )

      expect(mockRepository.delete).not.toHaveBeenCalled()
    })

    it('should reject delete for message from different tenant', async () => {
      const differentTenantMessage = {
        ...existingMessage,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(differentTenantMessage)

      await expect(service.deleteMessage(messageId)).rejects.toThrow(
        /Tenant access violation/
      )

      expect(mockRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('updateMessageStatus', () => {
    const messageId = 'message-1'
    const existingMessage: MessageModel = {
      id: messageId,
      tenant_id: tenantId,
      conversation_id: 'conv-123',
      sender_id: senderId,
      content: 'Test message',
      media_url: null,
      media_type: null,
      status: 'sent',
      direction: 'outbound',
      metadata: null,
      created_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      updated_at: new Date().toISOString(),
    }

    it('should update message status successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(existingMessage)
      mockRepository.updateStatus = vi.fn().mockResolvedValue({
        ...existingMessage,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })

      const result = await service.updateMessageStatus(messageId, 'delivered')

      expect(result).toBeDefined()
      expect(result.status).toBe('delivered')
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(messageId, 'delivered')
    })

    it('should reject invalid status transition', async () => {
      const readMessage = {
        ...existingMessage,
        status: 'read' as const,
      }

      mockRepository.findById = vi.fn().mockResolvedValue(readMessage)

      await expect(
        service.updateMessageStatus(messageId, 'delivered')
      ).rejects.toThrow('Invalid status transition')

      expect(mockRepository.updateStatus).not.toHaveBeenCalled()
    })

    it('should reject status update for non-existent message', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.updateMessageStatus(messageId, 'delivered')
      ).rejects.toThrow(`Message with ID ${messageId} not found`)

      expect(mockRepository.updateStatus).not.toHaveBeenCalled()
    })

    it('should reject status update for message from different tenant', async () => {
      const differentTenantMessage = {
        ...existingMessage,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(differentTenantMessage)

      await expect(
        service.updateMessageStatus(messageId, 'delivered')
      ).rejects.toThrow(/Tenant access violation/)

      expect(mockRepository.updateStatus).not.toHaveBeenCalled()
    })
  })

  describe('listMessages', () => {
    const conversationId = 'conv-123'

    it('should list messages successfully', async () => {
      const mockMessages: MessageModel[] = [
        {
          id: 'message-1',
          tenant_id: tenantId,
          conversation_id: conversationId,
          sender_id: senderId,
          content: 'Message 1',
          media_url: null,
          media_type: null,
          status: 'sent',
          direction: 'outbound',
          metadata: null,
          created_at: new Date().toISOString(),
          delivered_at: null,
          read_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          id: 'message-2',
          tenant_id: tenantId,
          conversation_id: conversationId,
          sender_id: senderId,
          content: 'Message 2',
          media_url: null,
          media_type: null,
          status: 'sent',
          direction: 'outbound',
          metadata: null,
          created_at: new Date().toISOString(),
          delivered_at: null,
          read_at: null,
          updated_at: new Date().toISOString(),
        },
      ]

      mockRepository.findByConversation = vi.fn().mockResolvedValue({
        data: mockMessages,
        total: 2,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      const result = await service.listMessages(conversationId)

      expect(result).toBeDefined()
      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(mockRepository.findByConversation).toHaveBeenCalledWith(
        conversationId,
        undefined
      )
    })
  })

  describe('getUnreadMessages', () => {
    const conversationId = 'conv-123'

    it('should get unread messages successfully', async () => {
      const mockUnreadMessages: MessageModel[] = [
        {
          id: 'message-1',
          tenant_id: tenantId,
          conversation_id: conversationId,
          sender_id: 'other-sender',
          content: 'Unread message',
          media_url: null,
          media_type: null,
          status: 'delivered',
          direction: 'inbound',
          metadata: null,
          created_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          read_at: null,
          updated_at: new Date().toISOString(),
        },
      ]

      mockRepository.findUnread = vi.fn().mockResolvedValue(mockUnreadMessages)

      const result = await service.getUnreadMessages(conversationId)

      expect(result).toHaveLength(1)
      expect(result[0].read_at).toBeNull()
      expect(mockRepository.findUnread).toHaveBeenCalledWith(conversationId)
    })
  })

  describe('getMessageStats', () => {
    const conversationId = 'conv-123'

    it('should get message statistics successfully', async () => {
      const mockStats = {
        total: 10,
        sent: 5,
        delivered: 3,
        read: 2,
        failed: 0,
        pending: 0,
      }

      mockRepository.getMessageStats = vi.fn().mockResolvedValue(mockStats)

      const result = await service.getMessageStats(conversationId)

      expect(result).toEqual(mockStats)
      expect(mockRepository.getMessageStats).toHaveBeenCalledWith(conversationId)
    })
  })
})
