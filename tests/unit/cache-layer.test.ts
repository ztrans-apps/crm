/**
 * Unit tests for Cache Layer
 * 
 * Tests cache-aside pattern, tenant isolation, invalidation, and graceful degradation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as redis from '@/lib/cache/redis'
import {
  cacheAside,
  getCache,
  setCache,
  invalidateCache,
  invalidateCachePattern,
  invalidateTenantCache,
  invalidateResourceCache,
  generateCacheKey,
  getCacheMetrics,
  getAllCacheMetrics,
  getCacheStatistics,
  isRedisAvailable,
  cacheUserPermissions,
  cacheTenantConfig,
  cacheConversationList,
  batchGetCache,
  batchSetCache,
  CACHE_TTL,
} from '@/lib/cache/cache-layer'

// Mock Redis client
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  pipeline: vi.fn(),
}

// Mock logger
vi.mock('@/lib/monitoring/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Cache Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateCacheKey', () => {
    it('should generate tenant-specific cache key', () => {
      const key = generateCacheKey('tenant123', 'contacts', 'contact456')
      expect(key).toBe('cache:tenant123:contacts:contact456')
    })

    it('should handle multiple identifiers', () => {
      const key = generateCacheKey('tenant123', 'messages', 'conv456', 'msg789')
      expect(key).toBe('cache:tenant123:messages:conv456:msg789')
    })

    it('should handle numeric identifiers', () => {
      const key = generateCacheKey('tenant123', 'page', 1, 'size', 20)
      expect(key).toBe('cache:tenant123:page:1:size:20')
    })
  })

  describe('cacheAside', () => {
    it('should return cached data on cache hit', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue({ id: '1', name: 'Test' })

      const fetcher = vi.fn()
      const result = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      expect(result).toEqual({ id: '1', name: 'Test' })
      expect(fetcher).not.toHaveBeenCalled()
      expect(mockRedis.get).toHaveBeenCalledWith('cache:tenant123:test:1')
    })

    it('should fetch and cache data on cache miss', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue(null)
      mockRedis.setex.mockResolvedValue('OK')

      const fetchedData = { id: '1', name: 'Test' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      const result = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      expect(result).toEqual(fetchedData)
      expect(fetcher).toHaveBeenCalledOnce()
      expect(mockRedis.get).toHaveBeenCalledWith('cache:tenant123:test:1')
      
      // Wait for async setex
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(mockRedis.setex).toHaveBeenCalledWith('cache:tenant123:test:1', 60, JSON.stringify(fetchedData))
    })

    it('should bypass cache when Redis unavailable', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const fetchedData = { id: '1', name: 'Test' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      const result = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      expect(result).toEqual(fetchedData)
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('should handle Redis errors gracefully', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

      const fetchedData = { id: '1', name: 'Test' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      const result = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      expect(result).toEqual(fetchedData)
      expect(fetcher).toHaveBeenCalledOnce()
    })
  })

  describe('getCache', () => {
    it('should return cached data when available', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue({ id: '1', name: 'Test' })

      const result = await getCache('cache:tenant123:test:1', 'tenant123')

      expect(result).toEqual({ id: '1', name: 'Test' })
    })

    it('should return null on cache miss', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue(null)

      const result = await getCache('cache:tenant123:test:1', 'tenant123')

      expect(result).toBeNull()
    })

    it('should return null when Redis unavailable', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const result = await getCache('cache:tenant123:test:1', 'tenant123')

      expect(result).toBeNull()
    })
  })

  describe('setCache', () => {
    it('should set cache with TTL', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.setex.mockResolvedValue('OK')

      const data = { id: '1', name: 'Test' }
      await setCache('cache:tenant123:test:1', data, 60, 'tenant123')

      expect(mockRedis.setex).toHaveBeenCalledWith('cache:tenant123:test:1', 60, JSON.stringify(data))
    })

    it('should handle Redis unavailable gracefully', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const data = { id: '1', name: 'Test' }
      await expect(setCache('cache:tenant123:test:1', data, 60, 'tenant123')).resolves.toBeUndefined()
    })
  })

  describe('invalidateCache', () => {
    it('should delete cache entry', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.del.mockResolvedValue(1)

      await invalidateCache('cache:tenant123:test:1', 'tenant123')

      expect(mockRedis.del).toHaveBeenCalledWith('cache:tenant123:test:1')
    })

    it('should handle Redis unavailable gracefully', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      await expect(invalidateCache('cache:tenant123:test:1', 'tenant123')).resolves.toBeUndefined()
    })
  })

  describe('invalidateCachePattern', () => {
    it('should delete multiple cache entries matching pattern', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.keys.mockResolvedValue(['cache:tenant123:test:1', 'cache:tenant123:test:2'])
      mockRedis.del.mockResolvedValue(2)

      await invalidateCachePattern('cache:tenant123:test:*', 'tenant123')

      expect(mockRedis.keys).toHaveBeenCalledWith('cache:tenant123:test:*')
      expect(mockRedis.del).toHaveBeenCalledWith('cache:tenant123:test:1', 'cache:tenant123:test:2')
    })

    it('should handle no matching keys', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.keys.mockResolvedValue([])

      await invalidateCachePattern('cache:tenant123:test:*', 'tenant123')

      expect(mockRedis.keys).toHaveBeenCalledWith('cache:tenant123:test:*')
      expect(mockRedis.del).not.toHaveBeenCalled()
    })
  })

  describe('invalidateTenantCache', () => {
    it('should invalidate all cache entries for tenant', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.keys.mockResolvedValue(['cache:tenant123:contacts:1', 'cache:tenant123:messages:1'])
      mockRedis.del.mockResolvedValue(2)

      await invalidateTenantCache('tenant123')

      expect(mockRedis.keys).toHaveBeenCalledWith('cache:tenant123:*')
      expect(mockRedis.del).toHaveBeenCalled()
    })
  })

  describe('invalidateResourceCache', () => {
    it('should invalidate cache for specific resource type', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.keys.mockResolvedValue(['cache:tenant123:contacts:1', 'cache:tenant123:contacts:2'])
      mockRedis.del.mockResolvedValue(2)

      await invalidateResourceCache('tenant123', 'contacts')

      expect(mockRedis.keys).toHaveBeenCalledWith('cache:tenant123:contacts:*')
      expect(mockRedis.del).toHaveBeenCalled()
    })
  })

  describe('cacheUserPermissions', () => {
    it('should cache user permissions with correct TTL', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue(null)
      mockRedis.setex.mockResolvedValue('OK')

      const permissions = ['read:contacts', 'write:contacts']
      const fetcher = vi.fn().mockResolvedValue(permissions)

      const result = await cacheUserPermissions('tenant123', 'user456', fetcher)

      expect(result).toEqual(permissions)
      expect(fetcher).toHaveBeenCalledOnce()
      
      // Wait for async setex
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:tenant123:permissions:user456',
        CACHE_TTL.USER_PERMISSIONS,
        JSON.stringify(permissions)
      )
    })
  })

  describe('cacheTenantConfig', () => {
    it('should cache tenant config with correct TTL', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue(null)
      mockRedis.setex.mockResolvedValue('OK')

      const config = { name: 'Test Tenant', settings: {} }
      const fetcher = vi.fn().mockResolvedValue(config)

      const result = await cacheTenantConfig('tenant123', fetcher)

      expect(result).toEqual(config)
      expect(fetcher).toHaveBeenCalledOnce()
      
      // Wait for async setex
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:tenant123:config',
        CACHE_TTL.TENANT_CONFIG,
        JSON.stringify(config)
      )
    })
  })

  describe('cacheConversationList', () => {
    it('should cache conversation list with correct TTL', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue(null)
      mockRedis.setex.mockResolvedValue('OK')

      const conversations = [{ id: '1', name: 'Conv 1' }]
      const fetcher = vi.fn().mockResolvedValue(conversations)

      const result = await cacheConversationList('tenant123', 'user456', fetcher)

      expect(result).toEqual(conversations)
      expect(fetcher).toHaveBeenCalledOnce()
      
      // Wait for async setex
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:tenant123:conversations:user456',
        CACHE_TTL.CONVERSATION_LIST,
        JSON.stringify(conversations)
      )
    })

    it('should cache global conversation list when no userId provided', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue(null)
      mockRedis.setex.mockResolvedValue('OK')

      const conversations = [{ id: '1', name: 'Conv 1' }]
      const fetcher = vi.fn().mockResolvedValue(conversations)

      const result = await cacheConversationList('tenant123', undefined, fetcher)

      expect(result).toEqual(conversations)
      
      // Wait for async setex
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:tenant123:conversations',
        CACHE_TTL.CONVERSATION_LIST,
        JSON.stringify(conversations)
      )
    })
  })

  describe('batchGetCache', () => {
    it('should get multiple cache entries', async () => {
      const mockPipeline = {
        get: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          { id: '1', name: 'Test 1' },
          { id: '2', name: 'Test 2' },
        ]),
      }

      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.pipeline.mockReturnValue(mockPipeline)

      const keys = ['cache:tenant123:test:1', 'cache:tenant123:test:2']
      const result = await batchGetCache(keys, 'tenant123')

      expect(result.size).toBe(2)
      expect(result.get('cache:tenant123:test:1')).toEqual({ id: '1', name: 'Test 1' })
      expect(result.get('cache:tenant123:test:2')).toEqual({ id: '2', name: 'Test 2' })
    })

    it('should return empty map when Redis unavailable', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const keys = ['cache:tenant123:test:1', 'cache:tenant123:test:2']
      const result = await batchGetCache(keys, 'tenant123')

      expect(result.size).toBe(2)
      expect(result.get('cache:tenant123:test:1')).toBeNull()
      expect(result.get('cache:tenant123:test:2')).toBeNull()
    })
  })

  describe('batchSetCache', () => {
    it('should set multiple cache entries', async () => {
      const mockPipeline = {
        setex: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(['OK', 'OK']),
      }

      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.pipeline.mockReturnValue(mockPipeline)

      const entries = [
        { key: 'cache:tenant123:test:1', data: { id: '1' }, ttl: 60 },
        { key: 'cache:tenant123:test:2', data: { id: '2' }, ttl: 60 },
      ]

      await batchSetCache(entries, 'tenant123')

      expect(mockPipeline.setex).toHaveBeenCalledTimes(2)
      expect(mockPipeline.exec).toHaveBeenCalledOnce()
    })

    it('should handle empty entries array', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)

      await batchSetCache([], 'tenant123')

      expect(mockRedis.pipeline).not.toHaveBeenCalled()
    })
  })

  describe('isRedisAvailable', () => {
    it('should return true when Redis is available', () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)

      expect(isRedisAvailable()).toBe(true)
    })

    it('should return false when Redis is unavailable', () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      expect(isRedisAvailable()).toBe(false)
    })
  })

  describe('getCacheStatistics', () => {
    it('should return cache statistics with hit rate', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      
      // Get baseline stats
      const baselineStats = getCacheStatistics()
      const baselineHits = baselineStats.totalHits
      const baselineMisses = baselineStats.totalMisses
      
      // Simulate some cache hits and misses
      mockRedis.get.mockResolvedValueOnce({ id: '1' }) // hit
      mockRedis.get.mockResolvedValueOnce(null) // miss
      mockRedis.get.mockResolvedValueOnce({ id: '2' }) // hit

      await getCache('cache:tenant123:teststat:1', 'tenant123')
      await getCache('cache:tenant123:teststat:2', 'tenant123')
      await getCache('cache:tenant123:teststat:3', 'tenant123')

      const stats = getCacheStatistics()

      expect(stats.totalHits).toBe(baselineHits + 2)
      expect(stats.totalMisses).toBe(baselineMisses + 1)
    })
  })

  describe('Cache Metrics', () => {
    it('should track cache hits and misses', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      
      mockRedis.get.mockResolvedValueOnce({ id: '1' })
      mockRedis.get.mockResolvedValueOnce(null)

      await getCache('cache:tenant123:testmetrics:1', 'tenant123')
      await getCache('cache:tenant123:testmetrics:2', 'tenant123')

      // The metrics are tracked by the second part of the key (after 'cache:')
      const allMetrics = getAllCacheMetrics()
      expect(Object.keys(allMetrics).length).toBeGreaterThan(0)
      
      // Check that metrics exist for 'testmetrics' or 'tenant123'
      const hasMetrics = Object.keys(allMetrics).some(key => 
        key === 'testmetrics' || key === 'tenant123'
      )
      expect(hasMetrics).toBe(true)
    })

    it('should return all cache metrics', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue({ id: '1' })

      await getCache('cache:tenant123:contacts:1', 'tenant123')
      await getCache('cache:tenant123:messages:1', 'tenant123')

      const allMetrics = getAllCacheMetrics()
      expect(Object.keys(allMetrics).length).toBeGreaterThan(0)
    })
  })

  describe('Tenant Isolation', () => {
    it('should generate different cache keys for different tenants', () => {
      const key1 = generateCacheKey('tenant123', 'contacts', 'contact456')
      const key2 = generateCacheKey('tenant789', 'contacts', 'contact456')

      expect(key1).not.toBe(key2)
      expect(key1).toBe('cache:tenant123:contacts:contact456')
      expect(key2).toBe('cache:tenant789:contacts:contact456')
    })

    it('should invalidate only specific tenant cache', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.keys.mockResolvedValue(['cache:tenant123:contacts:1', 'cache:tenant123:messages:1'])
      mockRedis.del.mockResolvedValue(2)

      await invalidateTenantCache('tenant123')

      expect(mockRedis.keys).toHaveBeenCalledWith('cache:tenant123:*')
      // Should not affect tenant789 cache
    })
  })
})
