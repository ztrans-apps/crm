# Cache Graceful Degradation

## Overview

The cache layer implements graceful degradation to ensure the system continues operating when Redis is unavailable. This document describes how the system handles Redis failures and maintains functionality.

## Requirements Addressed

- **Requirement 10.9**: Cache layer handles Redis connection failures gracefully
- **Requirement 24.1**: System continues operating without caching when Redis unavailable
- **Requirement 24.2**: Rate limiter uses in-memory fallback when Redis unavailable

## Implementation

### Cache Layer Graceful Degradation

The cache layer (`lib/cache/cache-layer.ts`) implements multiple strategies for handling Redis failures:

#### 1. Redis Unavailable at Startup

When Redis is not configured or unavailable at startup:
- `getRedisClient()` returns `null`
- All cache operations bypass Redis and call the data fetcher directly
- System logs a warning: "Redis unavailable, bypassing cache"
- No errors are thrown - the system continues operating normally

```typescript
if (!redis) {
  logger.warn({ key, tenantId }, 'Redis unavailable, bypassing cache')
  return await fetcher()
}
```

#### 2. Redis Connection Errors During Operations

When Redis fails during cache operations:
- Errors are caught and logged
- System falls back to calling the data fetcher
- Cache metrics track errors for monitoring
- No exceptions propagate to the caller

```typescript
try {
  const cached = await redis.get<T>(key)
  // ... cache logic
} catch (error) {
  updateMetrics(keyPrefix, 'error')
  logger.error({ key, error: error.message, tenantId }, 
    'Cache operation failed, falling back to fetcher')
  return await fetcher()
}
```

#### 3. Cache Write Failures

When cache writes fail:
- Write operations are fire-and-forget (non-blocking)
- Errors are logged but don't affect the response
- System continues serving data from the fetcher

```typescript
redis.setex(key, ttlSeconds, JSON.stringify(data)).catch((error) => {
  logger.error({ key, error: error.message, tenantId }, 'Failed to set cache')
  updateMetrics(keyPrefix, 'error')
})
```

### Rate Limiter In-Memory Fallback

The rate limiter (`lib/middleware/rate-limiter.ts`) includes a complete in-memory implementation:

#### InMemoryRateLimiter Class

- Uses a `Map<string, number[]>` to track request timestamps
- Implements sliding window algorithm in memory
- Automatically cleans up expired entries every 5 minutes
- Provides identical interface to Redis-based limiter

```typescript
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  checkLimit(options: RateLimitOptions): RateLimitResult {
    // Filter timestamps within sliding window
    // Calculate allowed/remaining/reset
  }
  
  incrementCounter(options: RateLimitOptions): void {
    // Add current timestamp to the map
  }
}
```

#### Automatic Fallback

The `RateLimiter` class automatically falls back to in-memory when:
- Redis is unavailable at startup
- Redis connection fails during operations

```typescript
async checkLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  if (!this.redis) {
    return inMemoryLimiter.checkLimit(options)
  }
  
  try {
    // Redis-based rate limiting
  } catch (error) {
    console.error('Redis rate limit check error, falling back to in-memory:', error)
    return inMemoryLimiter.checkLimit(options)
  }
}
```

## Monitoring and Observability

### Cache Metrics

The cache layer tracks metrics for monitoring degraded operation:

```typescript
interface CacheMetrics {
  hits: number      // Successful cache retrievals
  misses: number    // Cache misses (data fetched)
  errors: number    // Redis operation failures
  lastUpdated: number
}
```

Access metrics via:
- `getCacheMetrics(keyPrefix)` - Metrics for specific resource type
- `getAllCacheMetrics()` - All metrics across resources
- `getCacheStatistics()` - Aggregated statistics with hit rates

### Logging

All cache failures are logged with structured data:

```typescript
logger.warn({ key, tenantId }, 'Redis unavailable, bypassing cache')
logger.error({ key, error: error.message, tenantId }, 
  'Cache operation failed, falling back to fetcher')
```

Log levels:
- **WARN**: Redis unavailable at startup or configuration missing
- **ERROR**: Redis connection failures during operations
- **DEBUG**: Normal cache hits/misses

## Performance Considerations

### Without Caching

When Redis is unavailable:
- Every request fetches fresh data from the database
- Response times increase (no cache benefit)
- Database load increases
- System remains functional but slower

### In-Memory Rate Limiting

When using in-memory fallback:
- Rate limiting accuracy maintained
- Memory usage increases (stores timestamps)
- Automatic cleanup prevents memory leaks
- Works correctly in single-instance deployments
- **Note**: In multi-instance deployments, each instance has separate limits

## Testing

Comprehensive tests verify graceful degradation:

### Unit Tests (`tests/unit/cache-layer.test.ts`)
- Cache operations with Redis unavailable
- Error handling during cache reads/writes
- Metrics tracking during failures

### Integration Tests (`tests/integration/cache-graceful-degradation.test.ts`)
- End-to-end graceful degradation scenarios
- Rate limiter in-memory fallback
- Recovery when Redis becomes available
- Performance under degraded mode

Run tests:
```bash
npm test -- tests/unit/cache-layer.test.ts --run
npm test -- tests/integration/cache-graceful-degradation.test.ts --run
```

## Recovery

### Automatic Recovery

The system automatically recovers when Redis becomes available:
- Next cache operation will attempt to use Redis
- If successful, caching resumes normally
- No manual intervention required

### Manual Recovery

If Redis issues persist:
1. Check Redis connection configuration
2. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment variables
3. Check Redis service health
4. Review logs for specific error messages

## Best Practices

### For Developers

1. **Always use cache wrapper functions**: Use `cacheAside()`, `cacheUserPermissions()`, etc. instead of direct Redis calls
2. **Don't assume cache availability**: Design code to work without caching
3. **Monitor cache metrics**: Track hit rates and error rates
4. **Test without Redis**: Verify functionality when Redis is unavailable

### For Operations

1. **Monitor cache error rates**: Set up alerts for high error rates
2. **Track cache hit rates**: Declining hit rates may indicate Redis issues
3. **Review logs regularly**: Check for Redis connection warnings
4. **Test failover scenarios**: Periodically test system behavior without Redis

## Configuration

### Redis Configuration

Set environment variables:
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Graceful Degradation (No Configuration Required)

Graceful degradation is built-in and requires no configuration:
- Automatically detects Redis availability
- Falls back to direct database queries
- Uses in-memory rate limiting
- Logs all degraded operations

## Limitations

### In-Memory Rate Limiting

When using in-memory fallback:
- **Multi-instance deployments**: Each instance has separate rate limits (limits are per-instance, not global)
- **Memory usage**: Stores timestamps in memory (cleaned up every 5 minutes)
- **Restart resets**: Rate limit counters reset when application restarts

### Without Caching

When Redis is unavailable:
- **Increased latency**: Every request hits the database
- **Higher database load**: No cache to reduce queries
- **No distributed caching**: Each instance fetches independently

## Related Documentation

- [Cache Layer Usage Guide](./CACHE_LAYER_USAGE.md)
- [Rate Limiter Documentation](../middleware/rate-limiter.md)
- [Monitoring and Observability](../monitoring/README.md)
