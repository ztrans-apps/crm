# Chat Services

## Overview
Service layer for chat feature that handles all business logic. Services are organized following the pattern from reference project (crm-wsp backend).

## Architecture

```
services/
├── base.service.ts           # Base class with common functionality
├── chat.service.ts           # Main orchestrator (use this in most cases)
├── conversation.service.ts   # Conversation operations
├── message.service.ts        # Message operations
├── contact.service.ts        # Contact operations
└── index.ts                  # Barrel export
```

## Services

### ChatService (Main Orchestrator)
The primary service that should be used by components/hooks. It orchestrates all chat-related operations.

```typescript
import { chatService } from '@/features/chat/services'

// Initialize chat
const { conversations, stats, session } = await chatService.initializeChat(userId, role)

// Send message with full workflow
await chatService.sendMessageWithWorkflow({
  sessionId,
  whatsappNumber,
  content,
  conversationId,
  userId,
})

// Get full conversation data
const { conversation, messages, contact, stats } = await chatService.getFullConversation(conversationId)
```

**Methods:**
- `initializeChat(userId, role)` - Initialize chat with all necessary data
- `getActiveSession(userId, role)` - Get active WhatsApp session
- `sendMessageWithWorkflow(params)` - Send message with full workflow
- `getFullConversation(conversationId)` - Get complete conversation data
- `updateContactInConversation(conversationId, name, metadata)` - Update contact
- `globalSearch(query, userId, role)` - Search across conversations and contacts
- `getDashboardStats(userId, role)` - Get dashboard statistics
- `bulkMarkAsRead(conversationIds)` - Bulk mark as read
- `bulkAssign(conversationIds, agentId)` - Bulk assign

### ConversationService
Handles conversation-specific operations.

```typescript
import { conversationService } from '@/features/chat/services'

// Get conversations
const conversations = await conversationService.getConversations(userId, role, {
  status: 'open',
  assignedTo: userId,
})

// Pick conversation
await conversationService.pickConversation(conversationId, agentId)

// Assign conversation
await conversationService.assignConversation(conversationId, agentId)

// Handover conversation
await conversationService.handoverConversation(conversationId, fromAgentId, toAgentId, reason)
```

**Methods:**
- `getConversations(userId, role, filters?)` - Get conversations with filters
- `getConversationById(conversationId)` - Get single conversation
- `markAsRead(conversationId)` - Mark as read
- `closeConversation(conversationId, userId)` - Close conversation
- `pickConversation(conversationId, agentId)` - Agent self-assign
- `assignConversation(conversationId, agentId)` - Owner assign
- `handoverConversation(conversationId, fromAgentId, toAgentId, reason?)` - Handover
- `updateWorkflowStatus(conversationId, status, userId)` - Update workflow status
- `getConversationStats(userId, role)` - Get statistics

### MessageService
Handles message operations.

```typescript
import { messageService } from '@/features/chat/services'

// Get messages
const messages = await messageService.getMessages(conversationId)

// Send message
const result = await messageService.sendMessage({
  sessionId,
  whatsappNumber,
  content,
  conversationId,
  userId,
  media,
})

// Translate message
const translated = await messageService.translateMessage(content, 'id')
```

**Methods:**
- `getMessages(conversationId)` - Get all messages
- `sendMessage(params)` - Send message via WhatsApp
- `translateMessage(content, targetLanguage)` - Translate message
- `markMessagesAsRead(conversationId)` - Mark messages as read
- `getMessageStats(conversationId)` - Get message statistics
- `deleteMessage(messageId)` - Delete message
- `searchMessages(conversationId, query)` - Search messages

### ContactService
Handles contact operations.

```typescript
import { contactService } from '@/features/chat/services'

// Get contact
const contact = await contactService.getContactById(contactId)

// Update contact
await contactService.updateContact(contactId, name, {
  email: 'user@example.com',
  company: 'Company Inc',
  position: 'Manager',
})

// Search contacts
const contacts = await contactService.searchContacts('john')
```

**Methods:**
- `getContactById(contactId)` - Get contact by ID
- `updateContact(contactId, name, metadata?)` - Update contact
- `updateContactMetadata(contactId, metadata)` - Update metadata only
- `searchContacts(query, limit?)` - Search contacts
- `getContactConversations(contactId)` - Get contact's conversations
- `getContactStats(contactId)` - Get contact statistics
- `createContact(phoneNumber, name?, metadata?)` - Create new contact
- `getOrCreateContact(phoneNumber, name?)` - Get or create contact

## Usage in Hooks

### Example: useChat Hook

```typescript
import { chatService } from '@/features/chat/services'

export function useChat() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const loadConversations = async (userId: string, role: UserRole) => {
    try {
      setLoading(true)
      const data = await chatService.conversations.getConversations(userId, role)
      setConversations(data)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  return { conversations, loading, loadConversations }
}
```

### Example: useMessages Hook

```typescript
import { chatService } from '@/features/chat/services'

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState([])

  const loadMessages = async () => {
    const data = await chatService.messages.getMessages(conversationId)
    setMessages(data)
  }

  const sendMessage = async (content: string) => {
    await chatService.sendMessageWithWorkflow({
      sessionId,
      whatsappNumber,
      content,
      conversationId,
      userId,
    })
    await loadMessages()
  }

  return { messages, loadMessages, sendMessage }
}
```

## Benefits

### 1. **Separation of Concerns** ✅
- Business logic separated from UI
- Easier to test
- Reusable across different components

### 2. **Single Source of Truth** ✅
- All business logic in one place
- Consistent behavior across app
- Easier to maintain

### 3. **Error Handling** ✅
- Centralized error handling
- Consistent error messages
- Better debugging

### 4. **Logging** ✅
- Built-in logging for development
- Easy to track operations
- Better debugging

### 5. **Type Safety** ✅
- Full TypeScript support
- Type-safe parameters
- Better IDE support

## Best Practices

### 1. Use ChatService for Most Operations
```typescript
// ✅ Good - Use main orchestrator
import { chatService } from '@/features/chat/services'
await chatService.sendMessageWithWorkflow(params)

// ❌ Avoid - Direct service usage (unless needed)
import { messageService } from '@/features/chat/services'
await messageService.sendMessage(params)
```

### 2. Handle Errors Properly
```typescript
try {
  await chatService.sendMessageWithWorkflow(params)
} catch (error) {
  // Handle error in UI
  alert('Failed to send message: ' + error.message)
}
```

### 3. Use Services in Hooks, Not Components
```typescript
// ✅ Good - Use in hooks
export function useChat() {
  const loadData = async () => {
    const data = await chatService.initializeChat(userId, role)
    // ...
  }
}

// ❌ Avoid - Direct usage in components
export function ChatComponent() {
  const handleClick = async () => {
    await chatService.sendMessage(...)  // Should be in hook
  }
}
```

### 4. Leverage Singleton Instances
```typescript
// Services are singletons - no need to instantiate
import { chatService } from '@/features/chat/services'

// ✅ Good
await chatService.initializeChat(userId, role)

// ❌ Avoid
const service = new ChatService()  // Don't do this
```

## Testing

Services can be easily tested:

```typescript
import { conversationService } from '@/features/chat/services'

describe('ConversationService', () => {
  it('should get conversations', async () => {
    const conversations = await conversationService.getConversations(userId, 'owner')
    expect(conversations).toBeDefined()
  })
})
```

## Future Improvements

- [ ] Add caching layer
- [ ] Add retry logic for failed operations
- [ ] Add rate limiting
- [ ] Add batch operations
- [ ] Add offline support
- [ ] Add real-time subscriptions
- [ ] Add analytics tracking
