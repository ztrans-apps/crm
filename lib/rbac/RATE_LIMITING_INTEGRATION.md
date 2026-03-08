# Rate Limiting Integration with withAuth

## Overview

The `withAuth` middleware now includes integrated rate limiting support. Rate limiting is checked **after authentication** using the tenant ID as the identifier, ensuring accurate per-tenant rate limiting.

## Features

- ✅ Rate limiting checked BEFORE request processing
- ✅ Returns 429 status with Retry-After header when limit exceeded
- ✅ Adds rate limit headers (X-RateLimit-*) to all responses
- ✅ Uses tenant ID for authenticated requests (more accurate than IP-based)
- ✅ Logs rate limit violations for security monitoring
- ✅ Integrates with existing error handling

## Usage

### Basic Rate Limiting

```typescript
import { withAuth } from '@/lib/rbac/with-auth'

export const POST = withAuth(
  async (req, ctx) => {
    // Your handler logic
    return NextResponse.json({ success: true })
  },
  {
    rateLimit: {
      maxRequests: 100,
      windowSeconds: 3600, // 1 hour
    }
  }
)
```

### With Custom Key Prefix

```typescript
export const POST = withAuth(
  async (req, ctx) => {
    // Your handler logic
    return NextResponse.json({ success: true })
  },
  {
    rateLimit: {
      maxRequests: 100,
      windowSeconds: 3600,
      keyPrefix: 'api:messages:send', // Custom prefix for better organization
    }
  }
)
```

### Using Predefined Rate Limit Tiers

```typescript
import { withAuth } from '@/lib/rbac/with-auth'
import { RATE_LIMIT_TIERS } from '@/lib/middleware/rate-limit-config'

// WhatsApp message sending endpoint
export const POST = withAuth(
  async (req, ctx) => {
    // Send WhatsApp message
    return NextResponse.json({ success: true })
  },
  {
    permission: 'message.send',
    rateLimit: {
      maxRequests: RATE_LIMIT_TIERS.WHATSAPP_MESSAGING.maxRequests,
      windowSeconds: RATE_LIMIT_TIERS.WHATSAPP_MESSAGING.windowSeconds,
      keyPrefix: 'whatsapp:send',
    }
  }
)

// Standard API endpoint
export const GET = withAuth(
  async (req, ctx) => {
    // Fetch data
    return NextResponse.json({ data: [] })
  },
  {
    rateLimit: {
      maxRequests: RATE_LIMIT_TIERS.STANDARD_API.maxRequests,
      windowSeconds: RATE_LIMIT_TIERS.STANDARD_API.windowSeconds,
    }
  }
)
```

## Response Headers

When rate limiting is configured, all responses include the following headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the window
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Unix timestamp (seconds) when the rate limit resets

### Example Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Rate Limit Exceeded Response

When the rate limit is exceeded, the API returns:

**Status Code**: `429 Too Many Requests`

**Headers**:
- `Retry-After`: Number of seconds to wait before retrying
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: 0
- `X-RateLimit-Reset`: Unix timestamp when limit resets

**Response Body**:
```json
{
  "error": "Rate limit exceeded",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_001",
  "requestId": "abc123...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Implementation Details

### Request Flow

1. **Authentication**: User is authenticated via Supabase Auth
2. **Tenant Resolution**: Tenant ID is extracted from user profile
3. **Rate Limit Check**: Rate limiter checks if tenant has exceeded limit
4. **Rate Limit Violation**: If exceeded, throws `RateLimitError` with Retry-After
5. **Counter Increment**: If allowed, increment the counter
6. **Request Processing**: Continue with authorization and request handling
7. **Response Headers**: Add rate limit headers to response

### Rate Limit Identifier

The rate limiter uses the **tenant ID** as the identifier for authenticated requests. This provides:

- **Accurate per-tenant limiting**: Each tenant has their own rate limit
- **Multi-tenant isolation**: One tenant cannot exhaust another's quota
- **Better security**: IP-based limiting can be bypassed with proxies

### Security Logging

Rate limit violations are logged as security events:

```typescript
{
  type: 'rate_limit',
  userId: 'user-id',
  tenantId: 'tenant-id',
  ip: '192.168.1.1',
  details: {
    endpoint: '/api/messages',
    limit: 100,
    remaining: 0,
    reset: 1704067200
  },
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

## Rate Limit Tiers

The system provides predefined rate limit tiers for different endpoint categories:

| Tier | Max Requests | Window | Identifier | Use Case |
|------|--------------|--------|------------|----------|
| AUTHENTICATION | 5 | 1 minute | IP | Login, register, password reset |
| WHATSAPP_MESSAGING | 100 | 1 hour | Tenant | WhatsApp message sending |
| STANDARD_API | 1000 | 1 hour | Tenant | Standard API endpoints |
| ADMIN | 500 | 1 hour | User | Admin operations |
| WEBHOOK | 10000 | 1 hour | Tenant | Webhook endpoints |

See `lib/middleware/rate-limit-config.ts` for full configuration.

## Requirements Validated

This implementation validates the following requirements:

- **Requirement 3.3**: Rate limiting integrated with authentication ✅
- **Requirement 3.4**: Rate limit headers included in responses ✅
- **Requirement 3.10**: Retry-After header on 429 responses ✅

## Testing

Unit tests verify:
- Rate limit checking when configured
- Request rejection when limit exceeded
- Rate limit headers added to responses
- Retry-After header included in 429 responses

See `tests/unit/with-auth.test.ts` for test implementation.
