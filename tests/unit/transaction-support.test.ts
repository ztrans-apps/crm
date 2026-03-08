import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository } from '@/lib/repositories/base-repository'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Test repository implementation
interface TestModel {
  id: string
  tenant_id: string
  name: string
  value: number
  created_at: string
}

class TestRepository extends BaseRepository<TestModel> {
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId, 'test_table')
  }
}

describe('Transaction Support', () => {
  let mockSupabase: any
  let repository: TestRepository
  const tenantId = 'test-tenant-123'

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }

    repository = new TestRepository(mockSupabase as any, tenantId)
  })

  describe('withTransaction', () => {
    it('should execute callback successfully', async () => {
      const callback = vi.fn().mockResolvedValue({ success: true })

      const result = await repository.withTransaction(callback)

      expect(result).toEqual({ success: true })
      expect(callback).toHaveBeenCalledWith(mockSupabase)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should pass supabase client to callback', async () => {
      let receivedClient: any = null

      await repository.withTransaction(async (client) => {
        receivedClient = client
        return { success: true }
      })

      expect(receivedClient).toBe(mockSupabase)
    })

    it('should propagate errors from callback', async () => {
      const callback = vi.fn().mockRejectedValue(new Error('Transaction failed'))

      await expect(repository.withTransaction(callback)).rejects.toThrow(
        'Transaction failed'
      )
    })

    it('should log transaction errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const callback = vi.fn().mockRejectedValue(new Error('Transaction failed'))

      await expect(repository.withTransaction(callback)).rejects.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Transaction Error]',
        expect.objectContaining({
          table: 'test_table',
          tenantId,
          error: 'Transaction failed',
        })
      )

      consoleSpy.mockRestore()
    })

    it('should handle non-Error exceptions', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const callback = vi.fn().mockRejectedValue('String error')

      await expect(repository.withTransaction(callback)).rejects.toBe('String error')

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Transaction Error]',
        expect.objectContaining({
          error: 'Unknown error',
        })
      )

      consoleSpy.mockRestore()
    })

    it('should support complex multi-step operations', async () => {
      const mockRecord1 = {
        id: 'id-1',
        tenant_id: tenantId,
        name: 'Record 1',
        value: 100,
        created_at: new Date().toISOString(),
      }

      const mockRecord2 = {
        id: 'id-2',
        tenant_id: tenantId,
        name: 'Record 2',
        value: 200,
        created_at: new Date().toISOString(),
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockRecord1, error: null })
        .mockResolvedValueOnce({ data: mockRecord2, error: null })

      const result = await repository.withTransaction(async (client) => {
        // Simulate creating two related records
        const record1 = await repository.create({ name: 'Record 1', value: 100 })
        const record2 = await repository.create({ name: 'Record 2', value: 200 })

        return { record1, record2 }
      })

      expect(result).toHaveProperty('record1')
      expect(result).toHaveProperty('record2')
    })

    it('should allow nested transactions', async () => {
      const outerCallback = vi.fn(async (client) => {
        return await repository.withTransaction(async (innerClient) => {
          return { nested: true }
        })
      })

      const result = await repository.withTransaction(outerCallback)

      expect(result).toEqual({ nested: true })
      expect(outerCallback).toHaveBeenCalledTimes(1)
    })

    it('should return callback result', async () => {
      const complexResult = {
        id: 'test-id',
        data: [1, 2, 3],
        metadata: { count: 3 },
      }

      const result = await repository.withTransaction(async () => {
        return complexResult
      })

      expect(result).toEqual(complexResult)
    })

    it('should handle async operations in callback', async () => {
      const result = await repository.withTransaction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return { delayed: true }
      })

      expect(result).toEqual({ delayed: true })
    })
  })

  describe('Transaction Use Cases', () => {
    it('should handle create-update sequence', async () => {
      const mockCreated = {
        id: 'id-1',
        tenant_id: tenantId,
        name: 'Initial',
        value: 100,
        created_at: new Date().toISOString(),
      }

      const mockUpdated = {
        ...mockCreated,
        name: 'Updated',
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockCreated, error: null })
        .mockResolvedValueOnce({ data: mockUpdated, error: null })

      const result = await repository.withTransaction(async () => {
        const created = await repository.create({ name: 'Initial', value: 100 })
        const updated = await repository.update(created.id, { name: 'Updated' })
        return updated
      })

      expect(result.name).toBe('Updated')
    })

    it('should handle batch operations in transaction', async () => {
      const records = [
        { name: 'Record 1', value: 100 },
        { name: 'Record 2', value: 200 },
      ]

      const mockCreated = records.map((r, i) => ({
        id: `id-${i}`,
        tenant_id: tenantId,
        ...r,
        created_at: new Date().toISOString(),
      }))

      mockSupabase.select.mockResolvedValue({
        data: mockCreated,
        error: null,
      })

      const result = await repository.withTransaction(async () => {
        return await repository.batchInsert(records)
      })

      expect(result).toHaveLength(2)
    })

    it('should rollback on error in multi-step operation', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'id-1', name: 'Record 1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Second operation failed'),
        })

      await expect(
        repository.withTransaction(async () => {
          await repository.create({ name: 'Record 1', value: 100 })
          await repository.create({ name: 'Record 2', value: 200 })
        })
      ).rejects.toThrow('Second operation failed')

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Transaction Error]',
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Transaction Performance', () => {
    it('should complete fast transactions without logging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await repository.withTransaction(async () => {
        return { success: true }
      })

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle long-running transactions', async () => {
      const result = await repository.withTransaction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        return { longRunning: true }
      })

      expect(result).toEqual({ longRunning: true })
    })
  })
})
