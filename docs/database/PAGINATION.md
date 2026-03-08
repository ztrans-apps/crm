# Pagination Implementation

**Requirement 12.2**: Database Query Optimization - Pagination

This document describes the pagination implementation for repository layer queries in the WhatsApp CRM system.

## Overview

The system implements two types of pagination to handle different use cases:

1. **Offset-based pagination**: Traditional page-based pagination with total count
2. **Cursor-based pagination**: Efficient pagination for large datasets without total count

## Page Size Limits

**Requirement 12.2**: Page size limits are enforced across all pagination queries:

- **Default page size**: 50 records
- **Maximum page size**: 100 records
- **Minimum page size**: 1 record

These limits are defined in `PAGINATION_DEFAULTS` constant in `lib/repositories/base-repository.ts`.

## Offset-Based Pagination

### Use Cases

- User interfaces with page numbers
- Small to medium datasets (< 10,000 records)
- When total count is needed for UI display

### Usage

```typescript
import { ContactRepository } from '@/lib/repositories/contact-repository'

const repository = new ContactRepository(supabase, tenantId)

// Basic pagination
const result = await repository.findAll({
  page: 1,
  pageSize: 50
})

// With sorting
const result = await repository.findAll({
  page: 2,
  pageSize: 25,
  sort: {
    field: 'created_at',
    direction: 'desc'
  }
})
```

### Response Format

```typescript
interface PaginatedResult<T> {
  data: T[]           // Array of records
  total: number       // Total count of records
  page: number        // Current page number
  pageSize: number    // Records per page
  hasMore: boolean    // Whether more pages exist
}
```

### Example Response

```json
{
  "data": [...],
  "total": 1250,
  "page": 2,
  "pageSize": 50,
  "hasMore": true
}
```

## Cursor-Based Pagination

### Use Cases

- Large datasets (> 10,000 records)
- Infinite scroll interfaces
- Real-time data feeds
- When total count is not needed

### Advantages

- **Performance**: No expensive COUNT queries
- **Consistency**: Handles concurrent inserts/deletes better
- **Scalability**: Performance doesn't degrade with deep pagination

### Usage

```typescript
import { ContactRepository } from '@/lib/repositories/contact-repository'

const repository = new ContactRepository(supabase, tenantId)

// First page
const result = await repository.findAllCursor({
  pageSize: 50
})

// Next page using cursor
const nextResult = await repository.findAllCursor({
  pageSize: 50,
  cursor: result.nextCursor
})

// With custom cursor field
const result = await repository.findAllCursor(
  {
    pageSize: 50,
    cursor: previousCursor
  },
  'created_at' // Use created_at as cursor field instead of id
)
```

### Response Format

```typescript
interface CursorPaginatedResult<T> {
  data: T[]              // Array of records
  nextCursor: string | null  // Cursor for next page (null if no more)
  hasMore: boolean       // Whether more records exist
  pageSize: number       // Records per page
}
```

### Example Response

```json
{
  "data": [...],
  "nextCursor": "Y29udGFjdC0xMjM0NQ==",
  "hasMore": true,
  "pageSize": 50
}
```

### Cursor Encoding

Cursors are base64-encoded values of the cursor field (typically `id` or `created_at`):

```typescript
// Encoding
const cursor = Buffer.from(String(value)).toString('base64')

// Decoding
const value = Buffer.from(cursor, 'base64').toString('utf-8')
```

## Repository Methods with Pagination

All repository list methods support pagination:

### BaseRepository

- `findAll(options)` - Offset-based pagination
- `findAllCursor(options, cursorField)` - Cursor-based pagination

### ContactRepository

- `findAll(options)` - All contacts with pagination
- `search(query, options)` - Search contacts with pagination
- `findByTags(tags, options)` - Filter by tags with pagination

### MessageRepository

- `findAll(options)` - All messages with pagination
- `findByConversation(conversationId, options)` - Messages by conversation
- `findByStatus(status, options)` - Messages by status

### BroadcastRepository

- `findAll(options)` - All broadcasts with pagination
- `findByStatus(status, options)` - Broadcasts by status
- `findScheduledBetween(startDate, endDate, options)` - Scheduled broadcasts
- `getBroadcastRecipients(broadcastId, options)` - Broadcast recipients

## Implementation Details

### Normalization

All pagination options are normalized through `normalizePaginationOptions()`:

```typescript
protected normalizePaginationOptions(options?: PaginationOptions) {
  // Enforce page size limits
  const pageSize = Math.min(
    Math.max(rawPageSize, MIN_PAGE_SIZE),
    MAX_PAGE_SIZE
  )
  
  // Enforce minimum page number
  const page = Math.max(options?.page || 1, 1)
  
  return { page, pageSize, cursor: options?.cursor }
}
```

### Tenant Isolation

All pagination queries automatically include tenant filtering:

```typescript
query = this.applyTenantFilter(query)
```

This ensures multi-tenant data isolation is maintained across all paginated queries.

## Performance Considerations

### Offset-Based Pagination

- **Small datasets**: Excellent performance
- **Large datasets**: Performance degrades with deep pagination
- **COUNT queries**: Can be expensive on large tables

### Cursor-Based Pagination

- **All dataset sizes**: Consistent performance
- **Deep pagination**: No performance degradation
- **No COUNT queries**: Faster for large datasets

### Recommendations

1. Use **offset-based** pagination for:
   - Admin interfaces with page numbers
   - Small datasets (< 10,000 records)
   - When total count is required

2. Use **cursor-based** pagination for:
   - Public APIs
   - Large datasets (> 10,000 records)
   - Infinite scroll interfaces
   - Real-time feeds

## Database Indexes

Ensure proper indexes exist for pagination performance:

```sql
-- Index on tenant_id and cursor field
CREATE INDEX idx_contacts_tenant_id_created_at 
ON contacts(tenant_id, created_at);

-- Index on tenant_id and id
CREATE INDEX idx_contacts_tenant_id_id 
ON contacts(tenant_id, id);
```

See `docs/database/INDEXING_STRATEGY.md` for complete indexing guidelines.

## Testing

Pagination is tested in `tests/unit/pagination.test.ts`:

- Page size limit enforcement
- Page number normalization
- Cursor encoding/decoding
- Offset-based pagination
- Cursor-based pagination
- Requirement 12.2 validation

Run tests:

```bash
npm test -- tests/unit/pagination.test.ts
```

## API Usage Examples

### REST API with Offset Pagination

```typescript
// GET /api/contacts?page=2&pageSize=25
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '50')
  
  const repository = new ContactRepository(supabase, tenantId)
  const result = await repository.findAll({ page, pageSize })
  
  return NextResponse.json(result)
}
```

### REST API with Cursor Pagination

```typescript
// GET /api/contacts?cursor=abc123&pageSize=50
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') || undefined
  const pageSize = parseInt(searchParams.get('pageSize') || '50')
  
  const repository = new ContactRepository(supabase, tenantId)
  const result = await repository.findAllCursor({ cursor, pageSize })
  
  return NextResponse.json(result)
}
```

## Migration from Non-Paginated Queries

If you have existing queries without pagination:

```typescript
// Before (no pagination)
const contacts = await repository.findAll()

// After (with pagination)
const result = await repository.findAll({ page: 1, pageSize: 50 })
const contacts = result.data
```

The default page size of 50 is automatically applied if no options are provided.

## Related Documentation

- [Indexing Strategy](./INDEXING_STRATEGY.md)
- [Query Optimization](./QUERY_OPTIMIZATION.md)
- [Repository Pattern](../architecture/REPOSITORY_PATTERN.md)
