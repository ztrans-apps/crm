# Database Connection Pooling Configuration

This document describes the database connection pooling configuration for the WhatsApp CRM system.

**Requirement**: 12.5 (Use database connection pooling)

## Overview

The system uses Supabase's built-in connection pooling through PgBouncer, which provides efficient connection management and prevents connection exhaustion under high load.

## Supabase Connection Pooling

### Architecture

```
Application → Supabase Client → PgBouncer → PostgreSQL
```

**PgBouncer** acts as a connection pooler between the application and PostgreSQL database:
- Maintains a pool of database connections
- Reuses connections across multiple client requests
- Prevents connection exhaustion
- Reduces connection overhead

### Connection Modes

Supabase supports two connection pooling modes:

#### 1. Transaction Mode (Recommended)

Connection is held only for the duration of a transaction:

```typescript
// Connection URL format
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_KEY = 'your-service-role-key'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false, // Server-side: don't persist sessions
    autoRefreshToken: false,
  },
})
```

**Benefits**:
- Higher connection efficiency
- Supports more concurrent clients
- Recommended for most applications

**Limitations**:
- Cannot use prepared statements across transactions
- Cannot use session-level features (temp tables, advisory locks)

#### 2. Session Mode

Connection is held for the entire client session:

```typescript
// Use direct database connection (bypasses PgBouncer)
const DIRECT_URL = 'postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres'
```

**Benefits**:
- Full PostgreSQL feature support
- Can use prepared statements
- Can use session-level features

**Limitations**:
- Lower connection efficiency
- Supports fewer concurrent clients
- Only use when transaction mode is insufficient

### Connection Pool Limits

Default connection pool limits by Supabase tier:

| Tier | Max Connections | Recommended Concurrent Users |
|------|----------------|------------------------------|
| Free | 15 | 50-100 |
| Pro | 60 | 200-500 |
| Team | 120 | 500-1000 |
| Enterprise | Custom | 1000+ |

**Note**: These limits are shared across all connections to your database, including:
- Application connections
- Supabase Dashboard
- Database migrations
- Background jobs

## Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Direct database connection (for migrations, admin tasks)
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

### Supabase Client Configuration

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient() {
  return createClient(
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
}

// Singleton instance for server-side use
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient()
  }
  return supabaseInstance
}
```

### Connection Reuse

**Best Practice**: Reuse Supabase client instances across requests

```typescript
// ✅ GOOD: Reuse client instance
const supabase = getSupabaseClient()

export async function GET(request: Request) {
  const { data } = await supabase.from('contacts').select('*')
  return Response.json(data)
}

// ❌ BAD: Create new client for each request
export async function GET(request: Request) {
  const supabase = createClient(...) // Creates new connection
  const { data } = await supabase.from('contacts').select('*')
  return Response.json(data)
}
```

## Connection Pool Monitoring

### Check Connection Usage

Monitor active connections in Supabase Dashboard:

1. Go to **Database** → **Connection Pooling**
2. View active connections, idle connections, and connection pool usage
3. Set up alerts for high connection usage (> 80%)

### Programmatic Monitoring

```typescript
// lib/monitoring/connection-pool.ts
import { getSupabaseClient } from '@/lib/supabase/client'

