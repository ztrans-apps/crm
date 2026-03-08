# Performance Optimization Guide

This document describes the performance optimizations implemented for the WhatsApp CRM system.

**Requirements**: 12.5 (Connection Pooling), 12.6 (Query Result Caching), 12.7 (Prepared Statements)

## Overview

The system implements multiple layers of performance optimization:

1. **Database Query Optimization**: Indexes, projections, pagination, joins
2. **Query Result Caching**: Redis-based caching for expensive queries
3. **Connection Pooling**: Supabase built-in pooling with configuration guidance
4. **Cache TTL Tuning**: Optimized cache durations based on data access patterns

## Database Query Optimization

### Indexes (Requirement 12.1)

All frequently queried fields have indexes. See `supabase/migrations/20240120000000_add_performance_indexes.sql` for details.

Key indexes:
- **Tenant isolation**: `tenant_id` on all tables
- **Lookups**: `phone_number`, `email`, `user_id`
- **Time-based**: `created_at`, `updated_at`
- **Status filtering**: `status` on messages, conversations, broadcasts
- **Composite**: Multi-column indexes for common query patterns

### Query Projections (Requirement 12.3)

The repository layer supports field selection to fetch only required fields:

```typescript
// Fetch only specific fields
const contact = await contactRepo.findById(id, ['id', 'name', 'phone_number'])

// Fetch all fields (default)
const contact = await contactRepo.findById(id)
```

### Pagination (Requirement 12.2)

All list queries support pagination with configurable page sizes:

```typescript
// Offset-based pagination
const result = await contactRepo.findAll({
  page: 1,
  pageSize: 50,
  sort: { field: 'created_at', direction: 'desc' }
})

// Cursor-based pagination (for large datasets)
const result = await contactRepo.findAllCursor({
  pageSize: 50,
  cursor: 'base64_encoded_cursor'
})
```

**Pagination Limits**:
- Default page size: 50
- Maximum page size: 100
- Minimum page size: 1

### N+1 Query Prevention (Requirement 12.4)

Use `findAllWithRelations()` and `findByIdWithRelations()` to fetch related data in a single query:

```typescript
// Fetch conversations with contact data in one query
const conversations = await conversationRepo.findAllWithRelations({
  relations: ['contact', 'assigned_user'],
  page: 1,
  pageSize: 20
})

// Fetch single conversation with all relations
const conversation = await conversationRepo.findByIdWithRelations(
  conversationId,
  ['contact', 'messages', 'assigned_user']
)
```

### Batch Operations (Requirement 12.9)

Use batch operations for bulk inserts/updates/deletes:

```typescript
// Batch insert (chunks of 1000)
const contacts = await contactRepo.batchInsert(contactsArray)

// Batch update (10 concurrent updates)
await contactRepo.batchUpdate([
  { id: '1', data: { name: 'Updated' } },
  { id: '2', data: { name: 'Updated' } }
])

// Batch delete
const deletedCount = await contactRepo.batchDelete(['id1', 'id2', 'id3'])
```

### Slow Query Monitoring (Requirement 12.8)

The repository layer automatically logs slow queries (> 1000ms):

```typescript
// Wrap expensive queries with monitoring
const result = await this.monitorQuery(
  'complexQuery',
  async () => {
    // Your query logic
  },
  1000 // Threshold in ms
)
```

Slow queries are logged to console with details:
```
[Slow Query] {
  query: 'findAllWithRelations',
  table: 'contacts',
  tenantId: 'tenant-123',
  duration: '1250ms',
  threshold: '1000ms'
}
```

## Query Result Caching (Requirement 12.6)

### Cache Strategy

The system implements cache-aside pattern with Redis:

1. Check cache for data
2. If cache miss, fetch from database
3. Store result in cache with TTL
4. Return data to caller

### Cache TTLs

Optimized cache durations based on data access patterns:

```typescript
export const CACHE_TTL = {
  USER_PERMISSIONS: 5 * 60,      // 5 minutes - frequently checked
  TENANT_CONFIG: 10 * 60,        // 10 minutes - rarely changes
  CONVERSATION_LIST: 30,         // 30 seconds - frequently updated
  CONTACT_DATA: 1 * 60,          // 1 minute - moderate updates
  MESSAGE_DATA: 1 * 60,          // 1 minute - moderate updates
  BROADCAST_DATA: 5 * 60,        // 5 minutes - infrequent updates
  QUERY_RESULTS: 2 * 60,         // 2 minutes - expensive queries
}
```

