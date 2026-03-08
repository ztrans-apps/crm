# Cache TTL Tuning Guide

This document describes the cache TTL (Time To Live) configuration and tuning strategies for optimal performance.

**Requirement**: 12.6 (Tune cache TTLs based on hit rates)

## Overview

Cache TTL determines how long data remains in cache before expiring. Proper TTL tuning balances:
- **Cache hit rate**: Longer TTLs = higher hit rates
- **Data freshness**: Shorter TTLs = fresher data
- **Memory usage**: Longer TTLs = more memory used

**Target**: > 70% cache hit rate across all resources

## Current Cache TTL Configuration

```typescript
export const CACHE_TTL = {
  USER_PERMISSIONS: 5 * 60,      // 5 minutes
  TENANT_CONFIG: 10 * 60,        // 10 minutes
  CONVERSATION_LIST: 30,         // 30 seconds
  CONTACT_DATA: 1 * 60,          // 1 minute
  MESSAGE_DATA: 1 * 60,          // 1 minute
  BROADCAST_DATA: 5 * 60,        // 5 minutes
  QUERY_RESULTS: 2 * 60,         // 2 minutes
  SEARCH_RESULTS: 1 * 60,        // 1 minute
  AGGREGATE_DATA: 5 * 60,        // 5 minutes
}
```

## TTL Tuning Strategy

### 1. Analyze Access Patterns

Monitor cache hit rates per resource type:

```typescript
import { getCacheStatistics } from '@/lib/cache/cache-layer'

const stats = getCacheStatistics()

// Overall statistics
console.log(`Overall hit rate: ${stats.hitRate.toFixed(2)}%`)
console.log(`Total hits: ${stats.totalHits}`)
console.log(`Total misses: ${stats.totalMisses}`)

// Per-resource statistics
Object.entries(stats.resources).forEach(([resource, metrics]) => {
  console.log(`${resource}:`)
  console.log(`  Hit rate: ${metrics.hitRate.toFixed(2)}%`)
  console.log(`  Hits: ${metrics.hits}`)
  console.log(`  Misses: ${metrics.misses}`)
  console.log(`  Errors: ${metrics.errors}`)
})
```

### 2. Identify Low Hit Rate Resources

Resources with < 70% hit rate need TTL adjustment:

```typescript
const stats = getCacheStatistics()

Object.entries(stats.resources).forEach(([resource, metrics]) => {
  if (metrics.hitRate < 70) {
    console.warn(`⚠️  Low hit rate for ${resource}: ${metrics.hitRate.toFixed(2)}%`)
    console.log(`   Consider increasing TTL or implementing cache warming`)
  }
})
```

### 3. Adjust TTLs Based on Data Characteristics

#### High-Frequency Updates (Short TTL)

Data that changes frequently should have short TTLs:

```typescript
// Conversation lists - updated on every message
CONVERSATION_LIST: 30 seconds

// Message data - updated frequently
MESSAGE_DATA: 1 minute

// Contact data - moderate updates
CONTACT_DATA: 1 minute
```

**Indicators for short TTL**:
- High update frequency
- Real-time requirements
- User expects fresh data

#### Low-Frequency Updates (Long TTL)

Data that rarely changes should have long TTLs:

```typescript
// Tenant configuration - rarely changes
TENANT_CONFIG: 10 minutes

// User permissions - changes infrequently
USER_PERMISSIONS: 5 minutes

// Broadcast data - infrequent updates
BROADCAST_DATA: 5 minutes
```

**Indicators for long TTL**:
- Low update frequency
- Configuration data
- Reference data

#### Expensive Queries (Medium TTL)

Expensive queries should balance freshness and performance:

```typescript
// Search results - expensive queries
SEARCH_RESULTS: 1 minute

// Query results - complex aggregations
QUERY_RESULTS: 2 minutes

// Aggregate data - expensive calculations
AGGREGATE_DATA: 5 minutes
```

**Indicators for medium TTL**:
- Expensive database queries
- Complex calculations
- Acceptable staleness

## TTL Tuning Process

### Step 1: Establish Baseline

Run application under normal load for 24 hours:

```bash
# Monitor cache statistics
node scripts/monitor-cache-stats.js --duration 24h
```

### Step 2: Analyze Hit Rates

Review hit rates per resource:

```
Resource Statistics (24 hour period):
┌─────────────────────┬──────────┬────────┬─────────┬──────────┐
│ Resource            │ Hit Rate │ Hits   │ Misses  │ Errors   │
├─────────────────────┼──────────┼────────┼─────────┼──────────┤
│ permissions         │ 85.2%    │ 12,450 │ 2,150   │ 0        │
│ config              │ 92.1%    │ 8,320  │ 710     │ 0        │
│ conversations       │ 65.3%    │ 45,200 │ 24,000  │ 12       │ ⚠️
│ contacts            │ 78.4%    │ 32,100 │ 8,850   │ 5        │
│ messages            │ 71.2%    │ 28,900 │ 11,700  │ 8        │
│ broadcasts          │ 88.5%    │ 5,420  │ 705     │ 0        │
│ search              │ 62.1%    │ 18,300 │ 11,150  │ 15       │ ⚠️
└─────────────────────┴──────────┴────────┴─────────┴──────────┘
```

