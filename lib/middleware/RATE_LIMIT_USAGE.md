# Rate Limit Configuration Usage Guide

This guide explains how to use the rate limit tier configurations in the WhatsApp CRM application.

## Overview

The rate limit configuration module (`rate-limit-config.ts`) provides predefined rate limit tiers for different endpoint categories. These tiers are designed to prevent abuse while allowing legitimate usage.

## Rate Limit Tiers

### 1. Authentication Endpoints
- **Limit**: 5 requests per minute per IP address
- **Use for**: Login, registration, password reset endpoints
- **Identifier**: IP address
- **Purpose**: Prevent brute force attacks

### 2. WhatsApp Messaging Endpoints
- **Limit**: 100 requests per hour per tenant
- **Use for**: Sending WhatsApp messages
- **Identifier**: Tenant ID
- **Purpose**: Prevent spam and respect WhatsApp API limits

### 3. Standard API Endpoints
- **Limit**: 1000 requests per hour per tenant
- **Use for**: Contacts, conversations, and other standard operations
- **Identifier**: Tenant ID
- **Purpose**: Prevent abuse while allowing normal operations

### 4. Admin Endpoints
- **Limit**: 500 requests per hour per user
- **Use for**: User management, tenant configuration
- **Identifier**: User ID
- **Purpose**: Moderate limit for administrative operations

### 5. Webhook Endpoints
- **Limit**: 10000 requests per hour per tenant
- **Use for**: External webhook integrations
- **Identifier**: Tenant ID
- **Purpose**: High limit for external integrations

## Usage Example

```typescript
import { getStandardApiRateLimitOptions } from '@/lib/middleware/rate-limit-config'
import { rateLimiter } from '@/lib/middleware/rate-limiter'

const options = getStandardApiRateLimitOptions(tenantId)
const result = await rateLimiter.checkLimit(options)

if (!result.allowed) {
  return res.status(429).json({ 
    error: 'API rate limit exceeded',
    retryAfter: result.reset 
  })
}
```

## Usage Example

```typescript
import { getStandardApiRateLimitOptions } from '@/lib/middleware/rate-limit-config'
import { rateLimiter } from '@/lib/middleware/rate-limiter'

const options = getStandardApiRateLimitOptions(tenantId)
const result = await rateLimiter.checkLimit(options)

if (!result.allowed) {
  return res.status(429).json({ 
    error: 'API rate limit exceeded',
    retryAfter: result.reset 
  })
}
```

## Using with withAuth Middleware

```typescript
import { withAuth } from '@/lib/middleware/with-auth'
import { getStandardApiRateLimitOptions } from '@/lib/middleware/rate-limit-config'

export const GET = withAuth(
  async (req, context) => {
    return NextResponse.json({ data: 'success' })
  },
  {
    permission: 'contacts:read',
    rateLimit: getStandardApiRateLimitOptions(context.tenantId)
  }
)
```

## Requirements Mapping

- **Requirement 3.6**: Authentication endpoints - 5 requests/minute per IP ✓
- **Requirement 3.7**: WhatsApp message sending - 100 requests/hour per tenant ✓
- **Requirement 3.8**: Standard API endpoints - 1000 requests/hour per tenant ✓
- **Requirement 3.9**: Admin endpoints - 500 requests/hour per user ✓