export async function checkConnectionPool() {
  const supabase = getSupabaseClient()

  try {
    // Simple query to test connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (error) {
      if (error.message.includes('connection pool')) {
        console.error('Connection pool exhausted')
        return {
          status: 'error',
          message: 'Connection pool exhausted',
        }
      }
      throw error
    }

    return {
      status: 'healthy',
      message: 'Connection pool operational',
    }
  } catch (error) {
    console.error('Connection pool check failed:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

### Health Check Integration

```typescript
// app/api/health/route.ts
import { checkConnectionPool } from '@/lib/monitoring/connection-pool'

export async function GET() {
  const poolStatus = await checkConnectionPool()

  if (poolStatus.status === 'error') {
    return Response.json(
      {
        status: 'unhealthy',
        components: {
          database: poolStatus,
        },
      },
      { status: 503 }
    )
  }

  return Response.json({
    status: 'healthy',
    components: {
      database: poolStatus,
    },
  })
}
```

## Connection Pool Optimization

### 1. Optimize Query Performance

Reduce connection hold time by optimizing queries:

```typescript
// ✅ GOOD: Use indexes, projections, pagination
const { data } = await supabase
  .from('contacts')
  .select('id, name, phone_number') // Only select needed fields
  .eq('tenant_id', tenantId) // Use indexed field
  .range(0, 49) // Limit results

// ❌ BAD: Fetch all data without filters
const { data } = await supabase
  .from('contacts')
  .select('*') // Fetch all fields
```

### 2. Implement Connection Timeouts

Set timeouts for long-running queries:

```typescript
// lib/supabase/with-timeout.ts
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    ),
  ])
}

// Usage
const data = await queryWithTimeout(
  () => supabase.from('contacts').select('*'),
  5000 // 5 second timeout
)
```

### 3. Implement Request Queuing

Queue requests when connection pool is near capacity:

```typescript
// lib/queue/request-queue.ts
import PQueue from 'p-queue'

// Limit concurrent database operations
const dbQueue = new PQueue({ concurrency: 50 })

export async function queueDatabaseOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  return dbQueue.add(operation)
}

// Usage
const data = await queueDatabaseOperation(() =>
  supabase.from('contacts').select('*')
)
```

### 4. Use Read Replicas

For read-heavy workloads, use Supabase read replicas:

```typescript
// lib/supabase/read-replica.ts
const READ_REPLICA_URL = process.env.SUPABASE_READ_REPLICA_URL
const READ_REPLICA_KEY = process.env.SUPABASE_READ_REPLICA_KEY

export const readReplicaClient = createClient(
  READ_REPLICA_URL!,
  READ_REPLICA_KEY!
)

// Use read replica for read operations
export async function getContacts(tenantId: string) {
  const { data } = await readReplicaClient
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)

  return data
}

// Use primary for write operations
export async function createContact(contact: Contact) {
  const { data } = await supabase
    .from('contacts')
    .insert(contact)
    .select()

  return data
}
```

## Scaling Strategies

### 1. Vertical Scaling

Upgrade Supabase tier for more connections:

- **Free → Pro**: 15 → 60 connections (4x increase)
- **Pro → Team**: 60 → 120 connections (2x increase)
- **Team → Enterprise**: Custom limits

### 2. Horizontal Scaling

Add more application instances:

```
Load Balancer
    ↓
┌───────────┬───────────┬───────────┐
│ Instance 1│ Instance 2│ Instance 3│
└───────────┴───────────┴───────────┘
         ↓
    PgBouncer (Shared Pool)
         ↓
    PostgreSQL
```

**Note**: Connection pool is shared across all instances

### 3. Connection Pool Partitioning

Partition connection pool by workload:

```typescript
// Separate clients for different workloads
const apiClient = createClient(...) // For API requests
const backgroundClient = createClient(...) // For background jobs
const adminClient = createClient(...) // For admin operations
```

### 4. Caching Strategy

Reduce database load with caching:

```typescript
import { cacheAside } from '@/lib/cache/cache-layer'

// Cache frequently accessed data
const contacts = await cacheAside(
  `contacts:${tenantId}`,
  () => supabase.from('contacts').select('*'),
  300 // 5 minute TTL
)
```

## Troubleshooting

### Connection Pool Exhausted

**Symptoms**:
- "Connection pool exhausted" errors
- Timeouts under load
- 503 Service Unavailable responses

**Solutions**:
1. Check active connections in Supabase Dashboard
2. Optimize slow queries (reduce connection hold time)
3. Implement connection timeouts
4. Implement request queuing
5. Upgrade Supabase tier
6. Use read replicas for read operations

### High Connection Usage

**Symptoms**:
- Connection pool usage > 80%
- Intermittent connection errors
- Slow query performance

**Solutions**:
1. Review slow query logs
2. Implement caching for frequently accessed data
3. Optimize N+1 queries
4. Use batch operations for bulk inserts/updates
5. Implement connection pooling best practices

### Connection Leaks

**Symptoms**:
- Connections not released after use
- Gradually increasing connection count
- Eventually hitting connection limit

**Solutions**:
1. Ensure proper error handling (connections released on error)
2. Use try-finally blocks for cleanup
3. Avoid long-running transactions
4. Monitor connection usage over time

## Best Practices

### ✅ DO

- Reuse Supabase client instances
- Use transaction mode for most operations
- Implement connection timeouts
- Monitor connection pool usage
- Optimize query performance
- Use caching for frequently accessed data
- Implement request queuing for high load
- Use read replicas for read-heavy workloads

### ❌ DON'T

- Create new client for each request
- Hold connections for long periods
- Run expensive queries without timeouts
- Ignore connection pool warnings
- Use session mode unless necessary
- Fetch all data without pagination
- Skip query optimization

## Monitoring and Alerts

### Key Metrics

Monitor these metrics in production:

1. **Active Connections**: Current number of active connections
2. **Connection Pool Usage**: Percentage of pool capacity used
3. **Connection Errors**: Rate of connection-related errors
4. **Query Duration**: Average query execution time
5. **Connection Wait Time**: Time waiting for available connection

### Alert Thresholds

Set up alerts for:

- Connection pool usage > 80% for 5 minutes
- Connection errors > 10 per minute
- Average query duration > 1000ms
- Connection wait time > 100ms

### Monitoring Tools

- **Supabase Dashboard**: Built-in connection pool monitoring
- **Sentry**: Error tracking and performance monitoring
- **Datadog/New Relic**: Infrastructure monitoring
- **Custom metrics**: Application-level monitoring

## References

- Requirement 12.5: Use database connection pooling
- Supabase Documentation: https://supabase.com/docs/guides/database/connecting-to-postgres
- PgBouncer Documentation: https://www.pgbouncer.org/
- Performance Optimization Guide: `docs/PERFORMANCE_OPTIMIZATION.md`
