// Core - README
# Core Module

## Overview
Core functionality for authentication, permissions, and API client. Inspired by middleware pattern from reference project (crm-wsp backend).

## Structure

```
core/
├── auth/
│   ├── middleware.ts      # Server-side auth middleware
│   ├── guards.tsx         # Client-side route guards
│   └── index.ts
├── permissions/
│   ├── middleware.ts      # Permission checks
│   └── index.ts
├── api/
│   ├── client.ts          # API client with interceptors
│   └── index.ts
└── index.ts
```

## Auth Middleware (Server-Side)

### Basic Usage

```typescript
import { withAuth, withRole } from '@/core/auth'

// Require authentication
export const GET = withAuth(async (req, context) => {
  // context.user contains authenticated user
  // context.supabase is Supabase client
  return new Response(JSON.stringify({ user: context.user }))
})

// Require specific role
export const POST = withRole(['owner'], async (req, context) => {
  // Only owners can access
  return new Response(JSON.stringify({ success: true }))
})
```

### Available Functions

**getAuthUser()** - Get current authenticated user
```typescript
const user = await getAuthUser()
if (!user) {
  // Not authenticated
}
```

**requireAuth()** - Require authentication (throws if not authenticated)
```typescript
const context = await requireAuth()
// context.user and context.supabase available
```

**requireRole(roles)** - Require specific role
```typescript
const context = await requireRole(['owner', 'supervisor'])
```

**requireOwner()** - Require owner role
```typescript
const context = await requireOwner()
```

**requireAgent()** - Require agent role
```typescript
const context = await requireAgent()
```

**getAgentOwner(agentId)** - Get owner info for agent
```typescript
const owner = await getAgentOwner(agentId)
```

### Middleware Wrappers

**withAuth(handler)** - Wrap handler with auth check
```typescript
export const GET = withAuth(async (req, context) => {
  // Authenticated user in context
})
```

**withRole(roles, handler)** - Wrap handler with role check
```typescript
export const POST = withRole(['owner'], async (req, context) => {
  // Only owners can access
})
```

## Permission Middleware

### Basic Usage

```typescript
import { requirePermission, requireConversationAccess } from '@/core/permissions'

export const POST = withAuth(async (req, context) => {
  // Check permission
  requirePermission(context, 'canSendMessage')
  
  // Check conversation access
  const conversation = await requireConversationAccess(context, conversationId)
  
  // ... handle request
})
```

### Available Functions

**requirePermission(context, permission)** - Check if user has permission
```typescript
requirePermission(context, 'canEditContact')
```

**requireConversationAccess(context, conversationId)** - Check conversation access
```typescript
const conversation = await requireConversationAccess(context, conversationId)
```

**requireMessagePermission(context, conversationId)** - Check if can send message
```typescript
const conversation = await requireMessagePermission(context, conversationId)
```

**requirePickPermission(context, conversationId)** - Check if can pick
```typescript
const conversation = await requirePickPermission(context, conversationId)
```

**requireAssignPermission(context)** - Check if can assign
```typescript
requireAssignPermission(context)
```

**requireHandoverPermission(context, conversationId)** - Check if can handover
```typescript
const conversation = await requireHandoverPermission(context, conversationId)
```

**requireClosePermission(context, conversationId)** - Check if can close
```typescript
const conversation = await requireClosePermission(context, conversationId)
```

### Middleware Wrappers

**withPermission(permission, handler)** - Wrap with permission check
```typescript
export const POST = withAuth(
  withPermission('canSendMessage', async (req, context) => {
    // User has permission
  })
)
```

**withConversationAccess(handler)** - Wrap with conversation access check
```typescript
export const GET = withAuth(
  withConversationAccess(async (req, context, conversation) => {
    // User has access to conversation
  })
)
```

## Route Guards (Client-Side)

### Basic Usage

```typescript
import { AuthGuard, RoleGuard, OwnerGuard } from '@/core/auth'

// Protect page with authentication
export default function ProtectedPage() {
  return (
    <AuthGuard>
      <YourComponent />
    </AuthGuard>
  )
}

// Protect page with role
export default function OwnerPage() {
  return (
    <OwnerGuard>
      <YourComponent />
    </OwnerGuard>
  )
}
```

### Available Guards

**AuthGuard** - Require authentication
```typescript
<AuthGuard redirectTo="/login">
  <YourComponent />
</AuthGuard>
```

**RoleGuard** - Require specific roles
```typescript
<RoleGuard allowedRoles={['owner', 'supervisor']}>
  <YourComponent />
</RoleGuard>
```

**OwnerGuard** - Require owner role
```typescript
<OwnerGuard>
  <YourComponent />
</OwnerGuard>
```

