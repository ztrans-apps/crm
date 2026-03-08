# Database Indexing Strategy

**Requirements: 12.1**  
**Task: 23.1 Add database indexes**

This document describes the database indexing strategy implemented for query optimization in the WhatsApp CRM system.

## Overview

Database indexes have been added to frequently queried fields and common query patterns to improve API response times and reduce database load. The indexing strategy follows PostgreSQL best practices and is optimized for the multi-tenant architecture.

## Index Categories

### 1. Tenant Isolation Indexes

All tables include indexes on `tenant_id` to support efficient multi-tenant data isolation:

```sql
CREATE INDEX idx_<table>_tenant_id ON <table>(tenant_id);
```

**Tables covered:**
- contacts
- messages
- conversations
- broadcasts
- profiles
- audit_logs (already indexed)
- api_keys
- security_events
- file_uploads

**Query patterns optimized:**
- `WHERE tenant_id = ?`
- Tenant-scoped data access
- RLS policy enforcement

### 2. Lookup Indexes

Single-column indexes on frequently queried fields for entity lookups:

**Contacts:**
- `phone_number` - Contact lookup by phone
- `email` - Contact lookup by email (partial index, WHERE email IS NOT NULL)

**Profiles:**
- `user_id` - User profile lookups
- `email` - Email-based lookups (partial index)
- `role` - Role-based queries
- `agent_status` - Agent availability queries (partial index)

**Messages:**
- `conversation_id` - Messages by conversation
- `status` - Filter by delivery status

**Conversations:**
- `contact_id` - Conversations by contact
- `assigned_to` - Agent workload queries (partial index)
- `status` - Filter by conversation status

**API Keys:**
- `key_prefix` - API key validation

**Security Events:**
- `event_type` - Filter by event type
- `severity` - Filter by severity level
- `ip_address` - IP-based queries

### 3. Time-Based Indexes

Indexes on timestamp columns for sorting and time-range queries:

```sql
CREATE INDEX idx_<table>_created_at ON <table>(created_at DESC);
CREATE INDEX idx_<table>_updated_at ON <table>(updated_at DESC);
```

**Tables covered:**
- contacts (created_at)
- messages (created_at)
- conversations (created_at, updated_at)
- broadcasts (created_at, scheduled_at)
- file_uploads (created_at)
- user_consents (created_at)
- security_events (timestamp)

**Query patterns optimized:**
- `ORDER BY created_at DESC` (recent-first sorting)
- `WHERE created_at >= ? AND created_at <= ?` (time-range filters)
- Pagination with time-based sorting

### 4. Composite Indexes

Multi-column indexes for common query combinations:

**Tenant-scoped queries:**
```sql
-- Contacts
CREATE INDEX idx_contacts_tenant_phone ON contacts(tenant_id, phone_number);
CREATE INDEX idx_contacts_tenant_email ON contacts(tenant_id, email);

-- Messages
CREATE INDEX idx_messages_tenant_conversation ON messages(tenant_id, conversation_id, created_at DESC);
CREATE INDEX idx_messages_tenant_status ON messages(tenant_id, status, created_at DESC);

-- Conversations
CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status, updated_at DESC);
CREATE INDEX idx_conversations_tenant_assigned ON conversations(tenant_id, assigned_to, status);
CREATE INDEX idx_conversations_tenant_contact ON conversations(tenant_id, contact_id, created_at DESC);

-- Broadcasts
CREATE INDEX idx_broadcasts_tenant_status ON broadcasts(tenant_id, status, created_at DESC);

-- Profiles
CREATE INDEX idx_profiles_tenant_user ON profiles(tenant_id, user_id);
CREATE INDEX idx_profiles_tenant_agent_status ON profiles(tenant_id, agent_status, active_chats_count);

-- File Uploads
CREATE INDEX idx_file_uploads_tenant_created ON file_uploads(tenant_id, created_at DESC);
```

**Specialized composite indexes:**
```sql
-- Unread messages
CREATE INDEX idx_messages_conversation_unread ON messages(conversation_id, read_at) 
WHERE read_at IS NULL;

-- Scheduled broadcasts
CREATE INDEX idx_broadcasts_scheduled ON broadcasts(status, scheduled_at) 
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Entity blocking checks
CREATE INDEX idx_blocked_entities_type_identifier ON blocked_entities(entity_type, identifier, expires_at);

-- User consent lookups
CREATE INDEX idx_user_consents_user_type ON user_consents(user_id, consent_type);
```

### 5. Array Indexes

GIN (Generalized Inverted Index) for array operations:

```sql
-- Contact tags
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
```

**Query patterns optimized:**
- `WHERE tags && ARRAY['tag1', 'tag2']` (array overlap)
- `WHERE tags @> ARRAY['tag1']` (array contains)
- Tag-based contact filtering

## Partial Indexes

Partial indexes are used to reduce index size and improve performance for queries with common WHERE clauses:

```sql
-- Only index non-null emails
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;

-- Only index assigned conversations
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to) 
WHERE assigned_to IS NOT NULL;

-- Only index scheduled broadcasts
CREATE INDEX idx_broadcasts_scheduled_at ON broadcasts(scheduled_at) 
WHERE scheduled_at IS NOT NULL;
```

