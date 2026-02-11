// Chat services - barrel export
export { BaseService } from './base.service'
export { ChatService, chatService } from './chat.service'
export { ConversationService, conversationService } from './conversation.service'
export { MessageService, messageService } from './message.service'
export { ContactService, contactService } from './contact.service'

// Export types
export type { SendMessageParams } from './message.service'
export type { ConversationFilters } from './conversation.service'
export type { ContactMetadata } from './contact.service'
