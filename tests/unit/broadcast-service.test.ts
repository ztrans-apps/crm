import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BroadcastService } from '@/lib/services/broadcast-service'
import { BroadcastRepository } from '@/lib/repositories/broadcast-repository'
import { CreateBroadcastInput, UpdateBroadcastInput, BroadcastModel } from '@/lib/dto/broadcast.dto'

/**
 * Unit Tests for BroadcastService
 * 
 * Tests business logic, validation, and error handling.
 * 
 * **Requirements: 4.4, 4.7**
 */

// Mock the repository
vi.mock('@/lib/repositories/broadcast-repository')

describe('BroadcastService', () => {
  let service: BroadcastService
  let mockRepository: any
  const tenantId = 'test-tenant-id'
  const mockSupabase = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new BroadcastService(mockSupabase, tenantId)
    mockRepository = (service as any).repository
  })

  describe('createBroadcast', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const validInput: CreateBroadcastInput = {
      name: 'Test Broadcast',
      message_template: 'Hello {{name}}!',
      recipient_list_id: 'list-123',
      scheduled_at: futureDate,
    }

    it('should create a broadcast successfully', async () => {
      mockRepository.create = vi.fn().mockResolvedValue({
        id: 'broadcast-1',
        tenant_id: tenantId,
        name: validInput.name,
        message_template: validInput.message_template,
        recipient_list_id: validInput.recipient_list_id,
        status: 'draft',
        total_recipients: 0,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        scheduled_at: validInput.scheduled_at,
        started_at: null,
        completed_at: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as BroadcastModel)

      const result = await service.createBroadcast(validInput)

      expect(result).toBeDefined()
      expect(result.name).toBe(validInput.name)
      expect(result.status).toBe('draft')
      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('should reject message template exceeding max length', async () => {
      const longTemplate = 'a'.repeat(4097)
      const invalidInput: CreateBroadcastInput = {
        ...validInput,
        message_template: longTemplate,
      }

      await expect(service.createBroadcast(invalidInput)).rejects.toThrow(
        'Message template exceeds maximum length'
      )

      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should reject scheduled time in the past', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const invalidInput: CreateBroadcastInput = {
        ...validInput,
        scheduled_at: pastDate,
      }

      await expect(service.createBroadcast(invalidInput)).rejects.toThrow(
        'Scheduled time must be in the future'
      )

      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should create broadcast without scheduled time', async () => {
      const inputWithoutSchedule = {
        ...validInput,
        scheduled_at: undefined,
      }

      mockRepository.create = vi.fn().mockResolvedValue({
        id: 'broadcast-1',
        tenant_id: tenantId,
        name: inputWithoutSchedule.name,
        message_template: inputWithoutSchedule.message_template,
        recipient_list_id: inputWithoutSchedule.recipient_list_id,
        status: 'draft',
        total_recipients: 0,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        scheduled_at: null,
        started_at: null,
        completed_at: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as BroadcastModel)

      const result = await service.createBroadcast(inputWithoutSchedule)

      expect(result).toBeDefined()
      expect(result.scheduled_at).toBeNull()
    })
  })

  describe('updateBroadcast', () => {
    const broadcastId = 'broadcast-1'
    const draftBroadcast: BroadcastModel = {
      id: broadcastId,
      tenant_id: tenantId,
      name: 'Test Broadcast',
      message_template: 'Hello!',
      recipient_list_id: 'list-123',
      status: 'draft',
      total_recipients: 0,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      scheduled_at: null,
      started_at: null,
      completed_at: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const updateInput: UpdateBroadcastInput = {
      name: 'Updated Broadcast',
    }

    it('should update a draft broadcast successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(draftBroadcast)
      mockRepository.update = vi.fn().mockResolvedValue({
        ...draftBroadcast,
        ...updateInput,
        updated_at: new Date().toISOString(),
      })

      const result = await service.updateBroadcast(broadcastId, updateInput)

      expect(result).toBeDefined()
      expect(result.name).toBe(updateInput.name)
      expect(mockRepository.update).toHaveBeenCalled()
    })

    it('should reject update for non-existent broadcast', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.updateBroadcast(broadcastId, updateInput)).rejects.toThrow(
        `Broadcast with ID ${broadcastId} not found`
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should reject update for broadcast from different tenant', async () => {
      const differentTenantBroadcast = {
        ...draftBroadcast,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(differentTenantBroadcast)

      await expect(service.updateBroadcast(broadcastId, updateInput)).rejects.toThrow(
        /Tenant access violation/
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should reject update for broadcast with non-editable status', async () => {
      const sendingBroadcast = {
        ...draftBroadcast,
        status: 'sending' as const,
      }

      mockRepository.findById = vi.fn().mockResolvedValue(sendingBroadcast)

      await expect(service.updateBroadcast(broadcastId, updateInput)).rejects.toThrow(
        /Cannot update broadcast with status/
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('scheduleBroadcast', () => {
    const broadcastId = 'broadcast-1'
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const draftBroadcast: BroadcastModel = {
      id: broadcastId,
      tenant_id: tenantId,
      name: 'Test Broadcast',
      message_template: 'Hello!',
      recipient_list_id: 'list-123',
      status: 'draft',
      total_recipients: 0,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      scheduled_at: null,
      started_at: null,
      completed_at: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should schedule a draft broadcast successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(draftBroadcast)
      mockRepository.update = vi.fn().mockResolvedValue({
        ...draftBroadcast,
        status: 'scheduled',
        scheduled_at: futureDate,
        updated_at: new Date().toISOString(),
      })

      const result = await service.scheduleBroadcast(broadcastId, futureDate)

      expect(result).toBeDefined()
      expect(result.status).toBe('scheduled')
      expect(result.scheduled_at).toBe(futureDate)
      expect(mockRepository.update).toHaveBeenCalled()
    })

    it('should reject scheduling for non-draft broadcast', async () => {
      const scheduledBroadcast = {
        ...draftBroadcast,
        status: 'scheduled' as const,
      }

      mockRepository.findById = vi.fn().mockResolvedValue(scheduledBroadcast)

      await expect(service.scheduleBroadcast(broadcastId, futureDate)).rejects.toThrow(
        /Cannot schedule broadcast with status/
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should reject scheduling with past date', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      mockRepository.findById = vi.fn().mockResolvedValue(draftBroadcast)

      await expect(service.scheduleBroadcast(broadcastId, pastDate)).rejects.toThrow(
        'Scheduled time must be in the future'
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('sendBroadcast', () => {
    const broadcastId = 'broadcast-1'
    const draftBroadcast: BroadcastModel = {
      id: broadcastId,
      tenant_id: tenantId,
      name: 'Test Broadcast',
      message_template: 'Hello!',
      recipient_list_id: 'list-123',
      status: 'draft',
      total_recipients: 100,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      scheduled_at: null,
      started_at: null,
      completed_at: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should send a draft broadcast successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(draftBroadcast)
      mockRepository.updateStatus = vi.fn().mockResolvedValue({
        ...draftBroadcast,
        status: 'sending',
        started_at: new Date().toISOString(),
      })

      await service.sendBroadcast(broadcastId)

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(broadcastId, 'sending')
    })

    it('should reject sending for non-sendable broadcast', async () => {
      const completedBroadcast = {
        ...draftBroadcast,
        status: 'completed' as const,
      }

      mockRepository.findById = vi.fn().mockResolvedValue(completedBroadcast)

      await expect(service.sendBroadcast(broadcastId)).rejects.toThrow(
        /Cannot send broadcast with status/
      )

      expect(mockRepository.updateStatus).not.toHaveBeenCalled()
    })
  })

  describe('cancelBroadcast', () => {
    const broadcastId = 'broadcast-1'
    const scheduledBroadcast: BroadcastModel = {
      id: broadcastId,
      tenant_id: tenantId,
      name: 'Test Broadcast',
      message_template: 'Hello!',
      recipient_list_id: 'list-123',
      status: 'scheduled',
      total_recipients: 100,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      started_at: null,
      completed_at: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should cancel a scheduled broadcast successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(scheduledBroadcast)
      mockRepository.updateStatus = vi.fn().mockResolvedValue({
        ...scheduledBroadcast,
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })

      await service.cancelBroadcast(broadcastId)

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(broadcastId, 'cancelled')
    })

    it('should reject cancelling for non-cancellable broadcast', async () => {
      const completedBroadcast = {
        ...scheduledBroadcast,
        status: 'completed' as const,
      }

      mockRepository.findById = vi.fn().mockResolvedValue(completedBroadcast)

      await expect(service.cancelBroadcast(broadcastId)).rejects.toThrow(
        /Cannot cancel broadcast with status/
      )

      expect(mockRepository.updateStatus).not.toHaveBeenCalled()
    })
  })

  describe('deleteBroadcast', () => {
    const broadcastId = 'broadcast-1'
    const draftBroadcast: BroadcastModel = {
      id: broadcastId,
      tenant_id: tenantId,
      name: 'Test Broadcast',
      message_template: 'Hello!',
      recipient_list_id: 'list-123',
      status: 'draft',
      total_recipients: 0,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      scheduled_at: null,
      started_at: null,
      completed_at: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should delete a draft broadcast successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(draftBroadcast)
      mockRepository.delete = vi.fn().mockResolvedValue(draftBroadcast)

      await service.deleteBroadcast(broadcastId)

      expect(mockRepository.delete).toHaveBeenCalledWith(broadcastId)
    })

    it('should reject deleting scheduled broadcast', async () => {
      const scheduledBroadcast = {
        ...draftBroadcast,
        status: 'scheduled' as const,
      }

      mockRepository.findById = vi.fn().mockResolvedValue(scheduledBroadcast)

      await expect(service.deleteBroadcast(broadcastId)).rejects.toThrow(
        /Cannot delete broadcast with status/
      )

      expect(mockRepository.delete).not.toHaveBeenCalled()
    })

    it('should reject deleting sending broadcast', async () => {
      const sendingBroadcast = {
        ...draftBroadcast,
        status: 'sending' as const,
      }

      mockRepository.findById = vi.fn().mockResolvedValue(sendingBroadcast)

      await expect(service.deleteBroadcast(broadcastId)).rejects.toThrow(
        /Cannot delete broadcast with status/
      )

      expect(mockRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('getBroadcastStats', () => {
    const broadcastId = 'broadcast-1'
    const completedBroadcast: BroadcastModel = {
      id: broadcastId,
      tenant_id: tenantId,
      name: 'Test Broadcast',
      message_template: 'Hello!',
      recipient_list_id: 'list-123',
      status: 'completed',
      total_recipients: 100,
      sent_count: 100,
      delivered_count: 95,
      failed_count: 5,
      scheduled_at: null,
      started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should get broadcast statistics successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(completedBroadcast)

      const result = await service.getBroadcastStats(broadcastId)

      expect(result).toBeDefined()
      expect(result.total_recipients).toBe(100)
      expect(result.sent_count).toBe(100)
      expect(result.delivered_count).toBe(95)
      expect(result.failed_count).toBe(5)
      expect(result.success_rate).toBeGreaterThan(0)
    })

    it('should reject stats for non-existent broadcast', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.getBroadcastStats(broadcastId)).rejects.toThrow(
        `Broadcast with ID ${broadcastId} not found`
      )
    })
  })
})
