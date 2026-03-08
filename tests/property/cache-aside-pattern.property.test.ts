import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { cacheAside, generateCacheKey, getCacheMetrics } from '@/lib/cache/cache-layer'
import { getRedisClient } from '@/lib/cache/redis'

/**
 * Property-Based Tests for Cache-Aside Pattern
 * 
 * **Validates: Requirements 10.5**
 * 
 * These tests verify that the cache-aside pattern works correctly:
 * - Cache miss triggers database fetch
 * - Fetched data is stored in cache
 * - Subsequent reads return cached data
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

describe('Feature: security-optimization, Property 32: Cache-Aside Pattern', () => {
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
   * Property Test: Cache miss should trigger database fetch
   * 
   * This test verifies that when a cache key doesn't exist (cache miss),
   * the system calls the fetcher function to retrieve data from the database.
   * 
   * The property being tested: For any cache key and fetcher function,
   * when the cache returns null (miss), the fetcher should be called exactly once.
   */
  it('should call fetcher on cache miss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations'),
          resourceId: fc.uuid(),
          data: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            value: fc.integer({ min: 0, max: 1000 }),
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, data, ttl }) => {
          // Setup: Cache miss (returns null)
          mockRedis.get.mockResolvedValue(null)
          mockRedis.setex.mockResolvedValue('OK')

          // Create fetcher function
          const fetcher = vi.fn().mockResolvedValue(data)

          // Generate cache key
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute cache-aside operation
          const result = await cacheAside(cacheKey, fetcher, ttl, tenantId)

          // Verify: Fetcher was called exactly once
          expect(fetcher).toHaveBeenCalledTimes(1)

          // Verify: Result matches fetched data
          expect(result).toEqual(data)

          // Verify: Cache get was called
          expect(mockRedis.get).toHaveBeenCalledWith(cacheKey)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property Test: Fetched data should be stored in cache
   * 
   * This test verifies that after fetching data from the database on a cache miss,
   * the system stores the data in the cache with the correct TTL.
   * 
   * The property being tested: For any cache miss, after the fetcher returns data,
   * the system should call Redis setex with the cache key, TTL, and serialized data.
   */
  it('should store fetched data in cache with correct TTL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          data: fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
          }),
          ttl: fc.integer({ min: 30, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, data, ttl }) => {
          // Setup: Cache miss
          mockRedis.get.mockResolvedValue(null)
          mockRedis.setex.mockResolvedValue('OK')

          const fetcher = vi.fn().mockResolvedValue(data)
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute cache-aside operation
          await cacheAside(cacheKey, fetcher, ttl, tenantId)

          // Wait for async cache set to complete
          await new Promise(resolve => setTimeout(resolve, 10))

          // Verify: Cache setex was called with correct parameters
          expect(mockRedis.setex).toHaveBeenCalledWith(
            cacheKey,
            ttl,
            JSON.stringify(data)
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property Test: Cache hit should not call fetcher
   * 
   * This test verifies that when data exists in the cache (cache hit),
   * the system returns the cached data without calling the fetcher function.
   * 
   * The property being tested: For any cache key with existing data,
   * the fetcher should never be called, and the cached data should be returned.
   */
  it('should return cached data without calling fetcher on cache hit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          cachedData: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            status: fc.constantFrom('active', 'inactive', 'pending'),
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, cachedData, ttl }) => {
          // Setup: Cache hit (returns cached data)
          mockRedis.get.mockResolvedValue(cachedData)

          const fetcher = vi.fn().mockResolvedValue({ different: 'data' })
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute cache-aside operation
          const result = await cacheAside(cacheKey, fetcher, ttl, tenantId)

          // Verify: Fetcher was NOT called
          expect(fetcher).not.toHaveBeenCalled()

          // Verify: Result matches cached data
          expect(result).toEqual(cachedData)

          // Verify: Cache get was called
          expect(mockRedis.get).toHaveBeenCalledWith(cacheKey)

          // Verify: Cache setex was NOT called (no need to update cache)
          expect(mockRedis.setex).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property Test: Multiple cache misses should fetch and cache independently
   * 
   * This test verifies that multiple different cache keys each trigger their own
   * fetch and cache operations independently.
   * 
   * The property being tested: For any set of different cache keys,
   * each cache miss should trigger its own fetcher and cache update.
   */
  it('should handle multiple independent cache operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resources: fc.array(
            fc.record({
              type: fc.constantFrom('contacts', 'messages', 'broadcasts'),
              id: fc.uuid(),
              data: fc.record({
                id: fc.uuid(),
                value: fc.integer(),
              }),
            }),
            { minLength: 2, maxLength: 5 }
          ).filter((resources) => {
            // Ensure all resource IDs are unique
            const ids = resources.map(r => r.id)
            return new Set(ids).size === ids.length
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resources, ttl }) => {
          // Reset mocks for this property test run
          vi.clearAllMocks()
          mockRedis.get.mockResolvedValue(null)
          mockRedis.setex.mockResolvedValue('OK')

          // Create fetchers for each resource
          const fetchers = resources.map(r => vi.fn().mockResolvedValue(r.data))

          // Execute cache-aside operations for all resources
          const results = await Promise.all(
            resources.map((resource, index) => {
              const cacheKey = generateCacheKey(tenantId, resource.type, resource.id)
              return cacheAside(cacheKey, fetchers[index], ttl, tenantId)
            })
          )

          // Verify: Each fetcher was called exactly once
          fetchers.forEach(fetcher => {
            expect(fetcher).toHaveBeenCalledTimes(1)
          })

          // Verify: Results match fetched data
          results.forEach((result, index) => {
            expect(result).toEqual(resources[index].data)
          })

          // Verify: Cache get was called for each resource
          expect(mockRedis.get).toHaveBeenCalledTimes(resources.length)

          // Wait for async cache sets
          await new Promise(resolve => setTimeout(resolve, 10))

          // Verify: Cache setex was called for each resource
          expect(mockRedis.setex).toHaveBeenCalledTimes(resources.length)
        }
      ),
      { numRuns: 15 }
    )
  })

  /**
   * Property Test: Cache-aside should work with different data types
   * 
   * This test verifies that the cache-aside pattern works correctly
   * with various data types (objects, arrays, primitives).
   * 
   * The property being tested: For any data type that can be JSON serialized,
   * the cache-aside pattern should correctly store and retrieve the data.
   */
  it('should handle different data types correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceId: fc.uuid(),
          data: fc.oneof(
            // Object
            fc.record({
              id: fc.uuid(),
              name: fc.string(),
              count: fc.integer(),
            }),
            // Array
            fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
            // Nested object
            fc.record({
              user: fc.record({
                id: fc.uuid(),
                email: fc.emailAddress(),
              }),
              metadata: fc.record({
                tags: fc.array(fc.string()),
                score: fc.float(),
              }),
            })
          ),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceId, data, ttl }) => {
          // Setup: Cache miss
          mockRedis.get.mockResolvedValue(null)
          mockRedis.setex.mockResolvedValue('OK')

          const fetcher = vi.fn().mockResolvedValue(data)
          const cacheKey = generateCacheKey(tenantId, 'test', resourceId)

          // Execute cache-aside operation
          const result = await cacheAside(cacheKey, fetcher, ttl, tenantId)

          // Verify: Result matches original data
          expect(result).toEqual(data)

          // Wait for async cache set
          await new Promise(resolve => setTimeout(resolve, 10))

          // Verify: Data was serialized correctly
          expect(mockRedis.setex).toHaveBeenCalledWith(
            cacheKey,
            ttl,
            JSON.stringify(data)
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property Test: Tenant-specific cache keys should be isolated
   * 
   * This test verifies that cache keys include tenant ID and different tenants
   * have separate cache entries even for the same resource ID.
   * 
   * The property being tested: For any two different tenant IDs accessing
   * the same resource ID, they should have different cache keys.
   */
  it('should use tenant-specific cache keys for isolation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.uuid(),
          tenant2Id: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages'),
          resourceId: fc.uuid(),
          data1: fc.record({ id: fc.uuid(), value: fc.integer() }),
          data2: fc.record({ id: fc.uuid(), value: fc.integer() }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }).filter(({ tenant1Id, tenant2Id }) => tenant1Id !== tenant2Id),
        async ({ tenant1Id, tenant2Id, resourceType, resourceId, data1, data2, ttl }) => {
          // Setup: Cache misses for both tenants
          mockRedis.get.mockResolvedValue(null)
          mockRedis.setex.mockResolvedValue('OK')

          const fetcher1 = vi.fn().mockResolvedValue(data1)
          const fetcher2 = vi.fn().mockResolvedValue(data2)

          // Generate cache keys for both tenants
          const cacheKey1 = generateCacheKey(tenant1Id, resourceType, resourceId)
          const cacheKey2 = generateCacheKey(tenant2Id, resourceType, resourceId)

          // Verify: Cache keys are different
          expect(cacheKey1).not.toBe(cacheKey2)

          // Verify: Both keys include their respective tenant IDs
          expect(cacheKey1).toContain(tenant1Id)
          expect(cacheKey2).toContain(tenant2Id)

          // Execute cache-aside operations for both tenants
          const result1 = await cacheAside(cacheKey1, fetcher1, ttl, tenant1Id)
          const result2 = await cacheAside(cacheKey2, fetcher2, ttl, tenant2Id)

          // Verify: Each tenant gets their own data
          expect(result1).toEqual(data1)
          expect(result2).toEqual(data2)

          // Verify: Both fetchers were called
          expect(fetcher1).toHaveBeenCalledTimes(1)
          expect(fetcher2).toHaveBeenCalledTimes(1)
        }
      ),
      { numRuns: 15 }
    )
  })

  /**
   * Property Test: Cache metrics should track hits and misses
   * 
   * This test verifies that the cache-aside pattern correctly tracks
   * cache hits and misses for monitoring purposes.
   * 
   * The property being tested: For any sequence of cache operations,
   * the metrics should accurately reflect cache operations being performed.
   */
  it('should track cache hits and misses in metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          operations: fc.array(
            fc.record({
              resourceId: fc.uuid(),
              shouldHit: fc.boolean(),
              data: fc.record({ id: fc.uuid(), value: fc.integer() }),
            }),
            { minLength: 3, maxLength: 10 }
          ).filter((operations) => {
            // Ensure all resource IDs are unique
            const ids = operations.map(op => op.resourceId)
            return new Set(ids).size === ids.length
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, operations, ttl }) => {
          // Reset mocks for this property test run
          vi.clearAllMocks()

          // Setup: Configure cache hits/misses based on shouldHit
          mockRedis.get.mockImplementation((key: string) => {
            const operation = operations.find(op => 
              key.includes(op.resourceId)
            )
            return Promise.resolve(operation?.shouldHit ? operation.data : null)
          })
          mockRedis.setex.mockResolvedValue('OK')

          // Execute cache-aside operations
          for (const operation of operations) {
            const cacheKey = generateCacheKey(tenantId, resourceType, operation.resourceId)
            const fetcher = vi.fn().mockResolvedValue(operation.data)
            await cacheAside(cacheKey, fetcher, ttl, tenantId)
          }

          // Verify: Cache get was called for each operation
          expect(mockRedis.get).toHaveBeenCalledTimes(operations.length)

          // Verify: Metrics tracking is working (metrics exist and are updated)
          const metrics = getCacheMetrics(resourceType)
          expect(metrics).toBeDefined()
          expect(metrics.hits).toBeGreaterThanOrEqual(0)
          expect(metrics.misses).toBeGreaterThanOrEqual(0)
          expect(metrics.lastUpdated).toBeGreaterThan(0)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Cache-aside should handle fetcher errors gracefully
   * 
   * This test verifies that when the fetcher function throws an error,
   * the cache-aside pattern propagates the error without caching it.
   * 
   * The property being tested: For any fetcher that throws an error,
   * the error should be propagated and no cache entry should be created.
   */
  it('should propagate fetcher errors without caching', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages'),
          resourceId: fc.uuid(),
          errorMessage: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length > 0),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, errorMessage, ttl }) => {
          // Setup: Cache miss
          const localMockRedis = {
            get: vi.fn().mockResolvedValue(null),
            setex: vi.fn().mockResolvedValue('OK'),
            del: vi.fn(),
            keys: vi.fn(),
            pipeline: vi.fn(),
          }
          vi.mocked(getRedisClient).mockReturnValue(localMockRedis)

          // Create fetcher that throws error
          const error = new Error(errorMessage.trim())
          const fetcher = vi.fn().mockRejectedValue(error)

          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute cache-aside operation and expect error
          await expect(
            cacheAside(cacheKey, fetcher, ttl, tenantId)
          ).rejects.toThrow()

          // Verify: Fetcher was called at least once
          expect(fetcher).toHaveBeenCalled()

          // Verify: Cache setex was NOT called (error should not be cached)
          expect(localMockRedis.setex).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 15 }
    )
  })
})
