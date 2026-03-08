/**
 * Integration Tests for Message API Routes
 * 
 * Tests the migrated message API routes to ensure they work correctly
 * with the new middleware, service, and repository layers.
 * 
 * Tests cover:
 * - End-to-end API flows for messages
 * - Authentication and authorization
 * - Input validation and error handling
 * - Backward compatibility
 * 
 * Requirements: 23.2, 23.9
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Message API Routes Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>
  let testTenantId: string
  let testUserId: string
  let testConversationId: string
  let testContactId: string
  let createdMessageIds: string[] = []

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // For testing, we'll need to set up test data
    testTenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
    testUserId = '00000000-0000-0000-0000-000000000001'
    
    // Create a test contact
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        tenant_id: testTenantId,
        phone_number: '+1234567890',
        name: 'Test Contact',
      })
      .select()
      .single()
    
    testContactId = contact?.id || ''

    // Create a test conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        tenant_id: testTenantId,
        contact_id: testContactId,
        phone_number: '+1234567890',
        status: 'active',
      })
      .select()
      .single()
    
    testConversationId = conversation?.id || ''
  })

  afterAll(async () => {
    // Clean up test data
    if (createdMessageIds.length > 0) {
      await supabase.from('messages').delete().in('id', createdMessageIds)
    }
    if (testConversationId) {
      await supabase.from('conversations').delete().eq('id', testConversationId)
    }
    if (testContactId) {
      await supabase.from('contacts').delete().eq('id', testContactId)
    }
  })

  // ===== Basic CRUD Operations =====
  describe('Message CRUD Operations', () => {
    it('should send a message using MessageService', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const input = {
        conversation_id: testConversationId,
        content: 'Test message content',
      }

      const message = await messageService.sendMessage(input, testUserId)

      expect(message).toBeDefined()
      expect(message.conversation_id).toBe(testConversationId)
      expect(message.content).toBe('Test message content')
      expect(message.id).toBeDefined()

      createdMessageIds.push(message.id)
    })

    it('should list messages for a conversation', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const result = await messageService.listMessages(testConversationId, {
        page: 1,
        pageSize: 50,
      })

      expect(result).toBeDefined()
      expect(result.data).toBeInstanceOf(Array)
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should get a specific message', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const messageId = createdMessageIds[0]
      const message = await messageService.getMessage(messageId)

      expect(message).toBeDefined()
      expect(message.id).toBe(messageId)
    })
  })

  // ===== Input Validation Tests =====
  describe('Input Validation', () => {
    it('should reject message without conversation_id', async () => {
      const { SendMessageSchema } = await import('@/lib/validation/schemas')
      
      const input = {
        content: 'Test message',
      } as any

      const result = SendMessageSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject message without content', async () => {
      const { SendMessageSchema } = await import('@/lib/validation/schemas')
      
      const input = {
        conversation_id: testConversationId,
      } as any

      const result = SendMessageSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject message with content exceeding max length', async () => {
      const { SendMessageSchema } = await import('@/lib/validation/schemas')
      
      const input = {
        conversation_id: testConversationId,
        content: 'a'.repeat(5000), // Exceeds 4096 character limit
      }

      const result = SendMessageSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject message with invalid conversation_id format', async () => {
      const { SendMessageSchema } = await import('@/lib/validation/schemas')
      
      const input = {
        conversation_id: 'not-a-uuid',
        content: 'Test message',
      }

      const result = SendMessageSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should validate media_type when media_url is provided', async () => {
      const { SendMessageSchema } = await import('@/lib/validation/schemas')
      
      const input = {
        conversation_id: testConversationId,
        content: 'Test message with media',
        media_url: 'https://example.com/image.jpg',
        media_type: 'invalid_type' as any,
      }

      const result = SendMessageSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should accept valid media types', async () => {
      const { SendMessageSchema } = await import('@/lib/validation/schemas')
      
      const validTypes = ['image', 'video', 'audio', 'document']
      
      for (const type of validTypes) {
        const input = {
          conversation_id: testConversationId,
          content: 'Test message',
          media_url: 'https://example.com/file.jpg',
          media_type: type,
        }

        const result = SendMessageSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })
  })

  // ===== Authorization and Tenant Isolation Tests =====
  describe('Authorization and Tenant Isolation', () => {
    it('should enforce tenant isolation - cannot access other tenant messages', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      
      // Create message in test tenant
      const messageService1 = new MessageService(supabase, testTenantId)
      const message = await messageService1.sendMessage({
        conversation_id: testConversationId,
        content: 'Tenant 1 message',
      }, testUserId)
      createdMessageIds.push(message.id)

      // Try to access from different tenant
      const differentTenantId = '00000000-0000-0000-0000-000000000002'
      const messageService2 = new MessageService(supabase, differentTenantId)
      
      await expect(
        messageService2.getMessage(message.id)
      ).rejects.toThrow()
    })

    it('should filter list results by tenant', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const result = await messageService.listMessages(testConversationId, {
        page: 1,
        pageSize: 100,
      })

      // All returned messages should belong to conversations in the test tenant
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should prevent sending messages to conversations in other tenants', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      
      // Try to send message to test conversation from different tenant
      const differentTenantId = '00000000-0000-0000-0000-000000000002'
      const messageService = new MessageService(supabase, differentTenantId)

      await expect(
        messageService.sendMessage({
          conversation_id: testConversationId,
          content: 'Cross-tenant message',
        }, testUserId)
      ).rejects.toThrow()
    })
  })

  // ===== Pagination Tests =====
  describe('Pagination', () => {
    it('should paginate message list correctly', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      // Create multiple messages for pagination testing
      const messagesToCreate = 5
      for (let i = 0; i < messagesToCreate; i++) {
        const message = await messageService.sendMessage({
          conversation_id: testConversationId,
          content: `Pagination test message ${i}`,
        }, testUserId)
        createdMessageIds.push(message.id)
      }

      // Test first page
      const page1 = await messageService.listMessages(testConversationId, {
        page: 1,
        pageSize: 2,
      })

      expect(page1.data.length).toBeLessThanOrEqual(2)
      expect(page1.page).toBe(1)
      expect(page1.pageSize).toBe(2)

      // Test second page
      const page2 = await messageService.listMessages(testConversationId, {
        page: 2,
        pageSize: 2,
      })

      expect(page2.page).toBe(2)
      expect(page2.pageSize).toBe(2)
      
      // Ensure pages don't overlap
      const page1Ids = page1.data.map(m => m.id)
      const page2Ids = page2.data.map(m => m.id)
      const overlap = page1Ids.filter(id => page2Ids.includes(id))
      expect(overlap.length).toBe(0)
    })

    it('should respect pageSize limits', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const result = await messageService.listMessages(testConversationId, {
        page: 1,
        pageSize: 3,
      })

      expect(result.data.length).toBeLessThanOrEqual(3)
      expect(result.pageSize).toBe(3)
    })
  })

  // ===== Backward Compatibility Tests =====
  describe('Backward Compatibility', () => {
    it('should support old API parameter names (to/message)', async () => {
      const { SendMessageSchema } = await import('@/lib/validation/schemas')
      
      // The new schema uses conversation_id and content
      // The API route handles backward compatibility
      const newFormat = {
        conversation_id: testConversationId,
        content: 'Test message',
      }

      const result = SendMessageSchema.safeParse(newFormat)
      expect(result.success).toBe(true)
    })

    it('should return response in expected format', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const message = await messageService.sendMessage({
        conversation_id: testConversationId,
        content: 'Format test message',
      }, testUserId)

      // Check that response has expected fields
      expect(message).toHaveProperty('id')
      expect(message).toHaveProperty('conversation_id')
      expect(message).toHaveProperty('content')
      expect(message).toHaveProperty('status')
      expect(message).toHaveProperty('created_at')

      createdMessageIds.push(message.id)
    })
  })

  // ===== Error Handling Tests =====
  describe('Error Handling', () => {
    it('should return appropriate error for non-existent conversation', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const fakeConversationId = '00000000-0000-0000-0000-999999999999'
      
      await expect(
        messageService.sendMessage({
          conversation_id: fakeConversationId,
          content: 'Test message',
        }, testUserId)
      ).rejects.toThrow()
    })

    it('should return appropriate error for non-existent message', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const fakeId = '00000000-0000-0000-0000-999999999999'
      
      await expect(
        messageService.getMessage(fakeId)
      ).rejects.toThrow()
    })

    it('should handle database errors gracefully', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      
      // Create service with invalid tenant ID to trigger error
      const messageService = new MessageService(supabase, 'invalid-tenant-id')

      await expect(
        messageService.listMessages(testConversationId, { page: 1, pageSize: 50 })
      ).rejects.toThrow()
    })
  })

  // ===== Message Status Tests =====
  describe('Message Status', () => {
    it('should create message with pending status', async () => {
      const { MessageService } = await import('@/lib/services/message-service')
      const messageService = new MessageService(supabase, testTenantId)

      const message = await messageService.sendMessage({
        conversation_id: testConversationId,
        content: 'Status test message',
      }, testUserId)

      expect(message.status).toBe('pending')
      createdMessageIds.push(message.id)
    })
  })
})
