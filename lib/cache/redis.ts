// lib/cache/redis.ts
import { Redis } from '@upstash/redis'

/**
 * Redis Cache Client
 * Uses Upstash Redis for serverless-friendly caching
 * 
 * Setup:
 * 1. Create Upstash Redis database at https://upstash.com
 * 2. Add to .env:
 *    UPSTASH_REDIS_REST_URL=your_url
 *    UPSTASH_REDIS_REST_TOKEN=your_token
 */

let redis: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('⚠️  Redis not configured. Caching disabled.')
    return null
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }

  return redis
}

/**
 * Cache key generator
 */
export function getCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `dashboard:${prefix}:${parts.join(':')}`
}

/**
 * Get cached data
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const data = await client.get<T>(key)
    if (data) {
      console.log(`✅ Cache HIT: ${key}`)
    } else {
      console.log(`❌ Cache MISS: ${key}`)
    }
    return data
  } catch (error) {
    console.error('Redis GET error:', error)
    return null
  }
}

/**
 * Set cached data with TTL
 */
export async function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number = 30
): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(data))
    console.log(`✅ Cache SET: ${key} (TTL: ${ttlSeconds}s)`)
  } catch (error) {
    console.error('Redis SET error:', error)
  }
}

/**
 * Delete cached data
 */
export async function deleteCached(key: string): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    await client.del(key)
    console.log(`✅ Cache DELETE: ${key}`)
  } catch (error) {
    console.error('Redis DELETE error:', error)
  }
}

/**
 * Delete multiple cached keys by pattern
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
      console.log(`✅ Cache DELETE pattern: ${pattern} (${keys.length} keys)`)
    }
  } catch (error) {
    console.error('Redis DELETE pattern error:', error)
  }
}

/**
 * Cache wrapper function
 * Automatically handles cache get/set with fallback to data fetcher
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 30
): Promise<T> {
  // Try to get from cache
  const cached = await getCached<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()

  // Store in cache
  await setCached(key, data, ttlSeconds)

  return data
}

/**
 * Invalidate all dashboard caches
 */
export async function invalidateDashboardCache(): Promise<void> {
  await deleteCachedPattern('dashboard:*')
}

/**
 * Invalidate specific dashboard section cache
 */
export async function invalidateSectionCache(section: string): Promise<void> {
  await deleteCachedPattern(`dashboard:${section}:*`)
}
