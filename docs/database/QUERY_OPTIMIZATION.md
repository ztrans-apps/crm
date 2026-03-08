# Database Query Optimization Guide

This document describes the query optimization strategies implemented in the repository layer to ensure optimal database performance.

## Overview

The repository layer implements several optimization techniques to minimize database load and improve API response times:

- **Requirement 12.4**: Avoid N+1 query problems with proper joins
- **Requirement 12.8**: Monitor slow queries and log warnings
- **Requirement 12.9**: Implement batch operations for bulk inserts/updates
- **Requirement 12.10**: Use database transactions efficiently

## N+1 Query Prevention

### Problem

N+1 queries occur when you fetch a list of records and then make separate queries for each record's related data:

```typescript
// ❌ BAD: N+1 queries
const contacts = await contactRepo.findAll()
for (const contact of contacts.data) {
  const conversations = await conversationRepo.findByContact(contact.id)
  // This creates N additional queries!
}
```

### Solution: Use Joins

Use the `findAllWithRelations()` and `findByIdWithRelations()` methods to fetch related data in a single query:

```typescript
// ✅ GOOD: Single query with joins
const contacts = await contactRepo.findAllWithRelations({
  relations: ['conversations(*)']
})
// All contacts with their conversations in one query!
```

### Supabase Foreign Key Syntax

Supabase uses a special syntax for joining related tables:

```typescript
// One-to-many: Get contact with all conversations
relations: ['conversations(*)']

// Many-to-one: Get message with sender profile
relations: ['sender:profiles(*)']

// Nested relations: Get conversation with contact and messages
relations: ['contact(*)', 'messages(*)']

// Specific fields from relations
relations: ['contact(id,name,phone_number)', 'messages(id,content,created_at)']
```

### Examples

#### Contact with Conversations

```typescript
const contact = await contactRepo.findByIdWithRelations(
  contactId,
  ['conversations(*)']
)
// Returns: { id, name, phone_number, ..., conversations: [...] }
```

#### Message with Sender Profile

```typescript
const messages = await messageRepo.findAllWithRelations({
  relations: ['sender:profiles(id,name,avatar_url)'],
  page: 1,
  pageSize: 50
})
// Each message includes sender profile data
```

#### Broadcast with Recipients

```typescript
const broadcast = await broadcastRepo.findByIdWithRelations(
  broadcastId,
  ['broadcast_recipients(id,contact_id,status,sent_at)']
)
// Returns broadcast with all recipients in one query
```

## Batch Operations

### Bulk Inserts

Use `batchInsert()` for creating multiple records efficiently:

```typescript
// ✅ GOOD: Batch insert
const contacts = [
  { name: 'John', phone_number: '+1234567890' },
  { name: 'Jane', phone_number: '+1234567891' },
  // ... 1000 more contacts
]

const created = await contactRepo.batchInsert(contacts)
// Single database operation for all records
```

**Features:**
- Automatic chunking (default: 1000 records per chunk)
- Automatic tenant_id injection
- Performance monitoring and logging
- Returns all created records

**Configuration:**
```typescript
// Custom chunk size
await contactRepo.batchInsert(contacts, 500)
```

### Bulk Updates

Use `batchUpdate()` for updating multiple records:

```typescript
// ✅ GOOD: Batch update
const updates = [
  { id: 'contact-1', data: { name: 'Updated Name 1' } },
  { id: 'contact-2', data: { name: 'Updated Name 2' } },
  // ... more updates
]

await contactRepo.batchUpdate(updates)
// Executes updates in parallel with concurrency control
```

**Features:**
- Parallel execution with concurrency limit (default: 10)
- Automatic tenant isolation
- Performance monitoring and logging

**Configuration:**
```typescript
// Custom concurrency
await contactRepo.batchUpdate(updates, 20)
```

### Bulk Deletes

Use `batchDelete()` for deleting multiple records:

```typescript
// ✅ GOOD: Batch delete
const ids = ['id-1', 'id-2', 'id-3', ...]

const deletedCount = await contactRepo.batchDelete(ids)
// Single database operation for all deletes
```

**Features:**
- Single database operation
- Automatic tenant isolation
- Returns count of deleted records
- Performance monitoring and logging

## Transaction Support

### Using Transactions

Use `withTransaction()` for atomic multi-step operations:

```typescript
// ✅ GOOD: Atomic operation
await contactRepo.withTransaction(async (client) => {
  // All operations succeed or all fail
  const contact = await contactRepo.create({ name: 'John', phone_number: '+1234567890' })
  const conversation = await conversationRepo.create({ contact_id: contact.id })
  const message = await messageRepo.create({ conversation_id: conversation.id, content: 'Hello' })
  
  return { contact, conversation, message }
})
```

**Note:** Supabase client library doesn't expose direct transaction control. Transactions are handled at the database level through PostgreSQL's ACID guarantees. For complex transactions requiring explicit BEGIN/COMMIT/ROLLBACK, use database functions.

### Database Functions for Complex Transactions

For complex multi-table operations, create PostgreSQL functions:

