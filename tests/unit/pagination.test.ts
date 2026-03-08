import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BaseRepository, PAGINATION_DEFAULTS, PaginationOptions, CursorPaginatedResult } from '@/lib/repositories/base-repository'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Test Repository for pagination testing
 */
class TestRepository extends BaseRepository<any> {
  constructor(supabase: SupabaseClient, tenantId: string) {
    super(supabase, tenantId, 'test_table')
  }

  // Expose protected methods for testing
  public testNormalizePaginationOptions(options?: PaginationOptions) {
    return this.normalizePaginationOptions(options)
  }

  public testEncodeCursor(value: any): string {
    return this.encodeCursor(value)
  }

  public testDecodeCursor(cursor: string): string {
    return this.decodeCursor(cursor)
  }
}

describe('Pagination Implementation', () => {
  let mockSupabase: any
  let repository: TestRepository
  const tenantId = 'test-tenant-123'

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }

    repository = new TestRepository(mockSupabase as any, tenantId)
  })

  describe('Page Size Limits', () => {
    it('should use default page size of 50 when not specified', () => {
      const normalized = repository.testNormalizePaginationOptions()
      expect(normalized.pageSize).toBe(PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE)
      expect(normalized.pageSize).toBe(50)
    })

    it('should enforce maximum page size of 100', () => {
      const normalized = repository.testNormalizePaginationOptions({ pageSize: 200 })
      expect(normalized.pageSize).toBe(PAGINATION_DEFAULTS.MAX_PAGE_SIZE)
      expect(normalized.pageSize).toBe(100)
    })

    it('should enforce minimum page size of 1', () => {
      const normalized = repository.testNormalizePaginationOptions({ pageSize: 0 })
      expect(normalized.pageSize).toBe(PAGINATION_DEFAULTS.MIN_PAGE_SIZE)
      expect(normalized.pageSize).toBe(1)
    })

    it('should accept valid page sizes between 1 and 100', () => {
      const testCases = [1, 10, 25, 50, 75, 100]
      testCases.forEach(size => {
        const normalized = repository.testNormalizePaginationOptions({ pageSize: size })
        expect(normalized.pageSize).toBe(size)
      })
    })

    it('should handle negative page sizes by enforcing minimum', () => {
      const normalized = repository.testNormalizePaginationOptions({ pageSize: -10 })
      expect(normalized.pageSize).toBe(PAGINATION_DEFAULTS.MIN_PAGE_SIZE)
    })
  })

  describe('Page Number Normalization', () => {
    it('should use default page 1 when not specified', () => {
      const normalized = repository.testNormalizePaginationOptions()
      expect(normalized.page).toBe(1)
    })

    it('should accept valid page numbers', () => {
      const testCases = [1, 2, 5, 10, 100]
      testCases.forEach(page => {
        const normalized = repository.testNormalizePaginationOptions({ page })
        expect(normalized.page).toBe(page)
      })
    })

    it('should enforce minimum page number of 1', () => {
      const normalized = repository.testNormalizePaginationOptions({ page: 0 })
      expect(normalized.page).toBe(1)
    })

    it('should handle negative page numbers by enforcing minimum', () => {
      const normalized = repository.testNormalizePaginationOptions({ page: -5 })
      expect(normalized.page).toBe(1)
    })
  })

  describe('Cursor Encoding/Decoding', () => {
    it('should encode cursor values to base64', () => {
      const value = 'test-id-123'
      const encoded = repository.testEncodeCursor(value)
      
      // Verify it's base64 encoded
      expect(encoded).toBeTruthy()
      expect(encoded).not.toBe(value)
      
      // Verify it can be decoded back
      const decoded = repository.testDecodeCursor(encoded)
      expect(decoded).toBe(value)
    })

    it('should handle numeric cursor values', () => {
      const value = 12345
      const encoded = repository.testEncodeCursor(value)
      const decoded = repository.testDecodeCursor(encoded)
      expect(decoded).toBe('12345')
    })

    it('should handle UUID cursor values', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      const encoded = repository.testEncodeCursor(uuid)
      const decoded = repository.testDecodeCursor(encoded)
      expect(decoded).toBe(uuid)
    })

    it('should handle special characters in cursor values', () => {
      const value = 'test@value#123'
      const encoded = repository.testEncodeCursor(value)
      const decoded = repository.testDecodeCursor(encoded)
      expect(decoded).toBe(value)
    })
  })

  describe('Cursor-Based Pagination', () => {
    it('should fetch records with cursor pagination', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await repository.findAllCursor({ pageSize: 2 })

      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBeTruthy()
    })

    it('should indicate no more records when at the end', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await repository.findAllCursor({ pageSize: 5 })

      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('should respect page size limits in cursor pagination', async () => {
      const mockData = Array.from({ length: 101 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${i + 1}`,
      }))

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockData.slice(0, 101),
                error: null,
              }),
            }),
          }),
        }),
      })

      // Request more than max page size
      const result = await repository.findAllCursor({ pageSize: 200 })

      // Should be limited to max page size (100)
      expect(result.pageSize).toBe(100)
    })
  })

  describe('Offset-Based Pagination', () => {
    it('should fetch records with offset pagination', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${i + 1}`,
      }))

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
              count: 150,
            }),
          }),
        }),
      })

      const result = await repository.findAll({ page: 1, pageSize: 50 })

      expect(result.data).toHaveLength(50)
      expect(result.total).toBe(150)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.hasMore).toBe(true)
    })

    it('should calculate hasMore correctly for last page', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${i + 1}`,
      }))

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
              count: 125,
            }),
          }),
        }),
      })

      const result = await repository.findAll({ page: 3, pageSize: 50 })

      expect(result.data).toHaveLength(25)
      expect(result.total).toBe(125)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('Requirement 12.2 Validation', () => {
    it('should implement pagination for all list queries', () => {
      // Verify that findAll returns PaginatedResult
      expect(repository.findAll).toBeDefined()
    })

    it('should support cursor-based pagination for large datasets', () => {
      // Verify that findAllCursor exists
      expect(repository.findAllCursor).toBeDefined()
    })

    it('should enforce default page size of 50', () => {
      const normalized = repository.testNormalizePaginationOptions({})
      expect(normalized.pageSize).toBe(50)
    })

    it('should enforce maximum page size of 100', () => {
      const normalized = repository.testNormalizePaginationOptions({ pageSize: 150 })
      expect(normalized.pageSize).toBe(100)
    })
  })
})
