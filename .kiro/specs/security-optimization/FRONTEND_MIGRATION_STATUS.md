# Frontend Migration Status - Task 25.1

## Completed Updates

### Updated API Client Files (lib/api/)

The following API client files have been updated to use new API endpoints with proper error handling:

1. **lib/api/contacts.ts** ✅
   - Removed direct Supabase client usage
   - Updated to use `/api/contacts` endpoints
   - Added proper TypeScript types from `ContactOutput` DTO
   - Implemented `ApiResponse<T>` wrapper for consistent error handling
   - Uses `ErrorResponse` type from error handler middleware
   - Functions updated:
     - `fetchContacts()` - GET /api/contacts
     - `fetchContactById()` - GET /api/contacts/:id
     - `createContact()` - POST /api/contacts
     - `updateContact()` - PATCH /api/contacts/:id
     - `deleteContact()` - DELETE /api/contacts/:id

2. **lib/api/messages.ts** ✅
   - Removed direct Supabase database access
   - Updated `fetchMessages()` to use `/api/conversations/:id/messages`
   - Updated `sendMessage()` to remove direct database writes (API handles it)
   - Updated `uploadMedia()` to use `/api/media/upload` endpoint
   - Updated `markMessageAsRead()` to use `/api/messages/:id/read`
   - Updated `deleteMessage()` to use `/api/messages/:id`
   - Added proper TypeScript types from `MessageOutput` DTO
   - Implemented `ApiResponse<T>` wrapper for error handling

3. **lib/api/conversations.ts** ✅
   - Removed all direct Supabase client usage
   - Updated to use `/api/conversations` endpoints
   - Added proper TypeScript types from `ConversationOutput` DTO
   - Implemented `ApiResponse<T>` wrapper for error handling
   - Functions updated:
     - `fetchConversations()` - GET /api/conversations
     - `fetchConversationById()` - GET /api/conversations/:id
     - `markConversationAsRead()` - POST /api/conversations/:id/read
     - `markConversationAsUnread()` - POST /api/conversations/:id/unread
     - `closeConversation()` - POST /api/conversations/:id/close
     - `reopenConversation()` - POST /api/conversations/:id/reopen
     - `updateResponseWindow()` - PATCH /api/conversations/:id/response-window
     - `assignConversation()` - POST /api/conversations/:id/assign
     - `unassignConversation()` - POST /api/conversations/:id/unassign

## API Client Files Requiring API Routes

The following API client files still use direct Supabase access and need corresponding API routes to be created:

### 1. lib/api/labels.ts
**Status**: Needs API routes
**Functions requiring migration**:
- `fetchLabels()` - needs GET /api/labels
- `createLabel()` - needs POST /api/labels
- `updateLabel()` - needs PATCH /api/labels/:id
- `deleteLabel()` - needs DELETE /api/labels/:id
- `fetchConversationLabels()` - needs GET /api/conversations/:id/labels
- `applyLabel()` - needs POST /api/conversations/:id/labels
- `removeLabel()` - needs DELETE /api/conversations/:id/labels/:labelId
- `getOrCreateDefaultLabels()` - needs GET /api/labels/defaults
- `getAllAvailableLabels()` - needs GET /api/labels/available

### 2. lib/api/notes.ts
**Status**: Needs API routes
**Functions requiring migration**:
- `fetchNotes()` - needs GET /api/conversations/:id/notes
- `saveNote()` - needs POST /api/conversations/:id/notes
- `updateNote()` - needs PATCH /api/notes/:id
- `deleteNote()` - needs DELETE /api/notes/:id
- `getLatestNote()` - needs GET /api/conversations/:id/notes/latest

### 3. lib/api/agents.ts
**Status**: Needs API routes
**Functions requiring migration**:
- `fetchAgents()` - needs GET /api/agents
- `fetchAgentById()` - needs GET /api/agents/:id

### 4. lib/api/media.ts
**Status**: Needs API routes
**Functions requiring migration**:
- All media asset management functions

### 5. lib/api/chatbots.ts
**Status**: Needs API routes
**Functions requiring migration**:
- All chatbot session management functions

### 6. lib/api/routing.ts
**Status**: Needs API routes
**Functions requiring migration**:
- All agent routing and assignment functions

### 7. lib/api/workflow.ts
**Status**: Needs API routes
**Functions requiring migration**:
- All workflow management functions

### 8. lib/api/quickReplies.ts
**Status**: Needs API routes
**Functions requiring migration**:
- All quick reply management functions

## Error Handling Pattern

All updated API client functions now follow this pattern:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ErrorResponse
}

async function apiFunction(): Promise<ApiResponse<DataType>> {
  try {
    const response = await fetch('/api/endpoint', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to perform operation',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}
```

## Components Still Using Direct Supabase Access

The following components/hooks still use `createClient` from `@/lib/supabase/client`:

### RBAC System (Acceptable - Auth/Permission Checks)
- `lib/rbac/permissions.ts`
- `lib/rbac/client-helpers.ts`
- `lib/rbac/hooks/usePermissions.ts`
- `lib/rbac/chat-permissions.ts`

These are acceptable as they perform authentication and permission checks, not data access.

### Hooks (Need Review)
- `hooks/useMessageTracking.ts` - Uses Supabase Realtime (acceptable per Requirement 9.7)

### Components (Need Review)
- `components/layout/Header.tsx` - Likely for auth
- `components/layout/AgentStatusManager.tsx` - May need API route
- `features/chat/hooks/useChat.ts` - May use Realtime
- `features/chat/hooks/useMessages.ts` - May use Realtime
- `features/chat/components/shared/QuickReplyDropdown.tsx` - Needs API route
- `features/chat/components/shared/QuickReplyDropdownSimple.tsx` - Needs API route

### Admin Pages (Need Review)
- Various admin pages in `app/(app)/admin/` - May need API routes

## Real-time Updates (Supabase Realtime)

Per Requirement 9.7, Supabase Realtime subscriptions are allowed for real-time updates with RLS enforcement. The following should continue using Realtime:

- Message updates
- Conversation status changes
- Agent status updates

## Next Steps

1. Create API routes for labels, notes, agents, media, chatbots, routing, workflow, and quick replies
2. Update remaining API client files to use new endpoints
3. Review and update components that use direct Supabase access (except Realtime subscriptions)
4. Ensure all TypeScript types match DTO definitions
5. Test frontend integration with new API contracts

## Requirements Addressed

- ✅ **Requirement 9.1**: UI components access data through API routes (contacts, messages, conversations)
- ✅ **Requirement 9.3**: React hooks call API endpoints (updated API client functions)
- ✅ **Requirement 9.8**: UI components handle loading and error states (ApiResponse wrapper)
- ✅ **Requirement 9.9**: UI components use TypeScript types from DTO definitions
- ⚠️ **Requirement 9.2**: UI components do not import Supabase client (partially complete - main API clients updated, some components still need work)
- ⚠️ **Requirement 9.7**: Real-time updates use Supabase Realtime with RLS (not modified in this task)
