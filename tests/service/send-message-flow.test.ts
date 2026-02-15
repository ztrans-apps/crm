/**
 * Send Message Flow - Service Test
 * Test complete flow with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => ({
      data: { id: 'msg-1', status: 'pending' },
      error: null,
    })),
  })),
}

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: 'job-1' }),
}

const mockWhatsAppService = {
  sendMessage: vi.fn().mockResolvedValue({
    success: true,
    messageId: 'wa-msg-1',
  }),
}

// Service to test
class SendMessageService {
  constructor(
    private supabase: any,
    private queue: any,
    private whatsappService: any
  ) {}

  async sendMessage(data: {
    tenantId: string
    sessionId: string
    to: string
    message: string
  }) {
    // 1. Validate input
    if (!data.to || !data.message) {
      throw new Error('Missing required fields')
    }

    // 2. Save to database
    const { data: dbMessage, error } = await this.supabase
      .from('messages')
      .insert({
        tenant_id: data.tenantId,
        conversation_id: 'conv-1',
        content: data.message,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // 3. Add to queue
    const job = await this.queue.add('whatsapp-send', {
      ...data,
      messageId: dbMessage.id,
      type: 'text',
    })

    return {
      success: true,
      messageId: dbMessage.id,
      jobId: job.id,
    }
  }
}

describe('Send Message Flow - Service Test', () => {
  let service: SendMessageService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SendMessageService(mockSupabase, mockQueue, mockWhatsAppService)
  })

  describe('Complete Flow', () => {
    it('should send message through complete pipeline', async () => {
      const messageData = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        sessionId: 'session-1',
        to: '+6281234567890',
        message: 'Hello World',
      }

      const result = await service.sendMessage(messageData)

      // Verify database insert
      expect(mockSupabase.from).toHaveBeenCalledWith('messages')
      
      // Verify queue add
      expect(mockQueue.add).toHaveBeenCalledWith('whatsapp-send', expect.objectContaining({
        tenantId: messageData.tenantId,
        sessionId: messageData.sessionId,
        to: messageData.to,
        message: messageData.message,
        type: 'text',
      }))

      // Verify result
      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-1')
      expect(result.jobId).toBe('job-1')
    })

    it('should validate required fields', async () => {
      await expect(
        service.sendMessage({
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          to: '',
          message: 'Hello',
        })
      ).rejects.toThrow('Missing required fields')
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => ({
          data: null,
          error: { message: 'Database error' },
        })),
      })

      await expect(
        service.sendMessage({
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          to: '+6281234567890',
          message: 'Hello',
        })
      ).rejects.toThrow()
    })

    it('should handle queue errors', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Queue full'))

      await expect(
        service.sendMessage({
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          to: '+6281234567890',
          message: 'Hello',
        })
      ).rejects.toThrow('Queue full')
    })
  })

  describe('Tenant Isolation', () => {
    it('should include tenant_id in database insert', async () => {
      const insertSpy = vi.fn().mockReturnThis()
      mockSupabase.from.mockReturnValueOnce({
        insert: insertSpy,
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => ({
          data: { id: 'msg-1', status: 'pending' },
          error: null,
        })),
      })

      await service.sendMessage({
        tenantId: 'tenant-123',
        sessionId: 'session-1',
        to: '+6281234567890',
        message: 'Hello',
      })

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'tenant-123',
        })
      )
    })

    it('should include tenant_id in queue job', async () => {
      await service.sendMessage({
        tenantId: 'tenant-456',
        sessionId: 'session-1',
        to: '+6281234567890',
        message: 'Hello',
      })

      expect(mockQueue.add).toHaveBeenCalledWith(
        'whatsapp-send',
        expect.objectContaining({
          tenantId: 'tenant-456',
        })
      )
    })
  })
})
