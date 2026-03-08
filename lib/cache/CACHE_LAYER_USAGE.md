# Cache Layer Usage Guide

The cache layer provides a comprehensive caching solution with tenant isolation, graceful degradation, and metrics tracking.

## Features

- **Cache-Aside Pattern**: Automatic cache checking and population
- **Tenant Isolation**: Tenant-specific cache keys prevent data leakage
- **Graceful Degradation**: Continues operation when Redis is unavailable
- **Metrics Tracking**: Cache hit/miss rates for monitoring
- **Batch Operations**: Efficient multi-key operations
- **Automatic Invalidation**: Cache invalidation on data updates

## Requirements Satisfied

- **10.1**: Uses Redis (Upstash) for caching
- **10.2**: Caches user permissions for 5 minutes
- **10.3**: Caches tenant configuration for 10 minutes
- **10.4**: Caches conversation lists for 30 seconds
- **10.5**: Implements cache-aside pattern
- **10.6**: Invalidates cache on data updates
- **10.7**: Uses tenant-specific cache keys
- **10.9**: Handles Redis failures gracefully
- **10.10**: Provides cache hit/miss metrics

## Basic Usage

### Cache-Aside Pattern

The most common pattern - automatically checks cache, fetches on miss, and stores result:

```typescript
import { cacheAside, generateCacheKey, CACHE_TTL } from '@/lib/cache/cache-layer'

async function getContact(tenantId: string, contactId: string) {
  const key = generateCacheKey(tenantId, 'contacts', contactId)
  
  return cacheAside(
    key,
    async () => {
      // This function only runs on cache miss
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .single()
      return data
    },
    CACHE_TTL.CONTACT_DATA,
    tenantId
  )
}
```

### Manual Cache Operations

For more control, use individual cache operations:

```typescript
import { getCache, setCache, invalidateCache } from '@/lib/cache/cache-layer'

// Get from cache
const cached = await getCache<Contact>(key, tenantId)

// Set cache
await setCache(key, contactData, 120, tenantId)

// Invalidate cache
await invalidateCache(key, tenantId)
```

## Specialized Cache Functions

### User Permissions

```typescript
import { cacheUserPermissions } from '@/lib/cache/cache-layer'

const permissions = await cacheUserPermissions(
  tenantId,
  userId,
  async () => {
    // Fetch permissions from database
    return await fetchUserPermissions(userId)
  }
)
```

### Tenant Configuration

```typescript
import { cacheTenantConfig } from '@/lib/cache/cache-layer'

const config = await cacheTenantConfig(
  tenantId,
  async () => {
    // Fetch tenant config from database
    return await fetchTenantConfig(tenantId)
  }
)
```

### Conversation List

```typescript
import { cacheConversationList } from '@/lib/cache/cache-layer'

const conversations = await cacheConversationList(
  tenantId,
  userId, // optional - for user-specific lists
  async () => {
    // Fetch conversations from database
    return await fetchConversations(tenantId, userId)
  }
)
```

## Cache Invalidation

### Single Entry

```typescript
import { invalidateCache, generateCacheKey } from '@/lib/cache/cache-layer'

// Invalidate specific contact
const key = generateCacheKey(tenantId, 'contacts', contactId)
await invalidateCache(key, tenantId)
```

### Pattern-Based

```typescript
import { invalidateCachePattern } from '@/lib/cache/cache-layer'

// Invalidate all contacts for a tenant
await invalidateCachePattern(`cache:${tenantId}:contacts:*`, tenantId)
```

### Resource-Based

```typescript
import { invalidateResourceCache } from '@/lib/cache/cache-layer'

// Invalidate all contacts for a tenant
await invalidateResourceCache(tenantId, 'contacts')
```

### Tenant-Wide

```typescript
import { invalidateTenantCache } from '@/lib/cache/cache-layer'

// Invalidate all cache entries for a tenant
await invalidateTenantCache(tenantId)
```