**Benefits:**
- Smaller index size
- Faster index updates
- Better query performance for filtered queries

## Index Naming Convention

All indexes follow a consistent naming pattern:

```
idx_<table>_<column1>[_<column2>...]
```

Examples:
- `idx_contacts_tenant_id` - Single column index
- `idx_messages_tenant_conversation` - Composite index
- `idx_contacts_tags` - Special index type (GIN)

## Query Optimization Guidelines

### 1. Use EXPLAIN ANALYZE

Before and after adding indexes, use `EXPLAIN ANALYZE` to verify query performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM contacts 
WHERE tenant_id = 'xxx' AND phone_number = '+1234567890';
```

Look for:
- `Index Scan` or `Index Only Scan` (good)
- `Seq Scan` (bad - full table scan)
- Execution time improvements

### 2. Monitor Slow Queries

Enable slow query logging in PostgreSQL:

```sql
-- Set slow query threshold to 100ms
ALTER DATABASE your_db SET log_min_duration_statement = 100;
```

Review slow query logs regularly to identify missing indexes.

### 3. Check Index Usage

Query PostgreSQL statistics to see which indexes are being used:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 4. Identify Unused Indexes

Find indexes that are never used:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

Consider dropping unused indexes to reduce storage and update overhead.

## Common Query Patterns

### Tenant-Scoped Contact Lookup

```sql
-- Optimized by: idx_contacts_tenant_phone
SELECT * FROM contacts 
WHERE tenant_id = ? AND phone_number = ?;
```

### Recent Conversations for Agent

```sql
-- Optimized by: idx_conversations_tenant_assigned
SELECT * FROM conversations 
WHERE tenant_id = ? AND assigned_to = ? AND status = 'active'
ORDER BY updated_at DESC
LIMIT 50;
```

### Messages in Conversation

```sql
-- Optimized by: idx_messages_tenant_conversation
SELECT * FROM messages 
WHERE tenant_id = ? AND conversation_id = ?
ORDER BY created_at ASC
LIMIT 50;
```

### Unread Messages Count

```sql
-- Optimized by: idx_messages_conversation_unread
SELECT COUNT(*) FROM messages 
WHERE conversation_id = ? AND read_at IS NULL;
```

### Scheduled Broadcasts

```sql
-- Optimized by: idx_broadcasts_scheduled
SELECT * FROM broadcasts 
WHERE status = 'scheduled' AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC;
```

### Contact Search by Tags

```sql
-- Optimized by: idx_contacts_tags
SELECT * FROM contacts 
WHERE tenant_id = ? AND tags && ARRAY['vip', 'customer']
ORDER BY created_at DESC;
```

## Index Maintenance

### Automatic Maintenance

PostgreSQL automatically maintains indexes:
- Indexes are updated on INSERT/UPDATE/DELETE
- Query planner automatically chooses optimal indexes
- VACUUM process cleans up dead tuples in indexes

### Manual Maintenance

Occasionally rebuild indexes to optimize performance:

```sql
-- Rebuild a specific index
REINDEX INDEX idx_contacts_tenant_id;

-- Rebuild all indexes on a table
REINDEX TABLE contacts;

-- Rebuild all indexes in the database (requires downtime)
REINDEX DATABASE your_db;
```

### Monitoring Index Bloat

Check for index bloat (wasted space):

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Performance Impact

### Expected Improvements

With proper indexing, expect:
- **Contact lookups**: 100-1000x faster (ms → μs)
- **Message queries**: 10-100x faster
- **Conversation lists**: 5-50x faster
- **Aggregate queries**: 10-100x faster

### Trade-offs

Indexes have costs:
- **Storage**: Each index requires disk space (~10-50% of table size)
- **Write performance**: INSERT/UPDATE/DELETE operations are slightly slower
- **Memory**: Frequently used indexes are cached in RAM

**Recommendation**: Monitor query performance and index usage. Add indexes for slow queries, remove unused indexes.

## Migration Application

The indexes are defined in:
```
supabase/migrations/20240120000000_add_performance_indexes.sql
```

To apply the migration:

1. **Local development:**
   ```bash
   supabase db push
   ```

2. **Production:**
   - Test in staging environment first
   - Apply during low-traffic period
   - Monitor query performance after deployment
   - Rollback if issues occur

3. **Manual application:**
   - Run the SQL file in Supabase SQL Editor
   - Verify indexes were created: `\di` in psql

## Verification

After applying the migration, verify indexes exist:

```sql
-- List all indexes on a table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'contacts' AND schemaname = 'public';

-- Check index usage statistics
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public' AND tablename = 'contacts';
```

## Future Optimization

Monitor these areas for additional optimization:

1. **Full-text search**: Consider adding GIN indexes for text search
2. **Geospatial queries**: Add PostGIS indexes if location features are added
3. **Materialized views**: For complex aggregate queries
4. **Partitioning**: For very large tables (>10M rows)
5. **Connection pooling**: Optimize database connection management

## References

- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Query Optimization](https://www.postgresql.org/docs/current/performance-tips.html)
