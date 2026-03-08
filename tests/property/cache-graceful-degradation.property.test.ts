import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import {
  cacheAside,
  getCache,
  setCache,
  invalidateCache,
  generateCacheKey,
  cacheUserPermissions,
  cacheTenantConfig,
  cacheConversationList,
  CACHE_TTL,
} from '@/lib/cache/cache-layer'
import { getRedisClient } from '@/lib/cache/redis'

/**
 * Property-Based Tests for Cache Graceful Degradation
 * 
 * **Validates: Requirements 10.9**
 * 
 * These tests verify that the system continues to function correctly
 * when Redis is unavailable, by bypassing the cache and accessing
 * the database directly without throwing errors.
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

describe('Feature: security-optimization, Property 35: Cache Graceful Degradation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property Test: System continues functioning when Redis is unavailable
   * 
   * This test verifies that for any operation when Redis is unavailable,
   * the system continues to function by bypassing the cache and accessing
   * the database directly, without throwing errors.
   * 
   * The property being tested: For any cache operation with Redis unavailable,
   * the fetcher should be called and data should be returned successfully.
   */
  it('should continue operating without caching when Redis is unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations'),
          resourceId: fc.uuid(),
          data: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            value: fc.integer({ min: 0, max: 10000 }),
            metadata: fc.record({
              tags: fc.array(fc.string(), { maxLength: 5 }),
              score: fc.float({ min: 0, max: 100 }),
            }),
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, data, ttl }) => {
          // Setup: Redis unavailable (returns null)
          vi.mocked(getRedisClient).mockReturnValue(null)

          // Create fetcher function
          const fetcher = vi.fn().mockResolvedValue(data)

          // Generate cache key
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute cache-aside operation - should NOT throw error
          const result = await cacheAside(cacheKey, fetcher, ttl, tenantId)

          // Verify: Fetcher was called (bypassing cache)
          expect(fetcher).toHaveBeenCalledTimes(1)

          // Verify: Result matches fetched data
          expect(result).toEqual(data)

          // Verify: No errors were thrown
          expect(result).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Multiple operations work without Redis
   * 
   * This test verifies that multiple consecutive operations continue
   * to work correctly when Redis is unavailable, each fetching fresh data.
   * 
   * The property being tested: For any sequence of operations when Redis
   * is unavailable, each operation should fetch fresh data independently.
   */
  it('should fetch fresh data on every request when Redis unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          dataSequence: fc.array(
            fc.record({
              id: fc.uuid(),
              timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
              value: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, dataSequence, ttl }) => {
          // Setup: Redis unavailable
          vi.mocked(getRedisClient).mockReturnValue(null)

          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)
          const results: any[] = []

          // Execute multiple cache-aside operations
          for (const data of dataSequence) {
            const fetcher = vi.fn().mockResolvedValue(data)
            const result = await cacheAside(cacheKey, fetcher, ttl, tenantId)
            
            // Verify: Fetcher was called for each operation
            expect(fetcher).toHaveBeenCalledTimes(1)
            
            // Verify: Result matches current data
            expect(result).toEqual(data)
            
            results.push(result)
          }

          // Verify: All operations completed successfully
          expect(results).toHaveLength(dataSequence.length)
          
          // Verify: Each result matches its corresponding data
          results.forEach((result, index) => {
            expect(result).toEqual(dataSequence[index])
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Redis connection errors are handled gracefully
   * 
   * This test verifies that when Redis throws connection errors,
   * the system falls back to the fetcher without propagating the error.
   * 
   * The property being tested: For any Redis error during cache operations,
   * the system should catch the error and fall back to fetching data directly.
   */
  it('should handle Redis connection errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          data: fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            count: fc.integer({ min: 0, max: 1000 }),
          }),
          errorType: fc.constantFrom(
            'Connection timeout',
            'Connection refused',
            'Network error',
            'Redis unavailable',
            'ECONNREFUSED'
          ),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, data, errorType, ttl }) => {
          // Setup: Redis throws connection error
          const mockRedis = {
            get: vi.fn().mockRejectedValue(new Error(errorType)),
            setex: vi.fn().mockRejectedValue(new Error(errorType)),
          }
          vi.mocked(getRedisClient).mockReturnValue(mockRedis as any)

          const fetcher = vi.fn().mockResolvedValue(data)
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute cache-aside operation - should NOT throw error
          const result = await cacheAside(cacheKey, fetcher, ttl, tenantId)

          // Verify: Fetcher was called (fallback to database)
          expect(fetcher).toHaveBeenCalledTimes(1)

          // Verify: Result matches fetched data
          expect(result).toEqual(data)

          // Verify: No errors were propagated to caller
          expect(result).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Cache write failures don't affect data retrieval
   * 
   * This test verifies that when Redis is available for reads but fails
   * on writes, the system still returns the fetched data successfully.
   * 
   * The property being tested: For any cache miss with write failure,
   * the fetched data should still be returned to the caller.
   */
  it('should return data even when cache write fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          data: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            status: fc.constantFrom('active', 'inactive', 'pending', 'completed'),
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, data, ttl }) => {
          // Setup: Redis read works but write fails
          const mockRedis = {
            get: vi.fn().mockResolvedValue(null), // Cache miss
            setex: vi.fn().mockRejectedValue(new Error('Write failed')),
          }
          vi.mocked(getRedisClient).mockReturnValue(mockRedis as any)

          const fetcher = vi.fn().mockResolvedValue(data)
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute cache-aside operation
          const result = await cacheAside(cacheKey, fetcher, ttl, tenantId)

          // Verify: Fetcher was called
          expect(fetcher).toHaveBeenCalledTimes(1)

          // Verify: Result matches fetched data (despite cache write failure)
          expect(result).toEqual(data)

          // Verify: Cache get was attempted
          expect(mockRedis.get).toHaveBeenCalledWith(cacheKey)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: getCache returns null gracefully when Redis unavailable
   * 
   * This test verifies that getCache operations handle Redis unavailability
   * by returning null instead of throwing errors.
   * 
   * The property being tested: For any cache key when Redis is unavailable,
   * getCache should return null without throwing errors.
   */
  it('should return null from getCache when Redis unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
        }),
        async ({ tenantId, resourceType, resourceId }) => {
          // Setup: Redis unavailable
          vi.mocked(getRedisClient).mockReturnValue(null)

          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute getCache - should NOT throw error
          const result = await getCache(cacheKey, tenantId)

          // Verify: Returns null (not undefined, not error)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: setCache fails silently when Redis unavailable
   * 
   * This test verifies that setCache operations handle Redis unavailability
   * gracefully without throwing errors.
   * 
   * The property being tested: For any data when Redis is unavailable,
   * setCache should complete without throwing errors.
   */
  it('should handle setCache gracefully when Redis unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          data: fc.record({
            id: fc.uuid(),
            value: fc.anything(),
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, data, ttl }) => {
          // Setup: Redis unavailable
          vi.mocked(getRedisClient).mockReturnValue(null)

          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute setCache - should NOT throw error
          await expect(
            setCache(cacheKey, data, ttl, tenantId)
          ).resolves.toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: invalidateCache fails silently when Redis unavailable
   * 
   * This test verifies that cache invalidation operations handle Redis
   * unavailability gracefully without throwing errors.
   * 
   * The property being tested: For any cache key when Redis is unavailable,
   * invalidateCache should complete without throwing errors.
   */
  it('should handle invalidateCache gracefully when Redis unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
        }),
        async ({ tenantId, resourceType, resourceId }) => {
          // Setup: Redis unavailable
          vi.mocked(getRedisClient).mockReturnValue(null)

          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Execute invalidateCache - should NOT throw error
          await expect(
            invalidateCache(cacheKey, tenantId)
          ).resolves.toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: User permissions work without caching
   * 
   * This test verifies that user permission caching continues to work
   * when Redis is unavailable, fetching permissions directly.
   * 
   * The property being tested: For any user permissions when Redis is
   * unavailable, the system should fetch and return permissions successfully.
   */
  it('should fetch user permissions without caching when Redis unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          userId: fc.uuid(),
          permissions: fc.array(
            fc.constantFrom(
              'read:contacts',
              'write:contacts',
              'delete:contacts',
              'read:messages',
              'write:messages',
              'read:broadcasts',
              'write:broadcasts',
              'admin:all'
            ),
            { minLength: 1, maxLength: 5 }
          ).map(perms => Array.from(new Set(perms))), // Ensure unique permissions
        }),
        async ({ tenantId, userId, permissions }) => {
          // Setup: Redis unavailable
          vi.mocked(getRedisClient).mockReturnValue(null)

          const fetcher = vi.fn().mockResolvedValue(permissions)

          // Execute cacheUserPermissions
          const result = await cacheUserPermissions(tenantId, userId, fetcher)

          // Verify: Fetcher was called
          expect(fetcher).toHaveBeenCalledTimes(1)

          // Verify: Result matches permissions
          expect(result).toEqual(permissions)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Tenant config works without caching
   * 
   * This test verifies that tenant configuration caching continues to work
   * when Redis is unavailable, fetching config directly.
   * 
   * The property being tested: For any tenant config when Redis is
   * unavailable, the system should fetch and return config successfully.
   */
  it('should fetch tenant config without caching when Redis unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          config: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            settings: fc.record({
              feature1: fc.boolean(),
              feature2: fc.boolean(),
              maxUsers: fc.integer({ min: 1, max: 1000 }),
              tier: fc.constantFrom('free', 'pro', 'enterprise'),
            }),
            metadata: fc.record({
              createdAt: fc.integer({ min: 1000000000, max: 2000000000 }),
              updatedAt: fc.integer({ min: 1000000000, max: 2000000000 }),
            }),
          }),
        }),
        async ({ tenantId, config }) => {
          // Setup: Redis unavailable
          vi.mocked(getRedisClient).mockReturnValue(null)

          const fetcher = vi.fn().mockResolvedValue(config)

          // Execute cacheTenantConfig
          const result = await cacheTenantConfig(tenantId, fetcher)

          // Verify: Fetcher was called
          expect(fetcher).toHaveBeenCalledTimes(1)

          // Verify: Result matches config
          expect(result).toEqual(config)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Conversation list works without caching
   * 
   * This test verifies that conversation list caching continues to work
   * when Redis is unavailable, fetching conversations directly.
   * 
   * The property being tested: For any conversation list when Redis is
   * unavailable, the system should fetch and return conversations successfully.
   */
  it('should fetch conversation list without caching when Redis unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          userId: fc.option(fc.uuid(), { nil: undefined }),
          conversations: fc.array(
            fc.record({
              id: fc.uuid(),
              contactId: fc.uuid(),
              lastMessage: fc.string({ minLength: 1, maxLength: 100 }),
              unreadCount: fc.integer({ min: 0, max: 100 }),
              updatedAt: fc.integer({ min: 1000000000, max: 2000000000 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
        }),
        async ({ tenantId, userId, conversations }) => {
          // Setup: Redis unavailable
          vi.mocked(getRedisClient).mockReturnValue(null)

          const fetcher = vi.fn().mockResolvedValue(conversations)

          // Execute cacheConversationList
          const result = await cacheConversationList(tenantId, userId, fetcher)

          // Verify: Fetcher was called
          expect(fetcher).toHaveBeenCalledTimes(1)

          // Verify: Result matches conversations
          expect(result).toEqual(conversations)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: System recovers when Redis becomes available
   * 
   * This test verifies that the system can recover and start using cache
   * again when Redis becomes available after being unavailable.
   * 
   * The property being tested: For any operation, when Redis transitions
   * from unavailable to available, the system should start caching again.
   */
  it('should recover and use cache when Redis becomes available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          data: fc.record({
            id: fc.uuid(),
            value: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, data, ttl }) => {
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)
          const fetcher = vi.fn().mockResolvedValue(data)

          // Phase 1: Redis unavailable
          vi.mocked(getRedisClient).mockReturnValue(null)
          
          const result1 = await cacheAside(cacheKey, fetcher, ttl, tenantId)
          expect(result1).toEqual(data)
          expect(fetcher).toHaveBeenCalledTimes(1)

          // Phase 2: Redis becomes available
          const mockRedis = {
            get: vi.fn().mockResolvedValue(null),
            setex: vi.fn().mockResolvedValue('OK'),
          }
          vi.mocked(getRedisClient).mockReturnValue(mockRedis as any)

          const result2 = await cacheAside(cacheKey, fetcher, ttl, tenantId)
          expect(result2).toEqual(data)
          expect(fetcher).toHaveBeenCalledTimes(2)

          // Verify: Redis operations were attempted
          expect(mockRedis.get).toHaveBeenCalledWith(cacheKey)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Intermittent Redis failures are handled
   * 
   * This test verifies that the system handles intermittent Redis failures
   * gracefully, continuing to operate through connection instability.
   * 
   * The property being tested: For any sequence of operations with
   * intermittent Redis failures, each operation should complete successfully.
   */
  it('should handle intermittent Redis failures gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
          operations: fc.array(
            fc.record({
              data: fc.record({
                id: fc.uuid(),
                value: fc.integer({ min: 0, max: 1000 }),
              }),
              redisWorks: fc.boolean(),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          ttl: fc.integer({ min: 10, max: 600 }),
        }),
        async ({ tenantId, resourceType, resourceId, operations, ttl }) => {
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)
          const results: any[] = []

          for (const operation of operations) {
            // Setup: Redis works or fails based on operation
            if (operation.redisWorks) {
              const mockRedis = {
                get: vi.fn().mockResolvedValue(null),
                setex: vi.fn().mockResolvedValue('OK'),
              }
              vi.mocked(getRedisClient).mockReturnValue(mockRedis as any)
            } else {
              vi.mocked(getRedisClient).mockReturnValue(null)
            }

            const fetcher = vi.fn().mockResolvedValue(operation.data)
            
            // Execute operation - should NOT throw error
            const result = await cacheAside(cacheKey, fetcher, ttl, tenantId)
            
            // Verify: Result matches data
            expect(result).toEqual(operation.data)
            
            // Verify: Fetcher was called
            expect(fetcher).toHaveBeenCalledTimes(1)
            
            results.push(result)
          }

          // Verify: All operations completed successfully
          expect(results).toHaveLength(operations.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
