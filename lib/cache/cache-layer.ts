/**
 * Cache Layer
 * 
 * Provides caching utilities with:
 * - Cache-aside pattern for read operations
 * - Tenant-specific cache keys for isolation
 * - Cache invalidation on data updates
 * - Graceful degradation when Redis unavailable
 * - Cache hit/miss metrics tracking
 * 
 * Requirements: 10.1, 10.5, 10.6, 10.7
 */

import { getRedisClient } from './redis'
import { logger } from '@/lib/monitoring/logger'

/**
 * Cache configuration for different resource types
 */
export const CACHE_TTL = {
  USER_PERMISSIONS: 5 * 60, // 5 minutes (Requirement 10.2)
  TENANT_CONFIG: 10 * 60, // 10 minutes (Requirement 10.3)
  CONVERSATION_LIST: 30, // 30 seconds (Requirement 10.4)
  CONTACT_DATA: 1 * 60, // 1 minute (Task 22.2)
  MESSAGE_DATA: 1 * 60, // 1 minute
  BROADCAST_DATA: 5 * 60, // 5 minutes
  QUERY_RESULTS: 2 * 60, // 2 minutes - for expensive query results (Requirement 12.6)
  SEARCH_RESULTS: 1 * 60, // 1 minute - for search query results
  AGGREGATE_DATA: 5 * 60, // 5 minutes - for aggregated statistics
} as const

/**
 * Cache metrics for monitoring
 */
interface CacheMetrics {
  hits: number
  misses: number
  errors: number
  lastUpdated: number
}

const metrics: Map<string, CacheMetrics> = new Map()

/**
 * Generate tenant-specific cache key
 * Requirement 10.7: Use tenant-specific cache keys for isolation
 */
export function generateCacheKey(
  tenantId: string,
  resource: string,
  ...identifiers: (string | number)[]
): string {
  const parts = [tenantId, resource, ...identifiers].filter(Boolean)
  return `cache:${parts.join(':')}`
}

/**
 * Get cache metrics for a specific key prefix
 * Requirement 10.10: Provide cache hit/miss metrics for monitoring
 */
export function getCacheMetrics(keyPrefix: string): CacheMetrics {
  return metrics.get(keyPrefix) || { hits: 0, misses: 0, errors: 0, lastUpdated: Date.now() }
}

/**
 * Update cache metrics
 */
function updateMetrics(keyPrefix: string, type: 'hit' | 'miss' | 'error'): void {
  const current = metrics.get(keyPrefix) || { hits: 0, misses: 0, errors: 0, lastUpdated: Date.now() }
  
  if (type === 'hit') current.hits++
  else if (type === 'miss') current.misses++
  else if (type === 'error') current.errors++
  
  current.lastUpdated = Date.now()
  metrics.set(keyPrefix, current)
}

/**
 * Get all cache metrics
 */
export function getAllCacheMetrics(): Record<string, CacheMetrics> {
  const result: Record<string, CacheMetrics> = {}
  metrics.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/**
 * Cache-aside pattern implementation
 * Requirement 10.5: Implement cache-aside pattern for read operations
 * 
 * @param key - Cache key
 * @param fetcher - Function to fetch data on cache miss
 * @param ttlSeconds - Time to live in seconds
 * @param tenantId - Tenant ID for logging
 * @returns Cached or freshly fetched data
 */
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  tenantId?: string
): Promise<T> {
  const redis = getRedisClient()
  const keyPrefix = key.split(':')[1] || 'unknown'

  // Requirement 10.9: Handle Redis connection failures gracefully
  if (!redis) {
    logger.warn({ key, tenantId }, 'Redis unavailable, bypassing cache')
    return await fetcher()
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key)
    
    if (cached !== null && cached !== undefined) {
      updateMetrics(keyPrefix, 'hit')
      logger.debug({ key, tenantId }, 'Cache hit')
      return cached
    }

    // Cache miss - fetch fresh data
    updateMetrics(keyPrefix, 'miss')
    logger.debug({ key, tenantId }, 'Cache miss')
    
    const data = await fetcher()

    // Store in cache (fire and forget to not block response)
    redis.setex(key, ttlSeconds, JSON.stringify(data)).catch((error) => {
      logger.error({ key, error: error.message, tenantId }, 'Failed to set cache')
      updateMetrics(keyPrefix, 'error')
    })

    return data
  } catch (error) {
    // Requirement 10.9: Graceful degradation on Redis errors
    updateMetrics(keyPrefix, 'error')
    logger.error({
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
    }, 'Cache operation failed, falling back to fetcher')
    return await fetcher()
  }
}

/**
 * Get data from cache
 * 
 * @param key - Cache key
 * @param tenantId - Tenant ID for logging
 * @returns Cached data or null
 */