### Step 3: Identify Issues

Resources with low hit rates:
- **conversations**: 65.3% (target: > 70%)
- **search**: 62.1% (target: > 70%)

### Step 4: Adjust TTLs

Increase TTLs for low hit rate resources:

```typescript
// Before
CONVERSATION_LIST: 30 seconds  // 65.3% hit rate
SEARCH_RESULTS: 1 minute       // 62.1% hit rate

// After
CONVERSATION_LIST: 60 seconds  // Increase to 1 minute
SEARCH_RESULTS: 2 minutes      // Increase to 2 minutes
```

### Step 5: Re-measure

Run application for another 24 hours and compare:

```
Resource Statistics (After TTL adjustment):
┌─────────────────────┬──────────┬────────┬─────────┬──────────┐
│ Resource            │ Hit Rate │ Hits   │ Misses  │ Errors   │
├─────────────────────┼──────────┼────────┼─────────┼──────────┤
│ conversations       │ 73.8%    │ 48,500 │ 17,200  │ 10       │ ✅
│ search              │ 71.5%    │ 21,100 │ 8,400   │ 12       │ ✅
└─────────────────────┴──────────┴────────┴─────────┴──────────┘
```

### Step 6: Iterate

Continue adjusting TTLs until all resources achieve > 70% hit rate.

## Advanced Tuning Strategies

### 1. Dynamic TTL Based on Access Patterns

Adjust TTL based on access frequency:

```typescript
function getDynamicTTL(resource: string, accessCount: number): number {
  const baseTTL = CACHE_TTL[resource]
  
  // Increase TTL for frequently accessed data
  if (accessCount > 1000) {
    return baseTTL * 2
  }
  
  // Decrease TTL for rarely accessed data
  if (accessCount < 100) {
    return baseTTL * 0.5
  }
  
  return baseTTL
}
```

### 2. Time-Based TTL Adjustment

Adjust TTL based on time of day:

```typescript
function getTimeBasedTTL(resource: string): number {
  const hour = new Date().getHours()
  const baseTTL = CACHE_TTL[resource]
  
  // Peak hours (9 AM - 5 PM): Longer TTL
  if (hour >= 9 && hour <= 17) {
    return baseTTL * 1.5
  }
  
  // Off-peak hours: Shorter TTL for fresher data
  return baseTTL
}
```

### 3. Cache Warming

Pre-populate cache for frequently accessed data:

```typescript
async function warmCache(tenantId: string) {
  // Warm user permissions cache
  const users = await getUsersForTenant(tenantId)
  for (const user of users) {
    await cacheUserPermissions(tenantId, user.id, () =>
      fetchUserPermissions(user.id)
    )
  }
  
  // Warm tenant config cache
  await cacheTenantConfig(tenantId, () =>
    fetchTenantConfig(tenantId)
  )
  
  // Warm conversation list cache
  await cacheConversationList(tenantId, undefined, () =>
    fetchConversations(tenantId)
  )
}

// Run cache warming on application startup
warmCache(tenantId)

// Run cache warming periodically
setInterval(() => warmCache(tenantId), 5 * 60 * 1000) // Every 5 minutes
```

### 4. Predictive Cache Invalidation

Invalidate cache before data becomes stale:

```typescript
async function updateContact(id: string, data: ContactUpdate) {
  // Update database
  const contact = await contactRepo.update(id, data)
  
  // Invalidate cache immediately (don't wait for TTL expiration)
  await invalidateResourceCache(tenantId, 'contacts')
  
  // Pre-populate cache with fresh data
  await cacheContactData(tenantId, id, () => Promise.resolve(contact))
  
  return contact
}
```

## Monitoring and Alerting

### Cache Hit Rate Monitoring

Set up continuous monitoring:

```typescript
// lib/monitoring/cache-monitor.ts
import { getCacheStatistics } from '@/lib/cache/cache-layer'

export async function monitorCacheHitRate() {
  const stats = getCacheStatistics()
  
  // Alert if overall hit rate drops below 70%
  if (stats.hitRate < 70) {
    console.warn(`⚠️  Low cache hit rate: ${stats.hitRate.toFixed(2)}%`)
    // Send alert to monitoring system
    await sendAlert({
      type: 'cache_hit_rate_low',
      message: `Cache hit rate dropped to ${stats.hitRate.toFixed(2)}%`,
      severity: 'warning',
    })
  }
  
  // Alert for individual resources with low hit rates
  Object.entries(stats.resources).forEach(([resource, metrics]) => {
    if (metrics.hitRate < 70) {
      console.warn(`⚠️  Low hit rate for ${resource}: ${metrics.hitRate.toFixed(2)}%`)
      // Send alert to monitoring system
      await sendAlert({
        type: 'resource_cache_hit_rate_low',
        message: `${resource} cache hit rate: ${metrics.hitRate.toFixed(2)}%`,
        severity: 'warning',
        metadata: { resource, hitRate: metrics.hitRate },
      })
    }
  })
}

// Run monitoring every 5 minutes
setInterval(monitorCacheHitRate, 5 * 60 * 1000)
```

