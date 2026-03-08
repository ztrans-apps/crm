# Enhanced withAuth Middleware Usage Guide

The enhanced `withAuth` middleware provides comprehensive security features for API routes including authentication, authorization, rate limiting, input validation, request logging, error handling, and security headers.

## Features

- ✅ Authentication and authorization (RBAC)
- ✅ Rate limiting (Redis-based with in-memory fallback)
- ✅ Input validation (Zod schemas)
- ✅ Request logging with security event tracking
- ✅ Centralized error handling with sanitization
- ✅ Security headers injection
- ✅ Context injection with validated data

## Basic Usage

### Simple Authentication

```typescript
import { withAuth } from '@/lib/rbac/with-auth'
import { NextResponse } from 'next/server'

// Any authenticated user can access
export const GET = withAuth(async (req, ctx) => {
  const { user, tenantId, supabase } = ctx
  
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
  
  return NextResponse.json({ data })
})
```

### With Permission Check

```typescript
export const POST = withAuth(
  async (req, ctx) => {
    // Handler logic
    return NextResponse.json({ success: true })
  },
  { permission: 'contact.create' }
)
```

### With Multiple Permissions (Any)

```typescript
export const GET = withAuth(
  async (req, ctx) => {
    // Handler logic
    return NextResponse.json({ data: [] })
  },
  { anyPermission: ['analytics.view', 'analytics.view.all'] }
)
```

### With Role Check

```typescript
export const DELETE = withAuth(
  async (req, ctx) => {
    // Handler logic
    return NextResponse.json({ success: true })
  },
  { roles: ['owner', 'admin'] }
)
```

## Rate Limiting

### Basic Rate Limiting

```typescript
export const POST = withAuth(
  async (req, ctx) => {
    // Send message logic
    return NextResponse.json({ success: true })
  },
  {
    permission: 'message.send',
    rateLimit: {
      maxRequests: 100,
      windowSeconds: 3600, // 100 requests per hour
    },
  }
)
```

### Custom Rate Limit Key

```typescript
export const POST = withAuth(
  async (req, ctx) => {
    // Broadcast logic
    return NextResponse.json({ success: true })
  },
  {
    permission: 'broadcast.send',
    rateLimit: {
      maxRequests: 10,
      windowSeconds: 3600,
      keyPrefix: 'broadcast:send', // Custom key prefix
    },
  }
)
```

## Input Validation

### Validate Request Body

```typescript
import { z } from 'zod'

const CreateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email().optional(),
  notes: z.string().max(5000).optional(),
})

export const POST = withAuth(
  async (req, ctx) => {
    // Access validated data from context
    const { validatedBody } = ctx
    
    // validatedBody is typed according to the schema
    const contact = await createContact(validatedBody)
    
    return NextResponse.json({ contact })
  },
  {
    permission: 'contact.create',
    validation: {
      body: CreateContactSchema,
    },
  }
)
```

### Validate Query Parameters

```typescript
const ListContactsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
})

export const GET = withAuth(
  async (req, ctx) => {
    const { validatedQuery } = ctx
    
    // validatedQuery.page is a number (transformed from string)
    const contacts = await listContacts({
      page: validatedQuery?.page || 1,
      limit: validatedQuery?.limit || 20,
      search: validatedQuery?.search,
    })
    
    return NextResponse.json({ contacts })
  },
  {
    permission: 'contact.view',
    validation: {
      query: ListContactsQuerySchema,
    },
  }
)
```

### Validate Path Parameters

```typescript
const ContactParamsSchema = z.object({
  id: z.string().uuid(),
})

export const GET = withAuth(
  async (req, ctx, params) => {
    const { validatedParams } = ctx
    
    // validatedParams.id is a valid UUID
    const contact = await getContact(validatedParams.id)
    
    return NextResponse.json({ contact })
  },
  {
    permission: 'contact.view',
    validation: {
      params: ContactParamsSchema,
    },
  }
)
```

## Combined Example

```typescript
import { withAuth } from '@/lib/rbac/with-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(4096),
  media_url: z.string().url().optional(),
  media_type: z.enum(['image', 'video', 'audio', 'document']).optional(),
})

export const POST = withAuth(
  async (req, ctx) => {
    const { validatedBody, user, tenantId, supabase } = ctx
    
    // Send message using validated data
    const message = await sendMessage({
      ...validatedBody,
      sender_id: user.id,
      tenant_id: tenantId,
    })
    
    return NextResponse.json({ message })
  },
  {
    // Require permission
    permission: 'message.send',
    
    // Rate limit: 100 messages per hour per tenant
    rateLimit: {
      maxRequests: 100,
      windowSeconds: 3600,
      keyPrefix: 'api:messages:send',
    },
    
    // Validate request body
    validation: {
      body: SendMessageSchema,
    },
  }
)
```

## Context Properties

The `AuthContext` object passed to your handler contains:

```typescript
interface AuthContext {
  // Authenticated user
  user: {
    id: string
    email?: string
  }
  
  // User profile with tenant info
  profile: {
    id: string
    tenant_id: string
    role?: string
  }
  
  // Tenant ID for multi-tenant isolation
  tenantId: string
  
  // Supabase client (respects RLS)
  supabase: SupabaseClient
  
  // Service client (bypasses RLS - use carefully)
  serviceClient: SupabaseClient
  
  // Validated request data (if validation schemas provided)
  validatedBody?: any
  validatedQuery?: any
  validatedParams?: any
}
```

## Error Handling

The middleware automatically handles errors and returns sanitized responses:

- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions or role
- **400 Bad Request**: Validation failed
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected error (sanitized)

All errors are logged with context for debugging and monitoring.

## Security Features

### Automatic Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

### Request Logging

All requests are logged with:
- Request ID (for tracing)
- User ID and Tenant ID
- IP address and user agent
- Response status and duration
- Sanitized query parameters

### Security Event Logging

Security events are automatically logged:
- Authentication failures
- Authorization failures
- Rate limit violations
- Suspicious activity

## Best Practices

1. **Always use rate limiting** for endpoints that perform expensive operations or external API calls
2. **Validate all inputs** using Zod schemas to prevent injection attacks
3. **Use specific permissions** instead of role-based checks when possible
4. **Never bypass RLS** unless absolutely necessary (use `serviceClient` carefully)
5. **Keep validation schemas close** to your route handlers for maintainability
6. **Use custom rate limit keys** for different endpoint categories

## Migration from Old withAuth

The enhanced middleware is backward compatible. Existing code will continue to work:

```typescript
// Old usage (still works)
export const GET = withAuth(async (req, ctx) => {
  return NextResponse.json({ data: [] })
}, { permission: 'contact.view' })

// New usage (with additional features)
export const GET = withAuth(
  async (req, ctx) => {
    return NextResponse.json({ data: [] })
  },
  {
    permission: 'contact.view',
    rateLimit: { maxRequests: 1000, windowSeconds: 3600 },
    validation: { query: QuerySchema },
  }
)
```

## Requirements Addressed

This implementation addresses the following requirements from the security-optimization spec:

- **2.1**: Authentication verification before processing
- **2.2**: Tenant isolation enforcement
- **2.5**: Permission checking via RBAC
- **2.6**: Authenticated user context injection
- **2.7**: Tenant ID injection
- **1.2-1.4**: Input validation with Zod schemas
- **3.1-3.10**: Rate limiting with Redis
- **7.1-7.10**: Centralized error handling
- **13.1-13.10**: Security headers
- **14.1-14.10**: Request logging
