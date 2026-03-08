# Rate Limiter

Redis-based rate limiter with sliding window algorithm and graceful degradation to in-memory storage.

## Features

- **Sliding Window Algorithm**: Accurate rate limiting using Redis sorted sets
- **Distributed**: Works across multiple server instances via Redis
- **Graceful Degradation**: Falls back to in-memory rate limiting when Redis is unavailable
- **Tenant Isolation**: Separate rate limits per tenant/user/IP
- **Flexible Configuration**: Different limits for different endpoints

## Usage

### Basic Usage

```typescript
import { rateLimiter } from '@/lib/middleware/rate-limiter'

// Check if request is allowed
const result = await rateLimiter.checkLimit({
  maxRequests: 100,
  windowSeconds: 3600, // 1 hour
  keyPrefix: 'api:messages',
  identifier: tenantId
})

if (!result.allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { 
      status: 429,
      headers: {
        'Retry-After': String(result.reset - Math.floor(Date.now() / 1000)),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset)
      }
    }
  )
}

// Process request...

// Increment counter after successful processing
await rateLimiter.incrementCounter({
  maxRequests: 100,
  windowSeconds: 3600,
  keyPrefix: 'api:messages',
  identifier: tenantId
})
```

### Atomic Check and Increment

```typescript
// Check and increment in one operation
const result = await rateLimiter.checkAndIncrement({
  maxRequests: 100,
  windowSeconds: 3600,
  keyPrefix: 'api:messages',
  identifier: tenantId
})

if (!result.allowed) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}

// Request is allowed and counter is already incremented
```

### Reset Rate Limit

```typescript
// Reset rate limit for a specific identifier (admin operation)
await rateLimiter.resetLimit('api:messages', tenantId)
```

## Rate Limit Tiers

Recommended rate limits for different endpoint categories:

### Authentication Endpoints
```typescript
{
  maxRequests: 5,
  windowSeconds: 60, // 5 requests per minute
  keyPrefix: 'auth:login',
  identifier: ipAddress
}
```

### WhatsApp Message Sending
```typescript
{
  maxRequests: 100,
  windowSeconds: 3600, // 100 requests per hour
  keyPrefix: 'api:messages:send',
  identifier: tenantId
}
```

### Standard API Endpoints
```typescript
{
  maxRequests: 1000,
  windowSeconds: 3600, // 1000 requests per hour
  keyPrefix: 'api:contacts',
  identifier: tenantId
}
```

### Admin Endpoints
```typescript
{
  maxRequests: 500,
  windowSeconds: 3600, // 500 requests per hour
  keyPrefix: 'api:admin',
  identifier: userId
}
```

### Webhook Endpoints
```typescript
{
  maxRequests: 10000,
  windowSeconds: 3600, // 10000 requests per hour
  keyPrefix: 'webhook:whatsapp',
  identifier: tenantId
}
```

## Integration with withAuth Middleware

The rate limiter is designed to integrate with the `withAuth` middleware:

```typescript
import { withAuth } from '@/lib/middleware/with-auth'
import { rateLimiter } from '@/lib/middleware/rate-limiter'

export const POST = withAuth(
  async (req, context) => {
    // Rate limiting is handled by withAuth middleware
    // Your handler code here
  },
  {
    permission: 'messages.send',
    rateLimit: {
      maxRequests: 100,
      windowSeconds: 3600,
      keyPrefix: 'api:messages:send'
    }
  }
)
```

## How It Works

### Sliding Window Algorithm

The rate limiter uses Redis sorted sets to implement a sliding window algorithm:

1. Each request is stored as a member in a sorted set with its timestamp as the score
2. When checking the limit:
   - Remove all entries older than the window (expired requests)
   - Count remaining entries in the window
   - Compare count against the limit
3. The window "slides" with each request, providing accurate rate limiting

### Graceful Degradation

When Redis is unavailable:
- Automatically falls back to in-memory rate limiting
- Uses a Map to track request timestamps
- Provides the same API and behavior
- Logs warnings about Redis unavailability
- Automatically recovers when Redis becomes available

### Tenant Isolation

Rate limits are isolated by:
- **Key Prefix**: Different endpoints have different limits
- **Identifier**: Different tenants/users/IPs have separate counters

Example keys:
- `ratelimit:api:messages:tenant-123`
- `ratelimit:auth:login:192.168.1.1`
- `ratelimit:api:admin:user-456`

## Response Headers

Include rate limit information in API responses:

```typescript
const headers = {
  'X-RateLimit-Limit': String(result.limit),
  'X-RateLimit-Remaining': String(result.remaining),
  'X-RateLimit-Reset': String(result.reset)
}

if (!result.allowed) {
  headers['Retry-After'] = String(result.reset - Math.floor(Date.now() / 1000))
}
```

## Testing

The rate limiter includes comprehensive unit tests covering:
- Basic rate limiting functionality
- Sliding window behavior
- Tenant isolation
- Graceful degradation
- Reset functionality
- Atomic operations

Run tests:
```bash
npm test -- rate-limiter.test.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **3.1**: Limit requests per tenant per endpoint per time window
- **3.2**: Use Redis for distributed rate limit tracking
- **3.5**: Implement sliding window algorithm for accurate rate limiting
- **3.6**: Support different rate limits for different endpoint categories
- **24.2**: Graceful degradation to in-memory rate limiting when Redis unavailable

## Performance Considerations

- **Redis Operations**: O(log N) for sorted set operations
- **Memory Usage**: Minimal - only stores timestamps within the window
- **Cleanup**: Automatic removal of expired entries
- **Expiration**: Keys automatically expire after window + 60 seconds

## Security Considerations

- Rate limits are enforced before request processing
- Identifiers should be validated to prevent injection
- Use IP address for authentication endpoints to prevent brute force
- Use tenant ID for API endpoints to prevent abuse
- Monitor rate limit violations for security threats
