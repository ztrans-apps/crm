/**
 * Central DTO exports
 * 
 * Provides a single import point for all DTO types.
 * Ensures type safety across frontend-backend boundary.
 * 
 * **Requirement 9.10**: UI components use TypeScript types from DTO definitions
 */

// Contact DTOs
export type {
  CreateContactInput,
  UpdateContactInput,
  ContactOutput,
  ContactModel,
  ContactFilters,
  ContactListOutput,
} from './contact.dto'

export {
  toContactOutput,
  fromCreateContactInput,
  fromUpdateContactInput,
  toContactOutputList,
} from './contact.dto'

// Message DTOs
export type {
  MediaType,
  MessageStatus,
  MessageDirection,
  SendMessageInput,
  MessageOutput,
  MessageModel,
  MessageFilters,
  MessageListOutput,
  MessageStats,
} from './message.dto'

export {
  toMessageOutput,
  fromSendMessageInput,
  toMessageOutputList,
} from './message.dto'

// Broadcast DTOs
export type {
  BroadcastStatus,
  CreateBroadcastInput,
  UpdateBroadcastInput,
  BroadcastOutput,
  BroadcastModel,
  BroadcastFilters,
  BroadcastListOutput,
  BroadcastStats,
  BroadcastRecipient,
} from './broadcast.dto'

export {
  toBroadcastOutput,
  fromCreateBroadcastInput,
  fromUpdateBroadcastInput,
  toBroadcastOutputList,
  toBroadcastStats,
} from './broadcast.dto'

// Conversation DTOs
export type {
  CreateConversationInput,
  UpdateConversationInput,
  ConversationOutput,
  ConversationModel,
  ConversationFilters,
  ConversationListOutput,
} from './conversation.dto'

export {
  toConversationOutput,
  fromCreateConversationInput,
  fromUpdateConversationInput,
  toConversationOutputList,
} from './conversation.dto'