### Caching Expensive Queries

Implement query result caching for expensive operations:

```typescript
import { cacheAside, generateCacheKey, CACHE_TTL } from '@/lib/cache/cache-layer'

// Cache expensive search queries
async search(query: string, options?: SearchOptions) {
  const cacheKey = generateCacheKey(
    this.tenantId,
    'contacts:search',
    query,
    JSON.stringify(options)
  )

  return cacheAside(
    cacheKey,
    async () => {
      // Expensive database query
      return await this.executeSearch(query, options)
    },
    CACHE_TTL.QUERY_RESULTS,
    this.tenantId
  )
}
```

### Cache Invalidation

Invalidate cache on data updates:

```typescript
import { invalidateResourceCache } from '@/lib/cache/cache-layer'

async update(id: string, data: Partial<T>): Promise<T> {
  const updated = await super.update(id, data)
  
  // Invalidate all cached queries for this resource
  await invalidateResourceCache(this.tenantId, 'contacts')
  
  return updated
}
```

### Cache Hit Rate Monitoring

Monitor cache performance:

```typescript
import { getCacheStatistics } from '@/lib/cache/cache-layer'

const stats = getCacheStatistics()
console.log(`Cache hit rate: ${stats.hitRate.toFixed(2)}%`)
console.log(`Total hits: ${stats.totalHits}`)
console.log(`Total misses: ${stats.totalMisses}`)

// Per-resource statistics
Object.entries(stats.resources).forEach(([resource, metrics]) => {
  console.log(`${resource}: ${metrics.hitRate.toFixed(2)}% hit rate`)
})
```

**Target**: > 70% cache hit rate

## Connection Pooling (Requirement 12.5)

### Supabase Connection Pooling

Supabase provides built-in connection pooling through PgBouncer:

**Connection Modes**:
- **Transaction mode** (recommended): Connection held for transaction duration
- **Session mode**: Connection held for entire session

**Default Pool Settings**:
- Max connections: 15 per project (Free tier)
- Max connections: 60+ per project (Pro tier)
- Connection timeout: 30 seconds
- Idle timeout: 10 minutes

### Connection Pool Configuration

Configure connection pooling in Supabase client:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // Server-side: don't persist sessions
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-application-name': 'whatsapp-crm',
      },
    },
  }
)
```

### Connection Pool Best Practices

1. **Reuse Supabase client instances**: Create once, reuse across requests
2. **Use service role key for server-side**: Bypasses RLS for admin operations
3. **Close long-running connections**: Set timeouts for long queries
4. **Monitor connection usage**: Track active connections in Supabase dashboard

### Connection Pool Monitoring

Monitor connection pool usage:

```typescript
// Check database connectivity
const { data, error } = await supabase
  .from('profiles')
  .select('count')
  .limit(1)

if (error) {
  if (error.message.includes('connection pool')) {
    console.error('Connection pool exhausted')
    // Alert administrators
  }
}
```

### Scaling Connection Pool

For high-traffic applications:

1. **Upgrade Supabase tier**: Increase max connections
2. **Implement connection queuing**: Queue requests when pool is full
3. **Use read replicas**: Distribute read queries across replicas
4. **Optimize query performance**: Reduce connection hold time

## Prepared Statements (Requirement 12.7)

### Supabase Query Builder

Supabase client uses prepared statements internally for all queries:

```typescript
// This uses prepared statements automatically
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('phone_number', phoneNumber)
  .eq('tenant_id', tenantId)