## Batch Operations

### Batch Get

```typescript
import { batchGetCache, generateCacheKey } from '@/lib/cache/cache-layer'

const keys = contactIds.map(id => generateCacheKey(tenantId, 'contacts', id))
const results = await batchGetCache<Contact>(keys, tenantId)

// results is a Map<string, Contact | null>
contactIds.forEach(id => {
  const key = generateCacheKey(tenantId, 'contacts', id)
  const contact = results.get(key)
  if (contact) {
    // Cache hit
  } else {
    // Cache miss - fetch from database
  }
})
```

### Batch Set

```typescript
import { batchSetCache, generateCacheKey, CACHE_TTL } from '@/lib/cache/cache-layer'

const entries = contacts.map(contact => ({
  key: generateCacheKey(tenantId, 'contacts', contact.id),
  data: contact,
  ttl: CACHE_TTL.CONTACT_DATA
}))

await batchSetCache(entries, tenantId)
```

## Monitoring

### Cache Statistics

```typescript
import { getCacheStatistics } from '@/lib/cache/cache-layer'

const stats = getCacheStatistics()
console.log(`Hit rate: ${stats.hitRate.toFixed(2)}%`)
console.log(`Total hits: ${stats.totalHits}`)
console.log(`Total misses: ${stats.totalMisses}`)
console.log(`Total errors: ${stats.totalErrors}`)

// Per-resource statistics
Object.entries(stats.resources).forEach(([resource, metrics]) => {
  console.log(`${resource}: ${metrics.hitRate.toFixed(2)}% hit rate`)
})
```

### Resource Metrics

```typescript
import { getCacheMetrics } from '@/lib/cache/cache-layer'

const contactMetrics = getCacheMetrics('contacts')
console.log(`Contacts - Hits: ${contactMetrics.hits}, Misses: ${contactMetrics.misses}`)
```

### Check Redis Availability

```typescript
import { isRedisAvailable } from '@/lib/cache/cache-layer'

if (isRedisAvailable()) {
  // Redis is available
} else {
  // Redis is unavailable - operations will bypass cache
}
```

## Cache TTL Configuration

Default TTL values are defined in `CACHE_TTL`:

```typescript
export const CACHE_TTL = {
  USER_PERMISSIONS: 5 * 60,      // 5 minutes (Requirement 10.2)
  TENANT_CONFIG: 10 * 60,        // 10 minutes (Requirement 10.3)
  CONVERSATION_LIST: 30,         // 30 seconds (Requirement 10.4)
  CONTACT_DATA: 1 * 60,          // 1 minute (Task 22.2)
  MESSAGE_DATA: 1 * 60,          // 1 minute
  BROADCAST_DATA: 5 * 60,        // 5 minutes
}
```

### TTL Guidelines

- **User Permissions (5 minutes)**: Balances security with performance. Permissions don't change frequently, but we want changes to propagate reasonably quickly.
- **Tenant Configuration (10 minutes)**: Configuration is very stable and rarely changes.
- **Conversation Lists (30 seconds)**: Frequently updated as new messages arrive, requires short TTL for real-time feel.
- **Contact Lists (1 minute)**: Moderately dynamic data that benefits from caching but needs relatively fresh data.
- **Message Data (1 minute)**: Individual messages are immutable once sent, but status updates require moderate freshness.
- **Broadcast Data (5 minutes)**: Broadcast campaigns are relatively stable once created.

## Integration with Services

### Example: Contact Service

