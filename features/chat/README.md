# Chat Feature Module

## Overview
This is the main chat feature module organized following feature-based architecture pattern. All chat-related code is contained within this module for better maintainability and scalability.

## Structure

```
features/chat/
├── components/              # UI Components
│   ├── ConversationList/   # Conversation list component
│   ├── ChatWindow/          # Chat window component (TBD)
│   ├── RightSidebar/        # Right sidebar component
│   └── shared/              # Shared components
│       ├── ConversationItem.tsx
│       ├── MessageBubble.tsx
│       ├── CustomerProfile.tsx
│       ├── NoteForm.tsx
│       ├── WorkflowStatus.tsx
│       ├── ChatLabels.tsx
│       ├── DateSeparator.tsx
│       └── InputBar.tsx
│
├── hooks/                   # Custom React hooks
│   ├── useChat.ts          # Main chat logic
│   ├── useMessages.ts      # Message handling
│   └── usePermissions.ts   # Permission checks
│
├── services/                # Business logic (TBD)
│   ├── chat.service.ts
│   └── message.service.ts
│
├── types/                   # TypeScript types
│   └── index.ts
│
├── utils/                   # Utility functions (TBD)
│   └── helpers.ts
│
└── index.ts                 # Main barrel export
```

## Usage

### Import Components

```typescript
import { ConversationList, RightSidebar } from '@/features/chat/components'
```

### Import Hooks

```typescript
import { useChat, useMessages, usePermissions } from '@/features/chat/hooks'
```

### Import Types

```typescript
import type { Conversation, FilterType } from '@/features/chat/types'
```

## Components

### ConversationList
Displays list of conversations with filtering and search capabilities.

**Props:**
- `conversations` - Array of conversations
- `selectedId` - Currently selected conversation ID
- `onSelect` - Callback when conversation is selected
- `searchQuery` - Search query string
- `onSearchChange` - Callback when search changes
- `loading` - Loading state
- `onPickConversation` - Callback to pick unassigned conversation
- `currentUserId` - Current user ID
- `userRole` - User role (owner/agent/supervisor)

### RightSidebar
Displays conversation details, customer profile, notes, labels, and workflow status.

**Props:**
- `conversation` - Current conversation
- `notes` - Array of notes
- `appliedLabels` - Applied labels
- `availableLabels` - Available labels
- `onSaveNote` - Save note callback
- `onUpdateContact` - Update contact callback
- `onHandoverToAgent` - Handover callback (agent only)
- `onAssignAgent` - Assign callback (owner only)
- `onApplyLabel` - Apply label callback
- `onRemoveLabel` - Remove label callback
- `onCloseConversation` - Close conversation callback
- `onStatusChanged` - Status changed callback
- `currentUserId` - Current user ID
- `userRole` - User role
- `canEditContact` - Permission flag
- `canApplyLabel` - Permission flag
- `canCreateNote` - Permission flag
- `canChangeStatus` - Permission flag

## Hooks

### useChat()
Main hook for chat functionality.

**Returns:**
- `conversations` - All conversations
- `filteredConversations` - Filtered conversations
- `selectedConversation` - Currently selected conversation
- `selectedConversationId` - Selected conversation ID
- `setSelectedConversationId` - Set selected conversation
- `userId` - Current user ID
- `userRole` - User role
- `sessionId` - WhatsApp session ID
- `searchQuery` - Search query
- `setSearchQuery` - Set search query
- `loading` - Loading state
- `refreshConversations` - Refresh conversations function

### useMessages()
Hook for message handling.

**Parameters:**
- `conversationId` - Current conversation ID
- `sessionId` - WhatsApp session ID
- `userId` - Current user ID
- `onConversationsRefresh` - Callback to refresh conversations

**Returns:**
- `messages` - Array of messages
- `messageInput` - Message input value
- `setMessageInput` - Set message input
- `translations` - Message translations
- `translating` - Translation loading states
- `sending` - Sending state
- `loading` - Loading state
- `handleSendMessage` - Send message function
- `handleTranslate` - Translate message function
- `markAsRead` - Mark as read function
- `refreshMessages` - Refresh messages function

### usePermissions()
Hook for permission checks.

**Parameters:**
- `role` - User role
- `userId` - User ID
- `conversation` - Current conversation

**Returns:**
- `permissions` - General permissions object
- `conversationActions` - Conversation-specific actions

## Best Practices

1. **Import from barrel exports** - Always import from `@/features/chat` not from individual files
2. **Use TypeScript types** - Import types from `@/features/chat/types`
3. **Keep components small** - Extract complex logic to hooks or services
4. **Follow naming conventions** - Use PascalCase for components, camelCase for functions
5. **Document props** - Add JSDoc comments for component props

## Future Improvements

- [ ] Add service layer for business logic
- [ ] Add utility functions
- [ ] Add unit tests
- [ ] Add Storybook stories
- [ ] Add E2E tests
- [ ] Extract ChatWindow to this module
- [ ] Extract QuickReplies to this module

## Related Modules

- `lib/permissions` - Permission system
- `lib/api` - API functions
- `lib/types` - Global types