```

### Benefits

- **SQL injection prevention**: Parameters are properly escaped
- **Query plan caching**: Database caches execution plans
- **Performance**: Faster execution for repeated queries

### Custom SQL with Prepared Statements

For complex queries, use RPC with prepared statements:

```sql
-- Create database function
CREATE OR REPLACE FUNCTION search_contacts(
  p_tenant_id UUID,
  p_query TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone_number TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.phone_number, c.email
  FROM contacts c
  WHERE c.tenant_id = p_tenant_id
    AND (
      c.name ILIKE '%' || p_query || '%'
      OR c.phone_number ILIKE '%' || p_query || '%'
      OR c.email ILIKE '%' || p_query || '%'
    )
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

```typescript
// Call with prepared statement
const { data } = await supabase.rpc('search_contacts', {
  p_tenant_id: tenantId,
  p_query: searchQuery,
  p_limit: 50
})
```

## Performance Monitoring

### Query Performance Metrics

Track query performance in production:

```typescript
import { PerformanceMonitor } from '@/lib/monitoring/performance-monitor'

const monitor = new PerformanceMonitor()

// Record query metrics
await monitor.recordMetric({
  endpoint: '/api/contacts',
  method: 'GET',
  responseTime: 150,
  dbQueryTime: 80,
  cacheHit: true,
  statusCode: 200,
  tenantId: 'tenant-123'
})

// Get performance statistics
const stats = await monitor.getStats('/api/contacts')
console.log(`Average response time: ${stats.avg}ms`)
console.log(`p95 response time: ${stats.p95}ms`)
console.log(`p99 response time: ${stats.p99}ms`)
```

### Slow Query Alerts

Configure alerts for slow queries:

```typescript
// Alert when query exceeds threshold
if (duration > 1000) {
  await monitor.alertOnThreshold({
    metric: 'query_duration',
    value: duration,
    threshold: 1000,
    endpoint: '/api/contacts',
    tenantId: 'tenant-123'
  })
}
```

### Cache Performance Metrics

Monitor cache hit rates:

```typescript
import { getCacheStatistics } from '@/lib/cache/cache-layer'

// Get cache statistics
const stats = getCacheStatistics()

// Alert if hit rate drops below 70%
if (stats.hitRate < 70) {
  console.warn(`Low cache hit rate: ${stats.hitRate.toFixed(2)}%`)
  // Consider:
  // 1. Increasing cache TTLs
  // 2. Implementing cache warming
  // 3. Reviewing cache invalidation strategy
}
```

## Load Testing

### Running Load Tests

Test performance under load:

```bash
# Run comprehensive load test
npm run test:load:comprehensive

# Run specific endpoint tests
npm run test:load:contacts
npm run test:load:messages
npm run test:load:conversations
```

### Analyzing Results

```bash
# Analyze load test results
node tests/load/analyze-results.js tests/load/results/comprehensive-load-*.json
```

### Performance Targets

- **p95 response time**: < 500ms
- **p99 response time**: < 1000ms
- **Error rate**: < 1%
- **Cache hit rate**: > 70%
- **Database query time**: < 200ms

## Optimization Checklist

### Database Optimization
- [x] Add indexes on frequently queried fields
- [x] Implement query projections (select only needed fields)
- [x] Use pagination for list endpoints
- [x] Optimize N+1 queries with joins
- [x] Implement batch operations
- [x] Monitor slow queries

### Caching Strategy
- [x] Implement Redis caching for frequently accessed data
- [x] Cache user permissions (5 minutes)
- [x] Cache tenant configuration (10 minutes)
- [x] Cache conversation lists (30 seconds)
- [x] Implement cache invalidation on updates
- [x] Monitor cache hit rates (target: > 70%)
- [x] Implement query result caching

### Connection Pooling
- [x] Document Supabase connection pooling
- [x] Configure connection pool settings
- [x] Implement connection pool monitoring
- [x] Document scaling strategies

### Query Optimization
- [x] Use prepared statements (via Supabase client)
- [x] Implement database functions for complex queries
- [x] Monitor query performance
- [x] Alert on slow queries

## Troubleshooting

### High Response Times

1. Check slow query logs
2. Review database indexes
3. Check cache hit rates
4. Monitor connection pool usage
5. Review N+1 query patterns

### Low Cache Hit Rate

1. Increase cache TTLs
2. Implement cache warming
3. Review cache invalidation strategy
4. Check Redis connectivity
5. Monitor cache key patterns

### Connection Pool Exhaustion

1. Upgrade Supabase tier
2. Optimize query performance
3. Implement connection queuing
4. Use read replicas
5. Review connection timeout settings

### Slow Database Queries

1. Add missing indexes
2. Use query projections
3. Implement pagination
4. Optimize joins
5. Use database functions for complex queries

## References

- Requirements 12.5: Connection pooling
- Requirements 12.6: Query result caching
- Requirements 12.7: Prepared statements
- Design Document: Query Optimization section
- Load Testing Guide: `tests/load/PERFORMANCE_ANALYSIS.md`
