# Real-time Subscriptions Guide

This document describes the patterns and best practices for using Supabase Realtime subscriptions in the WhatsApp CRM system.

## Overview

Per **Requirement 9.7**, Supabase Realtime subscriptions are allowed for real-time updates as long as RLS (Row Level Security) policies are enforced. This ensures that users only receive updates for data they have permission to access.

## Architecture

### Components

1. **RealtimeManager** (`lib/realtime/realtime-manager.ts`)
   - Centralized management of Realtime subscriptions
   - Connection failure handling
   - Automatic reconnection with exponential backoff
   - Subscription lifecycle management

2. **useRealtimeSubscription Hook** (`lib/realtime/use-realtime-subscription.ts`)
   - React hook for easy subscription management
   - Automatic cleanup on unmount
   - Connection status tracking
   - Error handling

3. **RLS Policies** (Database level)
   - Enforced on `messages` and `conversations` tables
   - Ensures tenant isolation
   - Filters updates based on user's tenant

## Security

### RLS Enforcement

All Realtime subscriptions automatically respect RLS policies. When a user subscribes to a table:

1. Supabase checks the user's authentication token
2. RLS policies filter which rows the user can access
3. Only updates for accessible rows are sent to the client

**Example RLS Policy** (conversations table):
```sql
CREATE POLICY "Users can view conversations from their tenant"
  ON conversations FOR SELECT
  USING (
    whatsapp_session_id IN (
      SELECT id FROM whatsapp_sessions 
      WHERE tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
```

### Tenant Isolation

- Each subscription is scoped to the authenticated user's tenant
- Users cannot receive updates for data from other tenants
- Database-level enforcement provides defense-in-depth

## Usage Patterns

### Pattern 1: Message Updates

Subscribe to new messages in a specific conversation:

```typescript
import { useRealtimeSubscription } from '@/lib/realtime/use-realtime-subscription'
import { createClient } from '@/lib/supabase/client'

function MessageList({ conversationId }: { conversationId: string }) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])

  const { isConnected, error } = useRealtimeSubscription({
    supabase,
    channel: `messages-${conversationId}`,
    table: 'messages',
    event: 'INSERT',
    filter: `conversation_id=eq.${conversationId}`,
    onData: (payload) => {
      const newMessage = payload.new
      setMessages(prev => [...prev, newMessage])
    },
    onError: (error) => {
      console.error('Subscription error:', error)
    },
    onReconnect: () => {
      console.log('Reconnected, refreshing messages...')
      // Optionally refresh data after reconnection
    }
  })

  return (
    <div>
      {!isConnected && <div>Connecting...</div>}
      {error && <div>Error: {error.message}</div>}
      {/* Render messages */}
    </div>
  )
}
```

### Pattern 2: Conversation List Updates

Subscribe to conversation updates (status changes, new messages, etc.):

```typescript
const { isConnected } = useRealtimeSubscription({
  supabase,
  channel: 'conversations-changes',
  table: 'conversations',
  event: 'UPDATE',
  onData: (payload) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === payload.new.id 
          ? { ...conv, ...payload.new }
          : conv
      )
    )
  }
})
```

### Pattern 3: Multiple Event Types

Subscribe to multiple event types on the same table:

```typescript
// Subscribe to all events (INSERT, UPDATE, DELETE)
const { isConnected } = useRealtimeSubscription({
  supabase,
  channel: 'messages-all-events',
  table: 'messages',
  event: '*', // Listen to all events
  filter: `conversation_id=eq.${conversationId}`,
  onData: (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        handleNewMessage(payload.new)
        break
      case 'UPDATE':
        handleMessageUpdate(payload.new)
        break
      case 'DELETE':
        handleMessageDelete(payload.old)
        break
    }
  }
})
```

### Pattern 4: Manual Subscription Management

For more control, use the RealtimeManager directly:

```typescript
import { getRealtimeManager } from '@/lib/realtime/realtime-manager'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const manager = getRealtimeManager(supabase)

// Subscribe
const unsubscribe = manager.subscribe({
  channel: 'my-channel',
  table: 'messages',
  event: 'INSERT',
  onData: (payload) => {
    console.log('New data:', payload.new)
  },
  onError: (error) => {
    console.error('Error:', error)
  }
})

// Later, unsubscribe
unsubscribe()

// Check connection status
const isConnected = manager.isConnected('my-channel')
const status = manager.getConnectionStatus('my-channel')
```

## Connection Failure Handling

### Automatic Reconnection

The RealtimeManager automatically handles connection failures:

1. **Detection**: Monitors subscription status for errors or timeouts
2. **Exponential Backoff**: Retries with increasing delays (1s, 2s, 4s, 8s, 16s)
3. **Max Attempts**: Stops after 5 failed reconnection attempts
4. **Callback**: Calls `onReconnect` callback when successfully reconnected