### Cache Performance Dashboard

Create a dashboard to visualize cache performance:

```typescript
// app/api/admin/cache-stats/route.ts
import { getCacheStatistics } from '@/lib/cache/cache-layer'

export async function GET() {
  const stats = getCacheStatistics()
  
  return Response.json({
    overall: {
      hitRate: stats.hitRate,
      totalHits: stats.totalHits,
      totalMisses: stats.totalMisses,
      totalErrors: stats.totalErrors,
    },
    resources: Object.entries(stats.resources).map(([name, metrics]) => ({
      name,
      hitRate: metrics.hitRate,
      hits: metrics.hits,
      misses: metrics.misses,
      errors: metrics.errors,
      lastUpdated: new Date(metrics.lastUpdated).toISOString(),
    })),
  })
}
```

## TTL Recommendations by Resource Type

### User Data

```typescript
USER_PERMISSIONS: 5 * 60        // 5 minutes
USER_PROFILE: 5 * 60            // 5 minutes
USER_SETTINGS: 10 * 60          // 10 minutes
```

**Rationale**: User data changes infrequently but needs to be reasonably fresh for security.

### Tenant Data

```typescript
TENANT_CONFIG: 10 * 60          // 10 minutes
TENANT_SETTINGS: 10 * 60        // 10 minutes
TENANT_FEATURES: 15 * 60        // 15 minutes
```

**Rationale**: Tenant configuration rarely changes and can be cached longer.

### Conversation Data

```typescript
CONVERSATION_LIST: 60           // 1 minute
CONVERSATION_DETAIL: 2 * 60     // 2 minutes
CONVERSATION_STATS: 5 * 60      // 5 minutes
```

**Rationale**: Conversation lists update frequently, but details and stats can be cached longer.

### Contact Data

```typescript
CONTACT_DATA: 1 * 60            // 1 minute
CONTACT_LIST: 2 * 60            // 2 minutes
CONTACT_SEARCH: 1 * 60          // 1 minute
```

**Rationale**: Contact data has moderate update frequency.

### Message Data

```typescript
MESSAGE_DATA: 1 * 60            // 1 minute
MESSAGE_LIST: 30                // 30 seconds
MESSAGE_STATS: 5 * 60           // 5 minutes
```

**Rationale**: Messages update frequently, but stats can be cached longer.

### Broadcast Data

```typescript
BROADCAST_DATA: 5 * 60          // 5 minutes
BROADCAST_LIST: 2 * 60          // 2 minutes
BROADCAST_STATS: 5 * 60         // 5 minutes
```

**Rationale**: Broadcasts update infrequently once created.

### Query Results

```typescript
SEARCH_RESULTS: 1 * 60          // 1 minute
QUERY_RESULTS: 2 * 60           // 2 minutes
AGGREGATE_DATA: 5 * 60          // 5 minutes
```

**Rationale**: Expensive queries benefit from longer caching.

## Best Practices

### ✅ DO

- Monitor cache hit rates continuously
- Adjust TTLs based on access patterns
- Use longer TTLs for expensive queries
- Implement cache warming for frequently accessed data
- Invalidate cache on data updates
- Set up alerts for low hit rates
- Document TTL decisions

### ❌ DON'T

- Use same TTL for all resources
- Set TTLs too short (< 10 seconds)
- Set TTLs too long (> 1 hour) without monitoring
- Ignore low hit rates
- Cache sensitive data without encryption
- Forget to invalidate cache on updates

## Troubleshooting

### Low Cache Hit Rate

**Symptoms**:
- Hit rate < 70%
- High database load
- Slow response times

**Solutions**:
1. Increase TTL for affected resources
2. Implement cache warming
3. Review cache invalidation strategy
4. Check Redis connectivity
5. Monitor cache key patterns

### Stale Data Issues

**Symptoms**:
- Users seeing outdated data
- Data inconsistencies
- Complaints about data freshness

**Solutions**:
1. Decrease TTL for affected resources
2. Implement immediate cache invalidation on updates
3. Use cache warming to pre-populate fresh data
4. Review update patterns

### High Memory Usage

**Symptoms**:
- Redis memory usage > 80%
- Cache evictions
- Out of memory errors

**Solutions**:
1. Decrease TTLs to reduce memory usage
2. Implement cache key expiration
3. Review cache key patterns
4. Upgrade Redis instance
5. Implement cache size limits

## References

- Requirement 12.6: Tune cache TTLs based on hit rates
- Cache Layer Implementation: `lib/cache/cache-layer.ts`
- Performance Optimization Guide: `docs/PERFORMANCE_OPTIMIZATION.md`
- Redis Best Practices: https://redis.io/docs/manual/patterns/
