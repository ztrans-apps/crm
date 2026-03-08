import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import {
  cacheAside,
  generateCacheKey,
  invalidateCache,
  invalidateCachePattern,
  invalidateResourceCache,
  invalidateTenantCache,
  setCache,
  getCache,
} from '@/lib/cache/cache-layer'
import { getRedisClient } from '@/lib/cache/redis'

/**
 * Property-Based Tests for Cache Invalidation on Update
 * 
 * **Validates: Requirements 10.6**
 * 
 * These tests verify that data updates invalidate corresponding cache entries:
 * - Cache entries are invalidated when data is updated
 * - Subsequent reads after invalidation fetch fresh data
 * - Pattern-based invalidation clears multiple related entries
 * - Tenant-wide invalidation clears all tenant cache entries
 */

// Mock Redis client
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(),
}))

// Mock logger to avoid noise in tests
vi.mock('@/lib/monitoring/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Feature: security-optimization, Property 33: Cache Invalidation on Update', () => {
  let mockRedis: any

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Create mock Redis client
    mockRedis = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
      pipeline: vi.fn(),
    }

    // Make getRedisClient return our mock
    vi.mocked(getRedisClient).mockReturnValue(mockRedis)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property Test: Cache invalidation should remove cache entry
   * 
   * This test verifies that when invalidateCache is called for a cache key,
   * the corresponding cache entry is deleted from Redis.
   * 
   * The property being tested: For any cache key that exists,
   * calling invalidateCache should result in a Redis del operation.
   */
  it('should delete cache entry on invalidation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations'),
          resourceId: fc.uuid(),
        }),
        async ({ tenantId, resourceType, resourceId }) => {
          // Reset mocks for this property test run
          vi.clearAllMocks()
          
          // Setup: Mock Redis del operation
          mockRedis.del.mockResolvedValue(1)

          // Generate cache key
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute cache invalidation
          await invalidateCache(cacheKey, tenantId)

          // Verify: Redis del was called with the correct key
          expect(mockRedis.del).toHaveBeenCalledWith(cacheKey)
          expect(mockRedis.del).toHaveBeenCalledTimes(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: After invalidation, subsequent read should fetch fresh data
   * 
   * This test verifies the complete cache invalidation flow:
   * 1. Data is cached
   * 2. Cache is invalidated
   * 3. Next read triggers a cache miss and fetches fresh data
   * 
   * The property being tested: For any cached data, after invalidation,
   * the next cache-aside operation should call the fetcher to get fresh data.
   */
  it('should fetch fresh data after cache invalidation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          oldData: fc.record({
            id: fc.uuid(),
            value: fc.integer({ min: 0, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          newData: fc.record({
            id: fc.uuid(),
            value: fc.integer({ min: 1001, max: 2000 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, oldData, newData, ttl }) => {
          // Setup: First read returns cached data, after invalidation returns null
          let invalidated = false
          mockRedis.get.mockImplementation(() => {
            return Promise.resolve(invalidated ? null : oldData)
          })
          mockRedis.setex.mockResolvedValue('OK')
          mockRedis.del.mockImplementation(() => {
            invalidated = true
            return Promise.resolve(1)
          })

          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // First read: Should return cached data
          const fetcher1 = vi.fn().mockResolvedValue(oldData)
          const result1 = await cacheAside(cacheKey, fetcher1, ttl, tenantId)
          expect(result1).toEqual(oldData)
          expect(fetcher1).not.toHaveBeenCalled() // Cache hit

          // Invalidate cache (simulating data update)
          await invalidateCache(cacheKey, tenantId)
          expect(mockRedis.del).toHaveBeenCalledWith(cacheKey)

          // Second read: Should fetch fresh data
          const fetcher2 = vi.fn().mockResolvedValue(newData)
          const result2 = await cacheAside(cacheKey, fetcher2, ttl, tenantId)
          expect(result2).toEqual(newData)
          expect(fetcher2).toHaveBeenCalledTimes(1) // Cache miss, fetcher called
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Pattern-based invalidation should clear multiple entries
   * 
   * This test verifies that invalidateCachePattern clears all cache entries
   * matching a pattern (e.g., all contacts for a tenant).
   * 
   * The property being tested: For any pattern matching multiple cache keys,
   * invalidateCachePattern should delete all matching keys.
   */
  it('should invalidate multiple cache entries matching pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }).filter((ids) => {
            // Ensure all IDs are unique
            return new Set(ids).size === ids.length
          }),
        }),
        async ({ tenantId, resourceType, resourceIds }) => {
          // Reset mocks for this property test run
          vi.clearAllMocks()
          
          // Generate cache keys for all resources
          const cacheKeys = resourceIds.map(id =>
            generateCacheKey(tenantId, resourceType, id)
          )

          // Setup: Mock Redis keys to return all matching keys
          const pattern = `cache:${tenantId}:${resourceType}:*`
          mockRedis.keys.mockResolvedValue(cacheKeys)
          mockRedis.del.mockResolvedValue(cacheKeys.length)

          // Execute pattern-based invalidation
          await invalidateCachePattern(pattern, tenantId)

          // Verify: Redis keys was called with the pattern
          expect(mockRedis.keys).toHaveBeenCalledWith(pattern)

          // Verify: Redis del was called with all matching keys
          expect(mockRedis.del).toHaveBeenCalledWith(...cacheKeys)
          expect(mockRedis.del).toHaveBeenCalledTimes(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Resource-specific invalidation should clear all resource entries
   * 
   * This test verifies that invalidateResourceCache clears all cache entries
   * for a specific resource type within a tenant.
   * 
   * The property being tested: For any tenant and resource type,
   * invalidateResourceCache should delete all cache entries for that resource type.
   */
  it('should invalidate all cache entries for a resource type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations'),
          resourceIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 8 }).filter((ids) => {
            return new Set(ids).size === ids.length
          }),
        }),
        async ({ tenantId, resourceType, resourceIds }) => {
          // Generate cache keys for all resources
          const cacheKeys = resourceIds.map(id =>
            generateCacheKey(tenantId, resourceType, id)
          )

          // Setup: Mock Redis operations
          const expectedPattern = `cache:${tenantId}:${resourceType}:*`
          mockRedis.keys.mockResolvedValue(cacheKeys)
          mockRedis.del.mockResolvedValue(cacheKeys.length)

          // Execute resource-specific invalidation
          await invalidateResourceCache(tenantId, resourceType)

          // Verify: Redis keys was called with correct pattern
          expect(mockRedis.keys).toHaveBeenCalledWith(expectedPattern)

          // Verify: All matching keys were deleted
          if (cacheKeys.length > 0) {
            expect(mockRedis.del).toHaveBeenCalledWith(...cacheKeys)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Tenant-wide invalidation should clear all tenant cache entries
   * 
   * This test verifies that invalidateTenantCache clears all cache entries
   * for a specific tenant across all resource types.
   * 
   * The property being tested: For any tenant with multiple cached resources,
   * invalidateTenantCache should delete all cache entries for that tenant.
   */
  it('should invalidate all cache entries for a tenant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resources: fc.array(
            fc.record({
              type: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations'),
              ids: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
            }),
            { minLength: 1, maxLength: 4 }
          ),
        }),
        async ({ tenantId, resources }) => {
          // Generate all cache keys for the tenant
          const allCacheKeys: string[] = []
          resources.forEach(resource => {
            resource.ids.forEach(id => {
              allCacheKeys.push(generateCacheKey(tenantId, resource.type, id))
            })
          })

          // Setup: Mock Redis operations
          const expectedPattern = `cache:${tenantId}:*`
          mockRedis.keys.mockResolvedValue(allCacheKeys)
          mockRedis.del.mockResolvedValue(allCacheKeys.length)

          // Execute tenant-wide invalidation
          await invalidateTenantCache(tenantId)

          // Verify: Redis keys was called with tenant pattern
          expect(mockRedis.keys).toHaveBeenCalledWith(expectedPattern)

          // Verify: All tenant cache keys were deleted
          if (allCacheKeys.length > 0) {
            expect(mockRedis.del).toHaveBeenCalledWith(...allCacheKeys)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Update operation should invalidate before caching new data
   * 
   * This test simulates a complete update flow:
   * 1. Read cached data
   * 2. Update data (invalidate cache)
   * 3. Cache new data
   * 4. Read returns new data
   * 
   * The property being tested: For any data update operation,
   * the cache should be invalidated and subsequent reads should return updated data.
   */
  it('should ensure fresh data is returned after update and re-cache', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          initialData: fc.record({
            id: fc.uuid(),
            version: fc.constant(1),
            content: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          updatedData: fc.record({
            id: fc.uuid(),
            version: fc.constant(2),
            content: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, initialData, updatedData, ttl }) => {
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)
          
          // Setup: Track cache state
          let cachedValue: any = initialData
          mockRedis.get.mockImplementation(() => Promise.resolve(cachedValue))
          mockRedis.setex.mockImplementation((key: string, ttl: number, value: string) => {
            cachedValue = JSON.parse(value)
            return Promise.resolve('OK')
          })
          mockRedis.del.mockImplementation(() => {
            cachedValue = null
            return Promise.resolve(1)
          })

          // Step 1: Initial read returns cached data
          const fetcher1 = vi.fn().mockResolvedValue(initialData)
          const result1 = await cacheAside(cacheKey, fetcher1, ttl, tenantId)
          expect(result1).toEqual(initialData)

          // Step 2: Simulate update - invalidate cache
          await invalidateCache(cacheKey, tenantId)
          expect(mockRedis.del).toHaveBeenCalledWith(cacheKey)

          // Step 3: Read after invalidation should fetch updated data
          const fetcher2 = vi.fn().mockResolvedValue(updatedData)
          const result2 = await cacheAside(cacheKey, fetcher2, ttl, tenantId)
          expect(result2).toEqual(updatedData)
          expect(fetcher2).toHaveBeenCalledTimes(1) // Fetcher called due to cache miss

          // Wait for async cache set
          await new Promise(resolve => setTimeout(resolve, 10))

          // Step 4: Subsequent read should return updated cached data
          const fetcher3 = vi.fn().mockResolvedValue({ different: 'data' })
          const result3 = await cacheAside(cacheKey, fetcher3, ttl, tenantId)
          expect(result3).toEqual(updatedData)
          expect(fetcher3).not.toHaveBeenCalled() // Cache hit with updated data
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Invalidation should be idempotent
   * 
   * This test verifies that invalidating a cache entry multiple times
   * is safe and doesn't cause errors.
   * 
   * The property being tested: For any cache key,
   * calling invalidateCache multiple times should be safe and idempotent.
   */
  it('should handle multiple invalidations of the same key safely', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          invalidationCount: fc.integer({ min: 2, max: 5 }),
        }),
        async ({ tenantId, resourceType, resourceId, invalidationCount }) => {
          // Reset mocks for this property test run
          vi.clearAllMocks()
          
          // Setup: Mock Redis del operation
          mockRedis.del.mockResolvedValue(1)

          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute multiple invalidations
          for (let i = 0; i < invalidationCount; i++) {
            await invalidateCache(cacheKey, tenantId)
          }

          // Verify: Redis del was called the correct number of times
          expect(mockRedis.del).toHaveBeenCalledTimes(invalidationCount)
          
          // Verify: All calls used the same cache key
          mockRedis.del.mock.calls.forEach(call => {
            expect(call[0]).toBe(cacheKey)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Invalidation should not affect other tenants' cache
   * 
   * This test verifies that invalidating cache for one tenant
   * does not affect cache entries for other tenants.
   * 
   * The property being tested: For any two different tenants with the same resource ID,
   * invalidating one tenant's cache should not affect the other tenant's cache.
   */
  it('should maintain tenant isolation during invalidation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.uuid(),
          tenant2Id: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          tenant1Data: fc.record({ id: fc.uuid(), value: fc.integer() }),
          tenant2Data: fc.record({ id: fc.uuid(), value: fc.integer() }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }).filter(({ tenant1Id, tenant2Id }) => tenant1Id !== tenant2Id),
        async ({ tenant1Id, tenant2Id, resourceType, resourceId, tenant1Data, tenant2Data, ttl }) => {
          // Generate separate cache keys for each tenant
          const cacheKey1 = generateCacheKey(tenant1Id, resourceType, resourceId)
          const cacheKey2 = generateCacheKey(tenant2Id, resourceType, resourceId)

          // Setup: Track cache state for both tenants
          const cacheState = new Map<string, any>([
            [cacheKey1, tenant1Data],
            [cacheKey2, tenant2Data],
          ])

          mockRedis.get.mockImplementation((key: string) => {
            return Promise.resolve(cacheState.get(key) || null)
          })
          mockRedis.del.mockImplementation((key: string) => {
            cacheState.delete(key)
            return Promise.resolve(1)
          })

          // Verify: Both tenants initially have cached data
          expect(await getCache(cacheKey1, tenant1Id)).toEqual(tenant1Data)
          expect(await getCache(cacheKey2, tenant2Id)).toEqual(tenant2Data)

          // Invalidate only tenant1's cache
          await invalidateCache(cacheKey1, tenant1Id)

          // Verify: Tenant1's cache is invalidated
          expect(cacheState.has(cacheKey1)).toBe(false)

          // Verify: Tenant2's cache is NOT affected
          expect(cacheState.has(cacheKey2)).toBe(true)
          expect(await getCache(cacheKey2, tenant2Id)).toEqual(tenant2Data)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Invalidation should handle Redis failures gracefully
   * 
   * This test verifies that when Redis is unavailable or fails,
   * cache invalidation operations don't throw errors.
   * 
   * The property being tested: For any cache invalidation operation,
   * Redis failures should be handled gracefully without throwing errors.
   */
  it('should handle Redis failures during invalidation gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          errorMessage: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length > 0),
        }),
        async ({ tenantId, resourceType, resourceId, errorMessage }) => {
          // Setup: Mock Redis del to throw error
          mockRedis.del.mockRejectedValue(new Error(errorMessage.trim()))

          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute invalidation - should not throw
          await expect(
            invalidateCache(cacheKey, tenantId)
          ).resolves.not.toThrow()

          // Verify: Redis del was attempted
          expect(mockRedis.del).toHaveBeenCalledWith(cacheKey)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Pattern invalidation with no matches should not error
   * 
   * This test verifies that pattern-based invalidation works correctly
   * even when no cache entries match the pattern.
   * 
   * The property being tested: For any pattern with no matching keys,
   * invalidateCachePattern should complete successfully without errors.
   */
  it('should handle pattern invalidation with no matching keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
        }),
        async ({ tenantId, resourceType }) => {
          // Setup: Mock Redis keys to return empty array (no matches)
          mockRedis.keys.mockResolvedValue([])
          mockRedis.del.mockResolvedValue(0)

          const pattern = `cache:${tenantId}:${resourceType}:*`

          // Execute pattern-based invalidation
          await expect(
            invalidateCachePattern(pattern, tenantId)
          ).resolves.not.toThrow()

          // Verify: Redis keys was called
          expect(mockRedis.keys).toHaveBeenCalledWith(pattern)

          // Verify: Redis del was NOT called (no keys to delete)
          expect(mockRedis.del).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})