```sql
-- Example: Create contact with conversation atomically
CREATE OR REPLACE FUNCTION create_contact_with_conversation(
  p_tenant_id UUID,
  p_name TEXT,
  p_phone_number TEXT
)
RETURNS JSON AS $$
DECLARE
  v_contact_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Insert contact
  INSERT INTO contacts (tenant_id, name, phone_number)
  VALUES (p_tenant_id, p_name, p_phone_number)
  RETURNING id INTO v_contact_id;
  
  -- Insert conversation
  INSERT INTO conversations (tenant_id, contact_id)
  VALUES (p_tenant_id, v_contact_id)
  RETURNING id INTO v_conversation_id;
  
  -- Return both IDs
  RETURN json_build_object(
    'contact_id', v_contact_id,
    'conversation_id', v_conversation_id
  );
END;
$$ LANGUAGE plpgsql;
```

Call from repository:

```typescript
const { data, error } = await supabase.rpc('create_contact_with_conversation', {
  p_tenant_id: tenantId,
  p_name: 'John',
  p_phone_number: '+1234567890'
})
```

## Query Performance Monitoring

### Automatic Monitoring

All queries are automatically monitored for performance. Slow queries (> 1000ms) are logged with details:

```typescript
// Queries are automatically monitored
const contacts = await contactRepo.findAll()
// If query takes > 1000ms, logs:
// [Slow Query] { query: 'findAll', table: 'contacts', tenantId: '...', duration: '1234ms' }
```

### Custom Monitoring

Use `monitorQuery()` for custom query monitoring:

```typescript
protected async customQuery(): Promise<Result> {
  return this.monitorQuery('customQuery', async () => {
    // Your query logic here
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      // ... complex query
    
    if (error) throw error
    return data
  }, 500) // Custom threshold: 500ms
}
```

### Monitoring Thresholds

Default thresholds:
- **Slow query**: > 1000ms (1 second)
- **Batch operations**: > 1000ms

Adjust thresholds based on your requirements:

```typescript
// Custom threshold for specific query
await this.monitorQuery('complexQuery', queryFn, 2000) // 2 seconds
```

## Best Practices

### 1. Always Use Joins for Related Data

```typescript
// ❌ BAD: N+1 queries
const conversations = await conversationRepo.findAll()
for (const conv of conversations.data) {
  const messages = await messageRepo.findByConversation(conv.id)
}

// ✅ GOOD: Single query with join
const conversations = await conversationRepo.findAllWithRelations({
  relations: ['messages(*)']
})
```

### 2. Use Batch Operations for Bulk Changes

```typescript
// ❌ BAD: Individual inserts
for (const contact of contacts) {
  await contactRepo.create(contact)
}

// ✅ GOOD: Batch insert
await contactRepo.batchInsert(contacts)
```

### 3. Use Transactions for Multi-Step Operations

```typescript
// ❌ BAD: No transaction
const contact = await contactRepo.create(contactData)
const conversation = await conversationRepo.create({ contact_id: contact.id })
// If second operation fails, contact is orphaned!

// ✅ GOOD: Transaction
await contactRepo.withTransaction(async () => {
  const contact = await contactRepo.create(contactData)
  const conversation = await conversationRepo.create({ contact_id: contact.id })
  return { contact, conversation }
})
```

### 4. Use Field Projections

```typescript
// ❌ BAD: Fetch all fields when only need a few
const contacts = await contactRepo.findAll()

// ✅ GOOD: Fetch only needed fields
const contacts = await contactRepo.findAll({
  fields: ['id', 'name', 'phone_number']
})
```

### 5. Monitor Query Performance

```typescript
// Wrap custom queries in monitoring
protected async complexQuery(): Promise<Result> {
  return this.monitorQuery('complexQuery', async () => {
    // Query logic
  })
}
```

## Performance Metrics

### Expected Query Times

- **Simple queries** (findById, findAll with pagination): < 100ms
- **Queries with joins** (1-2 relations): < 200ms
- **Complex queries** (multiple joins, aggregations): < 500ms
- **Batch operations** (< 1000 records): < 1000ms

### Optimization Checklist

- [ ] Use joins instead of separate queries for related data
- [ ] Use batch operations for bulk inserts/updates/deletes
- [ ] Use transactions for multi-step operations
- [ ] Use field projections to fetch only needed data
- [ ] Use pagination for large result sets
- [ ] Monitor slow queries and optimize as needed
- [ ] Use database indexes for frequently queried fields
- [ ] Use database functions for complex transactions

## Troubleshooting

### Slow Queries

If you see slow query warnings:

1. **Check indexes**: Ensure frequently queried fields have indexes
2. **Reduce data**: Use field projections to fetch only needed fields
3. **Optimize joins**: Limit joined data with field projections
4. **Add pagination**: Don't fetch all records at once
5. **Use caching**: Cache frequently accessed data

### N+1 Query Detection

Look for patterns like:

```typescript
// Pattern: Loop with queries inside
for (const item of items) {
  const related = await repo.findByX(item.id) // ⚠️ N+1 problem!
}
```

Replace with:

```typescript
// Use joins to fetch all related data at once
const items = await repo.findAllWithRelations({
  relations: ['related(*)']
})
```

### Transaction Failures

If transactions fail:

1. **Check error logs**: Look for specific error messages
2. **Verify data**: Ensure all data meets constraints
3. **Check permissions**: Verify RLS policies allow operations
4. **Use database functions**: For complex transactions, use PostgreSQL functions

## Related Documentation

- [Indexing Strategy](./INDEXING_STRATEGY.md) - Database index configuration
- [Pagination Guide](./PAGINATION.md) - Pagination best practices
- [Query Projections](./QUERY_PROJECTIONS.md) - Field selection optimization
- [Cache Layer Usage](../cache/CACHE_LAYER_USAGE.md) - Caching strategies