```typescript
import { 
  cacheContactData, 
  invalidateResourceCache,
  generateCacheKey,
  invalidateCache
} from '@/lib/cache/cache-layer'

class ContactService {
  async getContact(tenantId: string, contactId: string) {
    return cacheContactData(
      tenantId,
      contactId,
      async () => {
        // Fetch from database
        return await this.repository.findById(contactId)
      }
    )
  }

  async updateContact(tenantId: string, contactId: string, data: UpdateContactDTO) {
    // Update in database
    const updated = await this.repository.update(contactId, data)
    
    // Invalidate cache
    const key = generateCacheKey(tenantId, 'contacts', contactId)
    await invalidateCache(key, tenantId)
    
    return updated
  }

  async deleteContact(tenantId: string, contactId: string) {
    // Delete from database
    await this.repository.delete(contactId)
    
    // Invalidate cache
    const key = generateCacheKey(tenantId, 'contacts', contactId)
    await invalidateCache(key, tenantId)
  }

  async bulkUpdateContacts(tenantId: string, updates: Array<{ id: string; data: any }>) {
    // Update in database
    await this.repository.bulkUpdate(updates)
    
    // Invalidate all contact caches for this tenant
    await invalidateResourceCache(tenantId, 'contacts')
  }
}
```

## Best Practices

### 1. Always Use Tenant-Specific Keys

```typescript
// ✅ Good - tenant-specific
const key = generateCacheKey(tenantId, 'contacts', contactId)

// ❌ Bad - not tenant-specific
const key = `contacts:${contactId}`
```

### 2. Invalidate on Updates

```typescript
// ✅ Good - invalidate after update
await updateContact(contactId, data)
await invalidateCache(key, tenantId)

// ❌ Bad - stale cache
await updateContact(contactId, data)
// Cache still has old data
```

### 3. Use Appropriate TTL

```typescript
// ✅ Good - short TTL for frequently changing data
const conversations = await cacheConversationList(tenantId, userId, fetcher)

// ✅ Good - longer TTL for stable data
const config = await cacheTenantConfig(tenantId, fetcher)
```

### 4. Handle Cache Misses Gracefully

```typescript
// ✅ Good - cache-aside handles this automatically
const data = await cacheAside(key, fetcher, ttl, tenantId)

// ✅ Good - manual handling
const cached = await getCache(key, tenantId)
if (!cached) {
  const fresh = await fetchFromDatabase()
  await setCache(key, fresh, ttl, tenantId)
  return fresh
}
return cached
```

### 5. Use Batch Operations for Multiple Keys

```typescript
// ✅ Good - single pipeline operation
const results = await batchGetCache(keys, tenantId)

// ❌ Bad - multiple round trips
for (const key of keys) {
  await getCache(key, tenantId)
}
```

## Error Handling

The cache layer handles errors gracefully:

- **Redis unavailable**: Operations bypass cache and fetch directly
- **Redis errors**: Logged and operations fall back to fetcher
- **Serialization errors**: Logged and operations continue

All errors are logged with context for debugging.

## Testing

The cache layer includes comprehensive unit tests covering:

- Cache-aside pattern
- Tenant isolation
- Graceful degradation
- Cache invalidation
- Batch operations
- Metrics tracking

Run tests:

```bash
npm test -- tests/unit/cache-layer.test.ts
```

## Monitoring Integration

Cache metrics are automatically tracked and can be exposed via monitoring endpoints:

```typescript
// In your monitoring/health check endpoint
import { getCacheStatistics } from '@/lib/cache/cache-layer'

app.get('/api/health/cache', (req, res) => {
  const stats = getCacheStatistics()
  res.json({
    available: isRedisAvailable(),
    statistics: stats
  })
})
```

## Migration from Old Cache

If migrating from the old `lib/cache/redis.ts` functions:

```typescript
// Old
import { withCache, getCacheKey } from '@/lib/cache/redis'
const data = await withCache(getCacheKey('dashboard', tenantId), fetcher, 30)

// New
import { cacheAside, generateCacheKey, CACHE_TTL } from '@/lib/cache/cache-layer'
const key = generateCacheKey(tenantId, 'dashboard')
const data = await cacheAside(key, fetcher, 30, tenantId)
```

The old functions are still available for backward compatibility, but new code should use the cache layer.