export async function getCache<T>(key: string, tenantId?: string): Promise<T | null> {
  const redis = getRedisClient()
  const keyPrefix = key.split(':')[1] || 'unknown'

  if (!redis) {
    return null
  }

  try {
    const data = await redis.get<T>(key)
    
    if (data !== null && data !== undefined) {
      updateMetrics(keyPrefix, 'hit')
      logger.debug({ key, tenantId }, 'Cache hit')
      return data
    }

    updateMetrics(keyPrefix, 'miss')
    return null
  } catch (error) {
    updateMetrics(keyPrefix, 'error')
    logger.error({
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
    }, 'Failed to get from cache')
    return null
  }
}

/**
 * Set data in cache
 * 
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlSeconds - Time to live in seconds
 * @param tenantId - Tenant ID for logging
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number,
  tenantId?: string
): Promise<void> {
  const redis = getRedisClient()

  if (!redis) {
    return
  }

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
    logger.debug({ key, ttl: ttlSeconds, tenantId }, 'Cache set')
  } catch (error) {
    const keyPrefix = key.split(':')[1] || 'unknown'
    updateMetrics(keyPrefix, 'error')
    logger.error({
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
    }, 'Failed to set cache')
  }
}

/**
 * Invalidate cache entry
 * Requirement 10.6: Invalidate cache on data updates
 * 
 * @param key - Cache key to invalidate
 * @param tenantId - Tenant ID for logging
 */
export async function invalidateCache(key: string, tenantId?: string): Promise<void> {
  const redis = getRedisClient()

  if (!redis) {
    return
  }

  try {
    await redis.del(key)
    logger.debug({ key, tenantId }, 'Cache invalidated')
  } catch (error) {
    logger.error({
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
    }, 'Failed to invalidate cache')
  }
}

/**
 * Invalidate multiple cache entries by pattern
 * Requirement 10.6: Invalidate cache on data updates
 * 
 * @param pattern - Cache key pattern (e.g., "cache:tenant123:contacts:*")
 * @param tenantId - Tenant ID for logging
 */
export async function invalidateCachePattern(pattern: string, tenantId?: string): Promise<void> {
  const redis = getRedisClient()

  if (!redis) {
    return
  }

  try {
    const keys = await redis.keys(pattern)
    
    if (keys.length > 0) {
      await redis.del(...keys)
      logger.debug({ pattern, count: keys.length, tenantId }, 'Cache pattern invalidated')
    }
  } catch (error) {
    logger.error({
      pattern,
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
    }, 'Failed to invalidate cache pattern')
  }
}

/**
 * Invalidate all cache entries for a tenant
 * Requirement 10.6: Invalidate cache on data updates
 * Requirement 10.7: Tenant-specific cache keys
 * 
 * @param tenantId - Tenant ID
 */
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  const pattern = `cache:${tenantId}:*`
  await invalidateCachePattern(pattern, tenantId)
}

/**
 * Invalidate cache for a specific resource type across a tenant
 * 
 * @param tenantId - Tenant ID
 * @param resource - Resource type (e.g., "contacts", "messages")
 */
export async function invalidateResourceCache(tenantId: string, resource: string): Promise<void> {
  const pattern = `cache:${tenantId}:${resource}:*`
  await invalidateCachePattern(pattern, tenantId)
}

/**
 * Cache wrapper for user permissions
 * Requirement 10.2: Cache user permissions for 5 minutes
 * 
 * @param tenantId - Tenant ID
 * @param userId - User ID
 * @param fetcher - Function to fetch permissions
 * @returns User permissions
 */
export async function cacheUserPermissions(
  tenantId: string,
  userId: string,
  fetcher: () => Promise<string[]>
): Promise<string[]> {
  const key = generateCacheKey(tenantId, 'permissions', userId)
  return cacheAside(key, fetcher, CACHE_TTL.USER_PERMISSIONS, tenantId)
}

/**
 * Cache wrapper for tenant configuration
 * Requirement 10.3: Cache tenant configuration for 10 minutes
 * 
 * @param tenantId - Tenant ID
 * @param fetcher - Function to fetch tenant config
 * @returns Tenant configuration
 */
export async function cacheTenantConfig<T>(
  tenantId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(tenantId, 'config')
  return cacheAside(key, fetcher, CACHE_TTL.TENANT_CONFIG, tenantId)
}

/**
 * Cache wrapper for conversation list
 * Requirement 10.4: Cache conversation lists for 30 seconds
 * 
 * @param tenantId - Tenant ID
 * @param userId - User ID (optional, for user-specific lists)
 * @param fetcher - Function to fetch conversations
 * @returns Conversation list
 */
