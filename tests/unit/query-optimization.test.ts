/**
 * Unit tests for query optimization
 * 
 * **Validates: Requirements 12.2, 12.3, 12.9**
 * 
 * Tests pagination, field projection, and batch operations to ensure
 * database queries are optimized for performance.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository, PAGINATION_DEFAULTS } from '@/lib/repositories/base-repository'
import { ContactRepository } from '@/lib/repositories/contact-repository'
import { MessageRepository } from '@/lib/repositories/message-repository'
import { BroadcastRepository } from '@/lib/repositories/broadcast-repository'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Test model interface
interface TestModel {
  id: string
  tenant_id: string
  name: string
  value: number
  created_at: string
}

// Test repository implementation
class TestRepository extends BaseRepository<TestModel> {
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId, 'test_table')
  }
}

describe('Query Optimization - Requirements 12.2, 12.3, 12.9', () => {
  const mockTenantId = 'test-tenant-123'
  let mockSupabase: any
  let mockQuery: any
  let repository: TestRepository

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock query chain
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
    }

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQuery),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
    repository = new TestRepository(mockSupabase, mockTenantId)
  })

  describe('Requirement 12.2: Pagination with Different Page Sizes', () => {
    it('should paginate with default page size of 50', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: `id-${i}`,
        tenant_id: mockTenantId,
        name: `Item ${i}`,
        value: i,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 150,
      })

      const result = await repository.findAll()

      expect(result.pageSize).toBe(PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE)
      expect(result.pageSize).toBe(50)
      expect(result.data).toHaveLength(50)
      expect(mockQuery.range).toHaveBeenCalledWith(0, 49)
    })

    it('should paginate with custom page size of 10', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i}`,
        tenant_id: mockTenantId,
        name: `Item ${i}`,
        value: i,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 100,
      })

      const result = await repository.findAll({ pageSize: 10 })

      expect(result.pageSize).toBe(10)
      expect(result.data).toHaveLength(10)
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9)
    })

    it('should paginate with custom page size of 25', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        id: `id-${i}`,
        tenant_id: mockTenantId,
        name: `Item ${i}`,
        value: i,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 100,
      })

      const result = await repository.findAll({ pageSize: 25 })

      expect(result.pageSize).toBe(25)
      expect(result.data).toHaveLength(25)
      expect(mockQuery.range).toHaveBeenCalledWith(0, 24)
    })

    it('should paginate with custom page size of 75', async () => {
      const mockData = Array.from({ length: 75 }, (_, i) => ({
        id: `id-${i}`,
        tenant_id: mockTenantId,
        name: `Item ${i}`,
        value: i,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 200,
      })

      const result = await repository.findAll({ pageSize: 75 })

      expect(result.pageSize).toBe(75)
      expect(result.data).toHaveLength(75)
      expect(mockQuery.range).toHaveBeenCalledWith(0, 74)
    })

    it('should enforce maximum page size of 100', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        tenant_id: mockTenantId,
        name: `Item ${i}`,
        value: i,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 500,
      })

      // Request 200 but should be capped at 100
      const result = await repository.findAll({ pageSize: 200 })

      expect(result.pageSize).toBe(PAGINATION_DEFAULTS.MAX_PAGE_SIZE)
      expect(result.pageSize).toBe(100)
      expect(mockQuery.range).toHaveBeenCalledWith(0, 99)
    })

    it('should paginate second page correctly', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: `id-${i + 50}`,
        tenant_id: mockTenantId,
        name: `Item ${i + 50}`,
        value: i + 50,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 150,
      })

      const result = await repository.findAll({ page: 2, pageSize: 50 })

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(50)
      expect(mockQuery.range).toHaveBeenCalledWith(50, 99)
    })

    it('should paginate third page with custom page size', async () => {
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        id: `id-${i + 40}`,
        tenant_id: mockTenantId,
        name: `Item ${i + 40}`,
        value: i + 40,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 100,
      })

      const result = await repository.findAll({ page: 3, pageSize: 20 })

      expect(result.page).toBe(3)
      expect(result.pageSize).toBe(20)
      expect(mockQuery.range).toHaveBeenCalledWith(40, 59)
    })

    it('should indicate hasMore correctly when more pages exist', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: `id-${i}`,
        tenant_id: mockTenantId,
        name: `Item ${i}`,
        value: i,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 150,
      })

      const result = await repository.findAll({ page: 1, pageSize: 50 })

      expect(result.hasMore).toBe(true)
      expect(result.total).toBe(150)
    })

    it('should indicate hasMore false on last page', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        id: `id-${i + 100}`,
        tenant_id: mockTenantId,
        name: `Item ${i + 100}`,
        value: i + 100,
        created_at: new Date().toISOString(),
      }))

      mockQuery.range.mockResolvedValue({
        data: mockData,
        error: null,
        count: 125,
      })

      const result = await repository.findAll({ page: 3, pageSize: 50 })

      expect(result.hasMore).toBe(false)
      expect(result.total).toBe(125)
    })

    it('should handle cursor-based pagination with different page sizes', async () => {
      const mockData = Array.from({ length: 21 }, (_, i) => ({
        id: `id-${i}`,
        tenant_id: mockTenantId,
        name: `Item ${i}`,
        value: i,
        created_at: new Date().toISOString(),
      }))

      mockQuery.limit.mockImplementation(() => ({
        ...mockQuery,
        then: (resolve: any) => resolve({ data: mockData, error: null }),
      }))

      const result = await repository.findAllCursor({ pageSize: 20 })

      expect(result.pageSize).toBe(20)
      expect(result.data).toHaveLength(20)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBeTruthy()
      expect(mockQuery.limit).toHaveBeenCalledWith(21) // pageSize + 1
    })
  })

  describe('Requirement 12.3: Field Projection', () => {
    it('should select only requested fields (id, name)', async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: 'id-1', name: 'Test' },
        error: null,
      })

      await repository.findById('id-1', ['id', 'name'])

      expect(mockQuery.select).toHaveBeenCalledWith('id,name')
    })

    it('should select only requested fields (id, value, created_at)', async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: 'id-1', value: 100, created_at: '2024-01-01' },
        error: null,
      })

      await repository.findById('id-1', ['id', 'value', 'created_at'])

      expect(mockQuery.select).toHaveBeenCalledWith('id,value,created_at')
    })

    it('should select all fields when no fields specified', async () => {
      mockQuery.single.mockResolvedValue({
        data: {
          id: 'id-1',
          tenant_id: mockTenantId,
          name: 'Test',
          value: 100,
          created_at: '2024-01-01',
        },
        error: null,
      })

      await repository.findById('id-1')

      expect(mockQuery.select).toHaveBeenCalledWith('*')
    })

    it('should use field projection in findAll queries', async () => {
      mockQuery.range.mockResolvedValue({
        data: [
          { id: 'id-1', name: 'Item 1' },
          { id: 'id-2', name: 'Item 2' },
        ],
        error: null,
        count: 2,
      })

      await repository.findAll({ fields: ['id', 'name'] })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name', { count: 'exact' })
    })

    it('should use field projection in cursor pagination', async () => {
      mockQuery.limit.mockImplementation(() => ({
        ...mockQuery,
        then: (resolve: any) =>
          resolve({
            data: [
              { id: 'id-1', name: 'Item 1' },
              { id: 'id-2', name: 'Item 2' },
            ],
            error: null,
          }),
      }))

      await repository.findAllCursor({ fields: ['id', 'name'] })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name')
    })

    it('should optimize queries by selecting minimal fields', async () => {
      mockQuery.range.mockResolvedValue({
        data: [{ id: 'id-1' }, { id: 'id-2' }, { id: 'id-3' }],
        error: null,
        count: 3,
      })

      // Only need IDs for a list operation
      await repository.findAll({ fields: ['id'] })

      expect(mockQuery.select).toHaveBeenCalledWith('id', { count: 'exact' })
      expect(mockQuery.select).not.toHaveBeenCalledWith('*', expect.anything())
    })

    it('should combine field projection with pagination', async () => {
      mockQuery.range.mockResolvedValue({
        data: [
          { id: 'id-1', name: 'Item 1' },
          { id: 'id-2', name: 'Item 2' },
        ],
        error: null,
        count: 100,
      })

      await repository.findAll({
        page: 2,
        pageSize: 25,
        fields: ['id', 'name'],
      })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name', { count: 'exact' })
      expect(mockQuery.range).toHaveBeenCalledWith(25, 49)
    })

    it('should combine field projection with sorting', async () => {
      mockQuery.range.mockResolvedValue({
        data: [
          { id: 'id-1', name: 'A' },
          { id: 'id-2', name: 'B' },
        ],
        error: null,
        count: 2,
      })

      await repository.findAll({
        fields: ['id', 'name'],
        sort: { field: 'name', direction: 'asc' },
      })

      expect(mockQuery.select).toHaveBeenCalledWith('id,name', { count: 'exact' })
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true })
    })
  })

  describe('Requirement 12.9: Batch Operations', () => {
    describe('Batch Insert', () => {
      it('should insert multiple records in a single operation', async () => {
        const records = [
          { name: 'Item 1', value: 100 },
          { name: 'Item 2', value: 200 },
          { name: 'Item 3', value: 300 },
        ]

        const mockCreated = records.map((r, i) => ({
          id: `id-${i}`,
          tenant_id: mockTenantId,
          ...r,
          created_at: new Date().toISOString(),
        }))

        mockQuery.select.mockResolvedValue({
          data: mockCreated,
          error: null,
        })

        const result = await repository.batchInsert(records)

        expect(result).toHaveLength(3)
        expect(mockQuery.insert).toHaveBeenCalledTimes(1)
        expect(mockQuery.insert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: 'Item 1', tenant_id: mockTenantId }),
            expect.objectContaining({ name: 'Item 2', tenant_id: mockTenantId }),
            expect.objectContaining({ name: 'Item 3', tenant_id: mockTenantId }),
          ])
        )
      })

      it('should handle large batch inserts with chunking', async () => {
        const records = Array.from({ length: 2500 }, (_, i) => ({
          name: `Item ${i}`,
          value: i,
        }))

        const mockCreated = records.map((r, i) => ({
          id: `id-${i}`,
          tenant_id: mockTenantId,
          ...r,
          created_at: new Date().toISOString(),
        }))

        // Mock multiple insert calls for chunks
        mockQuery.select
          .mockResolvedValueOnce({
            data: mockCreated.slice(0, 1000),
            error: null,
          })
          .mockResolvedValueOnce({
            data: mockCreated.slice(1000, 2000),
            error: null,
          })
          .mockResolvedValueOnce({
            data: mockCreated.slice(2000, 2500),
            error: null,
          })

        const result = await repository.batchInsert(records)

        expect(result).toHaveLength(2500)
        expect(mockQuery.insert).toHaveBeenCalledTimes(3) // 3 chunks of 1000
      })

      it('should handle empty batch insert', async () => {
        const result = await repository.batchInsert([])

        expect(result).toHaveLength(0)
        expect(mockQuery.insert).not.toHaveBeenCalled()
      })

      it('should add tenant_id to all batch insert records', async () => {
        const records = [
          { name: 'Item 1', value: 100 },
          { name: 'Item 2', value: 200 },
        ]

        mockQuery.select.mockResolvedValue({
          data: [],
          error: null,
        })

        await repository.batchInsert(records)

        expect(mockQuery.insert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ tenant_id: mockTenantId }),
            expect.objectContaining({ tenant_id: mockTenantId }),
          ])
        )
      })

      it('should log warning for slow batch inserts', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const records = [{ name: 'Item 1', value: 100 }]

        mockQuery.select.mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: [], error: null })
            }, 1100) // Simulate slow operation
          })
        })

        await repository.batchInsert(records)

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Slow Batch Insert]',
          expect.objectContaining({
            table: 'test_table',
            tenantId: mockTenantId,
            recordCount: 1,
          })
        )

        consoleSpy.mockRestore()
      })
    })

    describe('Batch Update', () => {
      it('should update multiple records efficiently', async () => {
        const updates = [
          { id: 'id-1', data: { name: 'Updated 1' } },
          { id: 'id-2', data: { name: 'Updated 2' } },
          { id: 'id-3', data: { name: 'Updated 3' } },
        ]

        mockQuery.single
          .mockResolvedValueOnce({
            data: { id: 'id-1', name: 'Updated 1' },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { id: 'id-2', name: 'Updated 2' },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { id: 'id-3', name: 'Updated 3' },
            error: null,
          })

        await repository.batchUpdate(updates)

        expect(mockQuery.update).toHaveBeenCalledTimes(3)
        expect(mockQuery.update).toHaveBeenCalledWith({ name: 'Updated 1' })
        expect(mockQuery.update).toHaveBeenCalledWith({ name: 'Updated 2' })
        expect(mockQuery.update).toHaveBeenCalledWith({ name: 'Updated 3' })
      })

      it('should handle empty batch update', async () => {
        await repository.batchUpdate([])

        expect(mockQuery.update).not.toHaveBeenCalled()
      })

      it('should execute updates with concurrency limit', async () => {
        const updates = Array.from({ length: 25 }, (_, i) => ({
          id: `id-${i}`,
          data: { name: `Updated ${i}` },
        }))

        mockQuery.single.mockResolvedValue({
          data: { id: 'test', name: 'Updated' },
          error: null,
        })

        await repository.batchUpdate(updates, 5) // Concurrency of 5

        expect(mockQuery.update).toHaveBeenCalledTimes(25)
      })

      it('should log warning for slow batch updates', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const updates = [{ id: 'id-1', data: { name: 'Updated' } }]

        mockQuery.single.mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: { id: 'id-1', name: 'Updated' }, error: null })
            }, 1100)
          })
        })

        await repository.batchUpdate(updates)

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Slow Batch Update]',
          expect.objectContaining({
            table: 'test_table',
            tenantId: mockTenantId,
            updateCount: 1,
          })
        )

        consoleSpy.mockRestore()
      })

      it('should enforce tenant isolation in batch updates', async () => {
        const updates = [
          { id: 'id-1', data: { name: 'Updated 1' } },
          { id: 'id-2', data: { name: 'Updated 2' } },
        ]

        mockQuery.single.mockResolvedValue({
          data: { id: 'test', name: 'Updated' },
          error: null,
        })

        await repository.batchUpdate(updates)

        // Verify tenant filter is applied to each update
        expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
      })
    })

    describe('Batch Delete', () => {
      it('should delete multiple records in a single operation', async () => {
        const ids = ['id-1', 'id-2', 'id-3']

        mockQuery.select.mockResolvedValue({
          data: [
            { id: 'id-1', name: 'Item 1' },
            { id: 'id-2', name: 'Item 2' },
            { id: 'id-3', name: 'Item 3' },
          ],
          error: null,
        })

        const result = await repository.batchDelete(ids)

        expect(result).toBe(3)
        expect(mockQuery.delete).toHaveBeenCalledTimes(1)
        expect(mockQuery.in).toHaveBeenCalledWith('id', ids)
      })

      it('should handle empty batch delete', async () => {
        const result = await repository.batchDelete([])

        expect(result).toBe(0)
        expect(mockQuery.delete).not.toHaveBeenCalled()
      })

      it('should enforce tenant isolation in batch delete', async () => {
        const ids = ['id-1', 'id-2']

        mockQuery.select.mockResolvedValue({
          data: [{ id: 'id-1' }, { id: 'id-2' }],
          error: null,
        })

        await repository.batchDelete(ids)

        expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', mockTenantId)
      })

      it('should log warning for slow batch deletes', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const ids = ['id-1']

        mockQuery.select.mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: [{ id: 'id-1' }], error: null })
            }, 1100)
          })
        })

        await repository.batchDelete(ids)

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Slow Batch Delete]',
          expect.objectContaining({
            table: 'test_table',
            tenantId: mockTenantId,
            deleteCount: 1,
          })
        )

        consoleSpy.mockRestore()
      })

      it('should return actual deleted count', async () => {
        const ids = ['id-1', 'id-2', 'id-3', 'id-4', 'id-5']

        // Only 3 records actually deleted (maybe 2 didn't exist)
        mockQuery.select.mockResolvedValue({
          data: [{ id: 'id-1' }, { id: 'id-2' }, { id: 'id-3' }],
          error: null,
        })

        const result = await repository.batchDelete(ids)

        expect(result).toBe(3)
      })
    })

    describe('Batch Operations Performance', () => {
      it('should be more efficient than individual operations', async () => {
        const records = Array.from({ length: 100 }, (_, i) => ({
          name: `Item ${i}`,
          value: i,
        }))

        mockQuery.select.mockResolvedValue({
          data: records.map((r, i) => ({
            id: `id-${i}`,
            tenant_id: mockTenantId,
            ...r,
            created_at: new Date().toISOString(),
          })),
          error: null,
        })

        await repository.batchInsert(records)

        // Should be called once (or minimal times for chunking), not 100 times
        expect(mockQuery.insert).toHaveBeenCalledTimes(1)
      })

      it('should handle mixed batch operations', async () => {
        // Insert batch
        const insertRecords = [
          { name: 'New 1', value: 1 },
          { name: 'New 2', value: 2 },
        ]

        mockQuery.select.mockResolvedValueOnce({
          data: insertRecords.map((r, i) => ({
            id: `new-${i}`,
            tenant_id: mockTenantId,
            ...r,
            created_at: new Date().toISOString(),
          })),
          error: null,
        })

        await repository.batchInsert(insertRecords)

        // Update batch
        const updateRecords = [
          { id: 'id-1', data: { name: 'Updated 1' } },
          { id: 'id-2', data: { name: 'Updated 2' } },
        ]

        mockQuery.single.mockResolvedValue({
          data: { id: 'test', name: 'Updated' },
          error: null,
        })

        await repository.batchUpdate(updateRecords)

        // Delete batch
        mockQuery.select.mockResolvedValueOnce({
          data: [{ id: 'id-3' }],
          error: null,
        })

        await repository.batchDelete(['id-3'])

        expect(mockQuery.insert).toHaveBeenCalled()
        expect(mockQuery.update).toHaveBeenCalled()
        expect(mockQuery.delete).toHaveBeenCalled()
      })
    })
  })

  describe('Integration: Pagination + Field Projection + Batch Operations', () => {
    it('should combine pagination with field projection', async () => {
      mockQuery.range.mockResolvedValue({
        data: [
          { id: 'id-1', name: 'Item 1' },
          { id: 'id-2', name: 'Item 2' },
        ],
        error: null,
        count: 100,
      })

      const result = await repository.findAll({
        page: 2,
        pageSize: 25,
        fields: ['id', 'name'],
      })

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(25)
      expect(mockQuery.select).toHaveBeenCalledWith('id,name', { count: 'exact' })
      expect(mockQuery.range).toHaveBeenCalledWith(25, 49)
    })

    it('should use field projection in batch operations', async () => {
      const records = [
        { name: 'Item 1', value: 100 },
        { name: 'Item 2', value: 200 },
      ]

      mockQuery.select.mockResolvedValue({
        data: records.map((r, i) => ({
          id: `id-${i}`,
          tenant_id: mockTenantId,
          ...r,
          created_at: new Date().toISOString(),
        })),
        error: null,
      })

      const result = await repository.batchInsert(records)

      // Batch insert should return full records
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('value')
    })

    it('should optimize large dataset queries with all features', async () => {
      // Simulate fetching a large dataset with:
      // - Cursor pagination (efficient for large datasets)
      // - Field projection (only needed fields)
      // - Sorting

      mockQuery.limit.mockImplementation(() => ({
        ...mockQuery,
        then: (resolve: any) =>
          resolve({
            data: Array.from({ length: 51 }, (_, i) => ({
              id: `id-${i}`,
              name: `Item ${i}`,
            })),
            error: null,
          }),
      }))

      const result = await repository.findAllCursor({
        pageSize: 50,
        fields: ['id', 'name'],
        sort: { field: 'name', direction: 'asc' },
      })

      expect(result.data).toHaveLength(50)
      expect(result.hasMore).toBe(true)
      expect(mockQuery.select).toHaveBeenCalledWith('id,name')
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(mockQuery.limit).toHaveBeenCalledWith(51) // pageSize + 1
    })
  })

  describe('Real-World Repository Tests', () => {
    describe('ContactRepository', () => {
      let contactRepository: ContactRepository

      beforeEach(() => {
        contactRepository = new ContactRepository(mockSupabase, mockTenantId)
      })

      it('should use pagination in search', async () => {
        mockQuery.range.mockResolvedValue({
          data: [
            { id: 'id-1', name: 'John Doe', phone_number: '+1234567890' },
            { id: 'id-2', name: 'Jane Doe', phone_number: '+0987654321' },
          ],
          error: null,
          count: 50,
        })

        const result = await contactRepository.search('Doe', {
          page: 1,
          pageSize: 25,
        })

        expect(result.pageSize).toBe(25)
        expect(mockQuery.range).toHaveBeenCalledWith(0, 24)
      })

      it('should use field projection in search', async () => {
        mockQuery.range.mockResolvedValue({
          data: [
            { id: 'id-1', name: 'John Doe' },
            { id: 'id-2', name: 'Jane Doe' },
          ],
          error: null,
          count: 2,
        })

        await contactRepository.search('Doe', {
          fields: ['id', 'name'],
        })

        expect(mockQuery.select).toHaveBeenCalledWith('id,name', { count: 'exact' })
      })

      it('should use batch insert for bulk contacts', async () => {
        const contacts = [
          { name: 'Contact 1', phone_number: '+1111111111' },
          { name: 'Contact 2', phone_number: '+2222222222' },
          { name: 'Contact 3', phone_number: '+3333333333' },
        ]

        mockQuery.select.mockResolvedValue({
          data: contacts.map((c, i) => ({
            id: `id-${i}`,
            tenant_id: mockTenantId,
            ...c,
            created_at: new Date().toISOString(),
          })),
          error: null,
        })

        const result = await contactRepository.bulkCreate(contacts)

        expect(result).toHaveLength(3)
        expect(mockQuery.insert).toHaveBeenCalledTimes(1)
      })
    })

    describe('MessageRepository', () => {
      let messageRepository: MessageRepository

      beforeEach(() => {
        messageRepository = new MessageRepository(mockSupabase, mockTenantId)
      })

      it('should use pagination in findByConversation', async () => {
        mockQuery.range.mockResolvedValue({
          data: [
            { id: 'msg-1', content: 'Hello', conversation_id: 'conv-1' },
            { id: 'msg-2', content: 'Hi', conversation_id: 'conv-1' },
          ],
          error: null,
          count: 100,
        })

        const result = await messageRepository.findByConversation('conv-1', {
          page: 1,
          pageSize: 20,
        })

        expect(result.pageSize).toBe(20)
        expect(mockQuery.range).toHaveBeenCalledWith(0, 19)
      })

      it('should use field projection in findByConversation', async () => {
        mockQuery.range.mockResolvedValue({
          data: [
            { id: 'msg-1', content: 'Hello', created_at: '2024-01-01' },
            { id: 'msg-2', content: 'Hi', created_at: '2024-01-02' },
          ],
          error: null,
          count: 2,
        })

        await messageRepository.findByConversation('conv-1', {
          fields: ['id', 'content', 'created_at'],
        })

        expect(mockQuery.select).toHaveBeenCalledWith('id,content,created_at', {
          count: 'exact',
        })
      })
    })

    describe('BroadcastRepository', () => {
      let broadcastRepository: BroadcastRepository

      beforeEach(() => {
        broadcastRepository = new BroadcastRepository(mockSupabase, mockTenantId)
      })

      it('should use pagination in findByStatus', async () => {
        mockQuery.range.mockResolvedValue({
          data: [
            { id: 'bc-1', name: 'Broadcast 1', status: 'completed' },
            { id: 'bc-2', name: 'Broadcast 2', status: 'completed' },
          ],
          error: null,
          count: 50,
        })

        const result = await broadcastRepository.findByStatus('completed', {
          page: 1,
          pageSize: 10,
        })

        expect(result.pageSize).toBe(10)
        expect(mockQuery.range).toHaveBeenCalledWith(0, 9)
      })

      it('should use field projection in findScheduled', async () => {
        mockQuery.order.mockImplementation(() => ({
          ...mockQuery,
          then: (resolve: any) =>
            resolve({
              data: [
                { id: 'bc-1', name: 'Broadcast 1', scheduled_at: '2024-01-01' },
                { id: 'bc-2', name: 'Broadcast 2', scheduled_at: '2024-01-02' },
              ],
              error: null,
            }),
        }))

        await broadcastRepository.findScheduled(['id', 'name', 'scheduled_at'])

        expect(mockQuery.select).toHaveBeenCalledWith('id,name,scheduled_at')
      })
    })
  })

  describe('Performance Validation', () => {
    it('should avoid N+1 queries with proper pagination', async () => {
      // Fetch 100 records in a single query with pagination
      mockQuery.range.mockResolvedValue({
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `id-${i}`,
          name: `Item ${i}`,
        })),
        error: null,
        count: 100,
      })

      await repository.findAll({ pageSize: 50 })

      // Should be a single query, not 50 individual queries
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)
    })

    it('should minimize data transfer with field projection', async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: 'id-1', name: 'Test' },
        error: null,
      })

      // Only fetch 2 fields instead of all fields
      await repository.findById('id-1', ['id', 'name'])

      expect(mockQuery.select).toHaveBeenCalledWith('id,name')
      expect(mockQuery.select).not.toHaveBeenCalledWith('*')
    })

    it('should reduce database round trips with batch operations', async () => {
      const records = Array.from({ length: 50 }, (_, i) => ({
        name: `Item ${i}`,
        value: i,
      }))

      mockQuery.select.mockResolvedValue({
        data: records.map((r, i) => ({
          id: `id-${i}`,
          tenant_id: mockTenantId,
          ...r,
          created_at: new Date().toISOString(),
        })),
        error: null,
      })

      await repository.batchInsert(records)

      // Should be 1 insert call, not 50
      expect(mockQuery.insert).toHaveBeenCalledTimes(1)
    })
  })
})

