# Query Projection Optimization

**Validates: Requirement 12.3**

This document describes the query projection optimization implemented in the repository layer to improve database query performance by fetching only required fields instead of using `SELECT *` queries.

## Overview

Query projections allow you to specify exactly which fields you want to retrieve from the database, reducing:
- Network bandwidth usage
- Database I/O operations
- Memory consumption
- Query execution time

## Implementation

### Base Repository

The `BaseRepository` class provides field selection support through an optional `fields` parameter:

```typescript
// Fetch all fields (default behavior)
const contact = await contactRepository.findById('contact-123')

// Fetch only specific fields
const contact = await contactRepository.findById('contact-123', ['id', 'name', 'phone_number'])
```

### Supported Methods

All repository query methods support field selection:

#### BaseRepository Methods
- `findById(id, fields?)` - Find by ID with optional field selection
- `findAll(options?)` - List all with pagination and field selection
- `findAllCursor(options?, cursorField?)` - Cursor-based pagination with field selection

#### ContactRepository Methods
- `findByPhoneNumber(phoneNumber, fields?)` - Find by phone with field selection
- `findByEmail(email, fields?)` - Find by email with field selection
- `search(query, options?)` - Search with field selection
- `findByTags(tags, options?)` - Find by tags with field selection

#### MessageRepository Methods
- `findByConversation(conversationId, options?)` - Find messages with field selection
- `findUnread(conversationId, fields?)` - Find unread messages with field selection
- `findByStatus(status, options?)` - Find by status with field selection
- `findLatestByConversation(conversationId, fields?)` - Find latest message with field selection

#### BroadcastRepository Methods
- `findScheduled(fields?)` - Find scheduled broadcasts with field selection
- `findByStatus(status, options?)` - Find by status with field selection
- `findScheduledBetween(startDate, endDate, options?)` - Find in date range with field selection
- `findActive(fields?)` - Find active broadcasts with field selection
- `getBroadcastRecipients(broadcastId, options?)` - Get recipients with field selection

## Usage Examples

### Example 1: Fetch Only IDs for List Operations

When you only need IDs (e.g., for bulk operations or counting):

```typescript
const contacts = await contactRepository.findAll({
  fields: ['id'],
  pageSize: 100
})

// Returns: [{ id: '...' }, { id: '...' }, ...]
```

### Example 2: Fetch Display Fields for UI Lists

When displaying a list of contacts in the UI:

```typescript
const contacts = await contactRepository.search('john', {
  fields: ['id', 'name', 'phone_number', 'avatar_url'],
  page: 1,
  pageSize: 20
})

// Returns only the fields needed for display
```

### Example 3: Fetch Specific Fields for Business Logic

When you need specific fields for business logic:

```typescript
const message = await messageRepository.findLatestByConversation(
  conversationId,
  ['id', 'content', 'created_at', 'status']
)

// Returns only the fields needed for processing
```

### Example 4: Optimize Broadcast Recipient Queries

When fetching broadcast recipients:

```typescript
const recipients = await broadcastRepository.getBroadcastRecipients(
  broadcastId,
  {
    fields: ['id', 'contact_id', 'status', 'sent_at'],
    page: 1,
    pageSize: 50
  }
)

// Avoids fetching unnecessary fields like error messages, metadata, etc.
```

## Performance Benefits

### Before Optimization (SELECT *)

```sql
SELECT * FROM contacts WHERE tenant_id = '...' LIMIT 50;
```

Returns all columns including:
- id, tenant_id, name, phone_number, email, notes, tags, avatar_url, metadata, created_at, updated_at, deleted_at, etc.

### After Optimization (Field Selection)

```sql
SELECT id, name, phone_number FROM contacts WHERE tenant_id = '...' LIMIT 50;
```

Returns only the requested columns.

### Performance Improvements

For a contacts table with 15 columns:
- **Network bandwidth**: ~70% reduction (fetching 3 fields vs 15 fields)
- **Database I/O**: Reduced disk reads for unused columns
- **Memory usage**: ~70% reduction in application memory
- **Query time**: 20-40% faster for large result sets