export async function cacheConversationList<T>(
  tenantId: string,
  userId: string | undefined,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = userId
    ? generateCacheKey(tenantId, 'conversations', userId)
    : generateCacheKey(tenantId, 'conversations')
  return cacheAside(key, fetcher, CACHE_TTL.CONVERSATION_LIST, tenantId)
}

/**
 * Cache wrapper for contact data
 * 
 * @param tenantId - Tenant ID
 * @param contactId - Contact ID
 * @param fetcher - Function to fetch contact
 * @returns Contact data
 */
export async function cacheContactData<T>(
  tenantId: string,
  contactId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(tenantId, 'contacts', contactId)
  return cacheAside(key, fetcher, CACHE_TTL.CONTACT_DATA, tenantId)
}

/**
 * Cache wrapper for message data
 * 
 * @param tenantId - Tenant ID
 * @param messageId - Message ID
 * @param fetcher - Function to fetch message
 * @returns Message data
 */
export async function cacheMessageData<T>(
  tenantId: string,
  messageId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(tenantId, 'messages', messageId)
  return cacheAside(key, fetcher, CACHE_TTL.MESSAGE_DATA, tenantId)
}

/**
 * Cache wrapper for broadcast data
 * 
 * @param tenantId - Tenant ID
 * @param broadcastId - Broadcast ID
 * @param fetcher - Function to fetch broadcast
 * @returns Broadcast data
 */
export async function cacheBroadcastData<T>(
  tenantId: string,
  broadcastId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(tenantId, 'broadcasts', broadcastId)
  return cacheAside(key, fetcher, CACHE_TTL.BROADCAST_DATA, tenantId)
}

/**
 * Batch cache operations
 * Get multiple cache entries at once
 * 
 * @param keys - Array of cache keys
 * @param tenantId - Tenant ID for logging
 * @returns Map of key to cached value
 */
export async function batchGetCache<T>(
  keys: string[],
  tenantId?: string
): Promise<Map<string, T | null>> {
  const redis = getRedisClient()
  const result = new Map<string, T | null>()

  if (!redis || keys.length === 0) {
    keys.forEach((key) => result.set(key, null))
    return result
  }

  try {
    // Use pipeline for batch operations
    const pipeline = redis.pipeline()
    keys.forEach((key) => pipeline.get(key))
    
    const responses = await pipeline.exec()
    
    keys.forEach((key, index) => {
      const value = responses[index] as T | null
      result.set(key, value)
      
      const keyPrefix = key.split(':')[1] || 'unknown'
      if (value !== null && value !== undefined) {
        updateMetrics(keyPrefix, 'hit')
      } else {
        updateMetrics(keyPrefix, 'miss')
      }
    })

    logger.debug({ count: keys.length, tenantId }, 'Batch cache get')
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
    }, 'Batch cache get failed')
    keys.forEach((key) => result.set(key, null))
  }

  return result
}

/**
 * Batch set cache entries
 * 
 * @param entries - Array of cache entries with key, data, and TTL
 * @param tenantId - Tenant ID for logging
 */
export async function batchSetCache<T>(
  entries: Array<{ key: string; data: T; ttl: number }>,
  tenantId?: string
): Promise<void> {
  const redis = getRedisClient()

  if (!redis || entries.length === 0) {
    return
  }

  try {
    const pipeline = redis.pipeline()
    entries.forEach(({ key, data, ttl }) => {
      pipeline.setex(key, ttl, JSON.stringify(data))
    })
    
    await pipeline.exec()
    logger.debug({ count: entries.length, tenantId }, 'Batch cache set')
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
    }, 'Batch cache set failed')
  }
}

/**
 * Check if Redis is available
 * 
 * @returns True if Redis is available, false otherwise
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null
}

/**
 * Get cache statistics
 * 
 * @returns Cache statistics including hit rate
 */
export function getCacheStatistics(): {
  totalHits: number
  totalMisses: number
  totalErrors: number
  hitRate: number
  resources: Record<string, CacheMetrics & { hitRate: number }>
} {
  let totalHits = 0
  let totalMisses = 0
  let totalErrors = 0
  const resources: Record<string, CacheMetrics & { hitRate: number }> = {}

  metrics.forEach((value, key) => {
    totalHits += value.hits
    totalMisses += value.misses
    totalErrors += value.errors
    
    const total = value.hits + value.misses
    const hitRate = total > 0 ? (value.hits / total) * 100 : 0
    
    resources[key] = {
      ...value,
      hitRate,
    }
  })

  const total = totalHits + totalMisses
  const hitRate = total > 0 ? (totalHits / total) * 100 : 0

  return {
    totalHits,
    totalMisses,
    totalErrors,
    hitRate,
    resources,
  }
}