**AgentGuard** - Require agent role
```typescript
<AgentGuard>
  <YourComponent />
</AgentGuard>
```

**SupervisorGuard** - Require supervisor role
```typescript
<SupervisorGuard>
  <YourComponent />
</SupervisorGuard>
```

**OwnerOrSupervisorGuard** - Require owner or supervisor
```typescript
<OwnerOrSupervisorGuard>
  <YourComponent />
</OwnerOrSupervisorGuard>
```

### useAuth Hook

```typescript
import { useAuth } from '@/core/auth'

function MyComponent() {
  const { user, loading, reload } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not authenticated</div>
  
  return <div>Hello {user.full_name}</div>
}
```

## API Client

### Basic Usage

```typescript
import { apiClient, apiCall } from '@/core/api'

// Using client
const response = await apiClient.get('/chat/conversations')
if (response.success) {
  console.log(response.data)
}

// Using helper (throws on error)
const conversations = await apiCall('/chat/conversations')
```

### Available Methods

**get(endpoint, config?)** - GET request
```typescript
const response = await apiClient.get('/chat/conversations')
```

**post(endpoint, body?, config?)** - POST request
```typescript
const response = await apiClient.post('/chat/messages', {
  content: 'Hello',
  conversationId: '123',
})
```

**put(endpoint, body?, config?)** - PUT request
```typescript
const response = await apiClient.put('/chat/conversations/123', {
  status: 'closed',
})
```

**delete(endpoint, config?)** - DELETE request
```typescript
const response = await apiClient.delete('/chat/messages/123')
```

**patch(endpoint, body?, config?)** - PATCH request
```typescript
const response = await apiClient.patch('/chat/conversations/123', {
  read_status: 'read',
})
```

### Configuration

```typescript
// Custom headers
await apiClient.get('/endpoint', {
  headers: {
    'X-Custom-Header': 'value',
  },
})

// Without auth
await apiClient.get('/public/endpoint', {
  requireAuth: false,
})
```

## Complete Example

### API Route

```typescript
// app/api/chat/messages/route.ts
import { withAuth } from '@/core/auth'
import { requireMessagePermission } from '@/core/permissions'
import { chatService } from '@/features/chat/services'

export const POST = withAuth(async (req, context) => {
  try {
    const body = await req.json()
    const { conversationId, content } = body

    // Check permission
    await requireMessagePermission(context, conversationId)

    // Send message using service
    const result = await chatService.sendMessageWithWorkflow({
      sessionId: body.sessionId,
      whatsappNumber: body.whatsappNumber,
      content,
      conversationId,
      userId: context.user.id,
    })

    return new Response(JSON.stringify({
      success: true,
      data: result,
    }))
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), { status: 500 })
  }
})
```

### Client Component

```typescript
// app/owner/dashboard/page.tsx
import { OwnerGuard } from '@/core/auth'
import { apiClient } from '@/core/api'

export default function OwnerDashboard() {
  return (
    <OwnerGuard>
      <DashboardContent />
    </OwnerGuard>
  )
}

function DashboardContent() {
  const loadData = async () => {
    const response = await apiClient.get('/chat/conversations')
    if (response.success) {
      setConversations(response.data)
    }
  }
  
  // ... rest of component
}
```

## Benefits

1. **Consistent Auth** - Same pattern across all API routes
2. **Type Safety** - Full TypeScript support
3. **Reusable** - DRY principle
4. **Secure** - Centralized security checks
5. **Easy to Test** - Middleware can be tested independently

## Pattern Comparison

### Reference (Backend)
```javascript
// middlewares/user.js
const validateUser = async (req, res, next) => {
  const token = req.get("Authorization")
  jwt.verify(token, SECRET, async (err, decode) => {
    if (getUser[0].role === "user") {
      req.decode = decode
      next()
    }
  })
}

// routes/user.js
router.post("/endpoint", validateUser, async (req, res) => {
  // Handler
})
```

### Our Implementation
```typescript
// core/auth/middleware.ts
export const withAuth = (handler) => {
  return async (req) => {
    const context = await requireAuth()
    return handler(req, context)
  }
}

// app/api/endpoint/route.ts
export const POST = withAuth(async (req, context) => {
  // Handler
})
```

## Testing

```typescript
import { requireAuth, requireRole } from '@/core/auth'

describe('Auth Middleware', () => {
  it('should require authentication', async () => {
    await expect(requireAuth()).rejects.toThrow('Authentication required')
  })
  
  it('should check role', async () => {
    await expect(requireRole(['owner'])).rejects.toThrow('Access denied')
  })
})
```