### Handling Disconnections

```typescript
const { isConnected, error, reconnectAttempts } = useRealtimeSubscription({
  supabase,
  channel: 'my-channel',
  table: 'messages',
  onData: (payload) => {
    // Handle data
  },
  onError: (error) => {
    // Log error or show user notification
    console.error('Subscription error:', error)
  },
  onReconnect: () => {
    // Refresh data after reconnection to catch any missed updates
    refreshMessages()
  }
})

// Show connection status to user
if (!isConnected) {
  return <div>Reconnecting... (Attempt {reconnectAttempts}/5)</div>
}
```

### Graceful Degradation

When Realtime is unavailable:

1. **Polling Fallback**: Implement periodic polling as a fallback
2. **User Notification**: Inform users that real-time updates are unavailable
3. **Manual Refresh**: Provide a manual refresh button

```typescript
const { isConnected } = useRealtimeSubscription({
  supabase,
  channel: 'messages',
  table: 'messages',
  onData: handleNewMessage
})

// Fallback to polling if not connected
useEffect(() => {
  if (!isConnected) {
    const interval = setInterval(() => {
      refreshMessages()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }
}, [isConnected])
```

## Performance Considerations

### Channel Naming

Use unique channel names to avoid conflicts:

```typescript
// Good: Unique per resource
channel: `messages-${conversationId}`
channel: `conversation-${conversationId}`

// Bad: Generic names that might conflict
channel: 'messages'
channel: 'updates'
```

### Subscription Cleanup

Always clean up subscriptions when components unmount:

```typescript
// With useRealtimeSubscription hook (automatic cleanup)
useRealtimeSubscription({ ... })

// With manual management
useEffect(() => {
  const unsubscribe = manager.subscribe({ ... })
  return () => unsubscribe() // Cleanup on unmount
}, [])
```

### Filtering

Use filters to reduce unnecessary updates:

```typescript
// Good: Filter at database level
filter: `conversation_id=eq.${conversationId}`

// Bad: Receive all updates and filter in client
// (No filter, then check in onData callback)
```

## Testing

### Unit Tests

Test subscription logic with mocked Supabase client:

```typescript
import { RealtimeManager } from '@/lib/realtime/realtime-manager'

describe('RealtimeManager', () => {
  it('should handle connection failures', () => {
    const mockSupabase = createMockSupabase()
    const manager = new RealtimeManager(mockSupabase)
    
    // Test reconnection logic
  })
})
```

### Integration Tests

Test with actual Supabase instance:

```typescript
describe('Realtime Integration', () => {
  it('should receive updates with RLS enforcement', async () => {
    // Create test data
    // Subscribe to updates
    // Verify only authorized updates are received
  })
})
```

## Troubleshooting

### Subscription Not Receiving Updates

1. **Check RLS Policies**: Ensure RLS policies allow SELECT on the table
2. **Verify Authentication**: Ensure user is authenticated
3. **Check Filters**: Verify filter syntax is correct
4. **Inspect Network**: Check browser DevTools for WebSocket connection

### Connection Keeps Dropping

1. **Network Issues**: Check network stability
2. **Supabase Status**: Check Supabase status page
3. **Rate Limits**: Ensure not exceeding Supabase rate limits
4. **Browser Limits**: Check browser WebSocket connection limits

### Not Receiving Updates from Other Users

This is expected behavior with RLS! Each user only receives updates for data they have access to based on RLS policies.

## Best Practices

1. **Always Enable RLS**: Never disable RLS on tables with Realtime subscriptions
2. **Use Filters**: Filter at database level to reduce bandwidth
3. **Handle Errors**: Always provide `onError` callback
4. **Clean Up**: Unsubscribe when component unmounts
5. **Unique Channels**: Use unique channel names per resource
6. **Reconnection Logic**: Implement `onReconnect` to refresh data
7. **User Feedback**: Show connection status to users
8. **Fallback Strategy**: Implement polling fallback for critical features

## Migration from Direct Subscriptions

If you have existing code using direct Supabase subscriptions:

### Before
```typescript
const channel = supabase
  .channel('messages')
  .on('postgres_changes', { ... }, (payload) => {
    // Handle data
  })
  .subscribe()

// Manual cleanup
return () => channel.unsubscribe()
```

### After
```typescript
const { isConnected, error } = useRealtimeSubscription({
  supabase,
  channel: 'messages',
  table: 'messages',
  onData: (payload) => {
    // Handle data
  },
  onError: (error) => {
    // Handle error
  }
})
// Automatic cleanup
```

## References

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- Requirement 9.7: Database Access Separation
