/**
 * Unit tests for query projection optimization
 * 
 * **Validates: Requirement 12.3**
 * 
 * Tests that repository methods support field selection to fetch only required fields
 * instead of using SELECT * queries.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { ContactRepository } from '@/lib/repositories/contact-repository'
import { MessageRepository } from '@/lib/repositories/message-repository'
import { BroadcastRepository } from '@/lib/repositories/broadcast-repository'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

describe('Query Projection Optimization - Requirement 12.3', () => {
  const mockTenantId = 'test-tenant-123'
  let mockSupabase: any
  let mockQuery: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock query chain
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      or: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    }

    // Mock the final query execution for cursor pagination
    mockQuery.limit.mockImplementation(() => ({
      ...mockQuery,
      then: (resolve: any) => resolve({ data: [], error: null }),
    }))

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQuery),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  describe('ContactRepository', () => {
    it('should use field selection in findById when fields are provided', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'phone_number']

      await repository.findById('contact-123', fields)

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,phone_number')
    })

    it('should use SELECT * in findById when no fields are provided', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)

      await repository.findById('contact-123')

      expect(mockQuery.select).toHaveBeenCalledWith('*')
    })

    it('should use field selection in findByPhoneNumber', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'email']

      await repository.findByPhoneNumber('+1234567890', fields)

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,email')
    })

    it('should use field selection in findByEmail', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'phone_number']

      await repository.findByEmail('test@example.com', fields)

      expect(mockQuery.select).toHaveBeenCalledWith('id,phone_number')
    })

    it('should use field selection in search', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'phone_number']

      await repository.search('john', { fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,phone_number', { count: 'exact' })
    })

    it('should use field selection in findByTags', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'tags']

      await repository.findByTags(['vip', 'customer'], { fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,tags', { count: 'exact' })
    })

    it('should use field selection in findAll', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name']

      await repository.findAll({ fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name', { count: 'exact' })
    })

    it('should use field selection in findAllCursor', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'created_at']

      await repository.findAllCursor({ fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,created_at')
    })
  })

  describe('MessageRepository', () => {
    it('should use field selection in findByConversation', async () => {
      const repository = new MessageRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'content', 'created_at']

      await repository.findByConversation('conv-123', { fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,content,created_at', { count: 'exact' })
    })

    it('should use field selection in findUnread', async () => {
      const repository = new MessageRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'content', 'sender_id']

      await repository.findUnread('conv-123', fields)

      expect(mockQuery.select).toHaveBeenCalledWith('id,content,sender_id')
    })

    it('should use field selection in findByStatus', async () => {
      const repository = new MessageRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'status', 'created_at']

      await repository.findByStatus('sent', { fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,status,created_at', { count: 'exact' })
    })

    it('should use field selection in findLatestByConversation', async () => {
      const repository = new MessageRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'content']

      await repository.findLatestByConversation('conv-123', fields)

      expect(mockQuery.select).toHaveBeenCalledWith('id,content')
    })
  })

  describe('BroadcastRepository', () => {
    it('should use field selection in findScheduled', async () => {
      const repository = new BroadcastRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'scheduled_at']

      await repository.findScheduled(fields)

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,scheduled_at')
    })

    it('should use field selection in findByStatus', async () => {
      const repository = new BroadcastRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'status']

      await repository.findByStatus('completed', { fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,status', { count: 'exact' })
    })

    it('should use field selection in findScheduledBetween', async () => {
      const repository = new BroadcastRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'scheduled_at']

      await repository.findScheduledBetween('2024-01-01', '2024-12-31', { fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,scheduled_at', { count: 'exact' })
    })

    it('should use field selection in findActive', async () => {
      const repository = new BroadcastRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'started_at']

      await repository.findActive(fields)

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,started_at')
    })

    it('should use field selection in getBroadcastRecipients', async () => {
      // Mock findById to return a broadcast
      mockQuery.single.mockResolvedValueOnce({
        data: { id: 'broadcast-123', tenant_id: mockTenantId },
        error: null,
      })

      const repository = new BroadcastRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'contact_id', 'status']

      await repository.getBroadcastRecipients('broadcast-123', { fields })

      // Should be called twice: once for findById, once for recipients
      expect(mockQuery.select).toHaveBeenCalledWith('id,contact_id,status', { count: 'exact' })
    })
  })

  describe('BaseRepository field selection helper', () => {
    it('should return "*" when no fields are provided', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)

      await repository.findAll()

      expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact' })
    })

    it('should return "*" when empty array is provided', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)

      await repository.findAll({ fields: [] })

      expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact' })
    })

    it('should join multiple fields with commas', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id', 'name', 'email', 'phone_number', 'created_at']

      await repository.findAll({ fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name,email,phone_number,created_at', { count: 'exact' })
    })

    it('should handle single field selection', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      const fields = ['id']

      await repository.findAll({ fields })

      expect(mockQuery.select).toHaveBeenCalledWith('id', { count: 'exact' })
    })
  })

  describe('Performance optimization validation', () => {
    it('should avoid SELECT * when specific fields are needed', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      
      // Simulate fetching only IDs for a list operation
      await repository.findAll({ fields: ['id'] })

      // Verify we're not using SELECT *
      expect(mockQuery.select).not.toHaveBeenCalledWith('*', expect.anything())
      expect(mockQuery.select).toHaveBeenCalledWith('id', { count: 'exact' })
    })

    it('should support field selection with pagination', async () => {
      const repository = new MessageRepository(mockSupabase, mockTenantId)
      
      await repository.findByConversation('conv-123', {
        page: 1,
        pageSize: 20,
        fields: ['id', 'content', 'created_at'],
      })

      expect(mockQuery.select).toHaveBeenCalledWith('id,content,created_at', { count: 'exact' })
    })

    it('should support field selection with sorting', async () => {
      const repository = new ContactRepository(mockSupabase, mockTenantId)
      
      await repository.search('test', {
        fields: ['id', 'name'],
        sort: { field: 'name', direction: 'asc' },
      })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name', { count: 'exact' })
    })
  })
})