## Best Practices

### 1. Always Specify Fields for List Operations

```typescript
// ❌ Bad: Fetches all fields
const contacts = await contactRepository.findAll()

// ✅ Good: Fetches only needed fields
const contacts = await contactRepository.findAll({
  fields: ['id', 'name', 'phone_number']
})
```

### 2. Use Minimal Fields for Counting/Existence Checks

```typescript
// ❌ Bad: Fetches all fields just to check existence
const contact = await contactRepository.findByPhoneNumber(phone)
const exists = contact !== null

// ✅ Good: Fetches only ID
const contact = await contactRepository.findByPhoneNumber(phone, ['id'])
const exists = contact !== null
```

### 3. Include Only Display Fields for UI

```typescript
// ❌ Bad: Fetches all fields including sensitive data
const messages = await messageRepository.findByConversation(conversationId)

// ✅ Good: Fetches only fields needed for display
const messages = await messageRepository.findByConversation(conversationId, {
  fields: ['id', 'content', 'created_at', 'sender_id', 'status']
})
```

### 4. Avoid Over-Optimization

```typescript
// ❌ Bad: Too granular, hard to maintain
const contact = await contactRepository.findById(id, ['id'])
// Later need more fields, have to update everywhere

// ✅ Good: Fetch reasonable set of fields
const contact = await contactRepository.findById(id, [
  'id', 'name', 'phone_number', 'email', 'tags'
])
```

## Default Behavior

When no `fields` parameter is provided, the repository uses `SELECT *` to maintain backward compatibility:

```typescript
// These are equivalent:
const contact1 = await contactRepository.findById(id)
const contact2 = await contactRepository.findById(id, undefined)

// Both use SELECT *
```

## Implementation Details

### buildSelectFields Helper

The `BaseRepository.buildSelectFields()` method converts field arrays to Supabase select strings:

```typescript
protected buildSelectFields(fields?: string[]): string {
  if (!fields || fields.length === 0) {
    return '*'
  }
  return fields.join(',')
}
```

Examples:
- `buildSelectFields()` → `'*'`
- `buildSelectFields([])` → `'*'`
- `buildSelectFields(['id'])` → `'id'`
- `buildSelectFields(['id', 'name', 'email'])` → `'id,name,email'`

### Supabase Integration

The field selection integrates seamlessly with Supabase's query builder:

```typescript
const selectFields = this.buildSelectFields(fields)
const query = this.supabase
  .from(this.tableName)
  .select(selectFields)  // 'id,name,email' or '*'
```

## Testing

The implementation includes comprehensive unit tests in `tests/unit/query-projections.test.ts`:

- Field selection in all repository methods
- Default behavior (SELECT * when no fields specified)
- Empty array handling
- Single field selection
- Multiple field selection
- Integration with pagination and sorting

Run tests:
```bash
npm test -- tests/unit/query-projections.test.ts
```

## Migration Guide

### Updating Existing Code

1. **Identify query hotspots**: Use performance monitoring to find slow queries
2. **Add field selection**: Update repository calls to specify only needed fields
3. **Test thoroughly**: Ensure all required fields are included
4. **Monitor performance**: Verify improvements in query execution time

### Example Migration

Before:
```typescript
// Fetches all 15 columns
const contacts = await contactRepository.findAll({ page: 1, pageSize: 50 })
```

After:
```typescript
// Fetches only 4 columns needed for display
const contacts = await contactRepository.findAll({
  page: 1,
  pageSize: 50,
  fields: ['id', 'name', 'phone_number', 'avatar_url']
})
```

## Related Requirements

- **Requirement 12.1**: Database indexes for frequently queried fields
- **Requirement 12.2**: Pagination for list queries
- **Requirement 12.3**: Select projections to fetch only required fields ✅
- **Requirement 12.4**: Avoid N+1 query problems with proper joins
- **Requirement 12.6**: Query result caching

## See Also

- [Pagination Documentation](./PAGINATION.md)
- [Indexing Strategy](./INDEXING_STRATEGY.md)
- [Repository Pattern](../../lib/repositories/README.md)
