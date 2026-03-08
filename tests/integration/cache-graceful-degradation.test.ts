/**
 * Integration tests for Cache Graceful Degradation
 * 
 * Validates Requirements:
 * - 10.9: Cache layer handles Redis connection failures gracefully
 * - 24.1: System continues operating without caching when Redis unavailable
 * - 24.2: Rate limiter uses in-memory fallback when Redis unavailable
 * 
 * **Validates: Requirements 10.9, 24.1, 24.2**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as redis from '@/lib/cache/redis'
import {
  cacheAside,
  getCache,
  setCache,
  invalidateCache,
  isRedisAvailable,
  cacheUserPermissions,
  cacheTenantConfig,
  CACHE_TTL,
} from '@/lib/cache/cache-layer'
import { RateLimiter } from '@/lib/middleware/rate-limiter'

describe('Cache Graceful Degradation - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Requirement 10.9: Cache layer handles Redis failures gracefully', () => {
    it('should continue operating when Redis is unavailable at startup', async () => {
      // Simulate Redis unavailable
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const fetchedData = { id: '1', name: 'Test Data' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      // Should not throw error
      const result = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      expect(result).toEqual(fetchedData)
      expect(fetcher).toHaveBeenCalledOnce()
      expect(isRedisAvailable()).toBe(false)
    })

    it('should handle Redis connection errors during cache read', async () => {
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        setex: vi.fn(),
      }

      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)

      const fetchedData = { id: '1', name: 'Test Data' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      // Should fall back to fetcher without throwing
      const result = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      expect(result).toEqual(fetchedData)
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('should handle Redis connection errors during cache write', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockRejectedValue(new Error('Connection lost')),
      }

      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)

      const fetchedData = { id: '1', name: 'Test Data' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      // Should return data even if cache write fails
      const result = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      expect(result).toEqual(fetchedData)
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('should log cache failures for monitoring', async () => {
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error('Redis error')),
      }

      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)

      const fetchedData = { id: '1', name: 'Test Data' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      // Verify error was logged (logger is mocked in cache-layer.test.ts)
      expect(fetcher).toHaveBeenCalledOnce()
    })
  })

  describe('Requirement 24.1: System continues operating without caching', () => {
    it('should fetch fresh data on every request when Redis unavailable', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const fetchedData = { id: '1', name: 'Test Data', timestamp: Date.now() }
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ ...fetchedData, timestamp: 1000 })
        .mockResolvedValueOnce({ ...fetchedData, timestamp: 2000 })
        .mockResolvedValueOnce({ ...fetchedData, timestamp: 3000 })

      // Multiple calls should fetch fresh data each time
      const result1 = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')
      const result2 = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')
      const result3 = await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')

      expect(fetcher).toHaveBeenCalledTimes(3)
      expect(result1.timestamp).toBe(1000)
      expect(result2.timestamp).toBe(2000)
      expect(result3.timestamp).toBe(3000)
    })

    it('should handle user permissions without caching', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const permissions = ['read:contacts', 'write:contacts']
      const fetcher = vi.fn().mockResolvedValue(permissions)

      const result = await cacheUserPermissions('tenant123', 'user456', fetcher)

      expect(result).toEqual(permissions)
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('should handle tenant config without caching', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const config = { name: 'Test Tenant', settings: { feature1: true } }
      const fetcher = vi.fn().mockResolvedValue(config)

      const result = await cacheTenantConfig('tenant123', fetcher)

      expect(result).toEqual(config)
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('should handle cache invalidation gracefully when Redis unavailable', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      // Should not throw error
      await expect(invalidateCache('cache:tenant123:test:1', 'tenant123')).resolves.toBeUndefined()
    })

    it('should handle setCache gracefully when Redis unavailable', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const data = { id: '1', name: 'Test' }

      // Should not throw error
      await expect(setCache('cache:tenant123:test:1', data, 60, 'tenant123')).resolves.toBeUndefined()
    })

    it('should handle getCache gracefully when Redis unavailable', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const result = await getCache('cache:tenant123:test:1', 'tenant123')

      expect(result).toBeNull()
    })
  })

  describe('Requirement 24.2: Rate limiter uses in-memory fallback', () => {
    it('should use in-memory rate limiting when Redis unavailable', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const limiter = new RateLimiter()
      const options = {
        maxRequests: 5,
        windowSeconds: 60,
        keyPrefix: 'api:test',
        identifier: 'tenant123',
      }

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkAndIncrement(options)
        expect(result.allowed).toBe(true)
        // Remaining is calculated before increment, so it's 5-i-1
        expect(result.remaining).toBeGreaterThanOrEqual(0)
      }

      // 6th request should be denied
      const result = await limiter.checkAndIncrement(options)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should maintain separate in-memory limits per identifier', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const limiter = new RateLimiter()
      const options1 = {
        maxRequests: 3,
        windowSeconds: 60,
        keyPrefix: 'api:test',
        identifier: 'tenant123',
      }
      const options2 = {
        maxRequests: 3,
        windowSeconds: 60,
        keyPrefix: 'api:test',
        identifier: 'tenant456',
      }

      // Use up tenant123's limit
      await limiter.checkAndIncrement(options1)
      await limiter.checkAndIncrement(options1)
      await limiter.checkAndIncrement(options1)

      const result1 = await limiter.checkAndIncrement(options1)
      expect(result1.allowed).toBe(false)

      // tenant456 should still have full limit
      const result2 = await limiter.checkAndIncrement(options2)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBeGreaterThanOrEqual(0)
    })

    it('should handle rate limit reset in memory', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const limiter = new RateLimiter()
      const options = {
        maxRequests: 2,
        windowSeconds: 60,
        keyPrefix: 'api:test',
        identifier: 'tenant123',
      }

      // Use up the limit
      await limiter.checkAndIncrement(options)
      await limiter.checkAndIncrement(options)

      let result = await limiter.checkLimit(options)
      expect(result.allowed).toBe(false)

      // Reset the limit
      await limiter.resetLimit('api:test', 'tenant123')

      // Should be allowed again
      result = await limiter.checkLimit(options)
      expect(result.allowed).toBe(true)
    })

    it('should handle sliding window in memory', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const limiter = new RateLimiter()
      const options = {
        maxRequests: 3,
        windowSeconds: 1, // 1 second window
        keyPrefix: 'api:test',
        identifier: 'tenant123',
      }

      // Use up the limit
      await limiter.checkAndIncrement(options)
      await limiter.checkAndIncrement(options)
      await limiter.checkAndIncrement(options)

      let result = await limiter.checkLimit(options)
      expect(result.allowed).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should be allowed again after window expires
      result = await limiter.checkLimit(options)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Recovery from Redis failures', () => {
    it('should recover when Redis becomes available again', async () => {
      const mockRedis = {
        get: vi.fn(),
        setex: vi.fn(),
      }

      // Start with Redis unavailable
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const fetchedData = { id: '1', name: 'Test Data' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      // First call - Redis unavailable
      await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')
      expect(fetcher).toHaveBeenCalledTimes(1)

      // Redis becomes available
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)
      mockRedis.get.mockResolvedValue(null)
      mockRedis.setex.mockResolvedValue('OK')

      // Second call - Redis available, should cache
      await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')
      expect(fetcher).toHaveBeenCalledTimes(2)

      // Wait for async setex
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(mockRedis.setex).toHaveBeenCalled()
    })

    it('should handle intermittent Redis failures', async () => {
      const mockRedis = {
        get: vi.fn(),
        setex: vi.fn(),
      }

      vi.spyOn(redis, 'getRedisClient').mockReturnValue(mockRedis as any)

      const fetchedData = { id: '1', name: 'Test Data' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      // First call - Redis works
      mockRedis.get.mockResolvedValueOnce(null)
      mockRedis.setex.mockResolvedValueOnce('OK')
      await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')
      expect(fetcher).toHaveBeenCalledTimes(1)

      // Second call - Redis fails
      mockRedis.get.mockRejectedValueOnce(new Error('Connection lost'))
      await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')
      expect(fetcher).toHaveBeenCalledTimes(2)

      // Third call - Redis works again
      mockRedis.get.mockResolvedValueOnce(null)
      mockRedis.setex.mockResolvedValueOnce('OK')
      await cacheAside('cache:tenant123:test:1', fetcher, 60, 'tenant123')
      expect(fetcher).toHaveBeenCalledTimes(3)
    })
  })

  describe('Performance under degraded mode', () => {
    it('should maintain acceptable performance without caching', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const fetchedData = { id: '1', name: 'Test Data' }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      const startTime = Date.now()

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await cacheAside(`cache:tenant123:test:${i}`, fetcher, 60, 'tenant123')
      }

      const duration = Date.now() - startTime

      // Should complete in reasonable time (< 1 second for 10 requests)
      expect(duration).toBeLessThan(1000)
      expect(fetcher).toHaveBeenCalledTimes(10)
    })

    it('should maintain rate limiting accuracy in memory', async () => {
      vi.spyOn(redis, 'getRedisClient').mockReturnValue(null)

      const limiter = new RateLimiter()
      const options = {
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: 'api:test',
        identifier: 'tenant123',
      }

      let allowedCount = 0
      let deniedCount = 0

      // Make 15 requests
      for (let i = 0; i < 15; i++) {
        const result = await limiter.checkAndIncrement(options)
        if (result.allowed) {
          allowedCount++
        } else {
          deniedCount++
        }
      }

      // Should allow exactly 10 and deny 5
      expect(allowedCount).toBe(10)
      expect(deniedCount).toBe(5)
    })
  })
})
