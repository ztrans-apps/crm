// Chat service - main orchestrator for chat features
import { BaseService } from './base.service'
import { conversationService } from './conversation.service'
import { messageService } from './message.service'
import { contactService } from './contact.service'
import type { UserRole } from '@/lib/rbac/chat-permissions'
import type { SendMessageParams } from './message.service'
import type { ConversationFilters } from './conversation.service'
import type { ContactMetadata } from './contact.service'

/**
 * Main chat service that orchestrates all chat-related operations
 * This is the primary service that should be used by components/hooks
 */
export class ChatService extends BaseService {
  // Conversation operations
  conversations = conversationService
  
  // Message operations
  messages = messageService
  
  // Contact operations
  contacts = contactService

  /**
   * Initialize chat for a user
   * Gets all necessary data for chat interface
   */
  async initializeChat(userId: string, role: UserRole) {
    try {
      this.log('ChatService', 'Initializing chat', { userId, role })

      // Get conversations
      const conversations = await this.conversations.getConversations(userId, role)

      // Get conversation stats
      const stats = await this.conversations.getConversationStats(userId, role)

      // Get WhatsApp session
      const session = await this.getActiveSession(userId, role)

      return {
        conversations,
        stats,
        session,
      }
    } catch (error) {
      this.handleError(error, 'ChatService.initializeChat')
    }
  }

  /**
   * Get active WhatsApp session
   * Returns active session for all authenticated users
   * Permission to send messages is checked separately per conversation
   */
  async getActiveSession(userId: string, role: UserRole) {
    try {
      this.log('ChatService', 'Getting active session', { userId, role })

      // Get active session - all users share the same WhatsApp session
      const { data, error } = await this.supabase
        .from('whatsapp_sessions')
        .select('id, user_id, session_name, status, phone_number')
        .in('status', ['active', 'connected'])
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        this.handleError(error, 'ChatService.getActiveSession')
      }

      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      this.handleError(error, 'ChatService.getActiveSession')
    }
  }

  /**
   * Send message with full workflow
   * Handles contact creation, message sending, and conversation updates
   */
  async sendMessageWithWorkflow(params: SendMessageParams) {
    try {
      this.log('ChatService', 'Sending message with workflow', {
        conversationId: params.conversationId,
      })

      // Send message
      const result = await this.messages.sendMessage(params)

      // Mark messages as read
      await this.messages.markMessagesAsRead(params.conversationId)

      // Update conversation read status
      await this.conversations.markAsRead(params.conversationId)

      return result
    } catch (error) {
      this.handleError(error, 'ChatService.sendMessageWithWorkflow')
    }
  }

  /**
   * Get full conversation data
   * Includes conversation, messages, contact, and metadata
   */
  async getFullConversation(conversationId: string) {
    try {
      this.log('ChatService', 'Getting full conversation', { conversationId })

      // Get conversation
      const conversation = await this.conversations.getConversationById(conversationId)

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Get messages
      const messages = await this.messages.getMessages(conversationId)

      // Get contact details
      const contact = await this.contacts.getContactById(conversation.contact_id)

      // Get message stats
      const messageStats = await this.messages.getMessageStats(conversationId)

      return {
        conversation,
        messages,
        contact,
        stats: messageStats,
      }
    } catch (error) {
      this.handleError(error, 'ChatService.getFullConversation')
    }
  }

  /**
   * Update contact with conversation context
   */
  async updateContactInConversation(
    conversationId: string,
    name: string,
    metadata?: ContactMetadata
  ) {
    try {
      this.log('ChatService', 'Updating contact in conversation', { conversationId })

      // Get conversation to get contact_id
      const conversation = await this.conversations.getConversationById(conversationId)

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Update contact
      const updatedContact = await this.contacts.updateContact(
        conversation.contact_id,
        name,
        metadata
      )

      return updatedContact
    } catch (error) {
      this.handleError(error, 'ChatService.updateContactInConversation')
    }
  }

  /**
   * Search across conversations and messages
   */
  async globalSearch(query: string, userId: string, role: UserRole) {
    try {
      this.log('ChatService', 'Global search', { query, userId, role })

      // Search conversations
      const conversations = await this.conversations.getConversations(userId, role, {
        searchQuery: query,
      })

      // Search contacts
      const contacts = await this.contacts.searchContacts(query)

      return {
        conversations,
        contacts,
      }
    } catch (error) {
      this.handleError(error, 'ChatService.globalSearch')
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(userId: string, role: UserRole) {
    try {
      this.log('ChatService', 'Getting dashboard stats', { userId, role })

      const stats = await this.conversations.getConversationStats(userId, role)

      return stats
    } catch (error) {
      this.handleError(error, 'ChatService.getDashboardStats')
    }
  }

  /**
   * Bulk operations
   */
  async bulkMarkAsRead(conversationIds: string[]) {
    try {
      this.log('ChatService', 'Bulk mark as read', { count: conversationIds.length })

      const promises = conversationIds.map(id => 
        this.conversations.markAsRead(id)
      )

      await Promise.all(promises)

      return true
    } catch (error) {
      this.handleError(error, 'ChatService.bulkMarkAsRead')
    }
  }

  async bulkAssign(conversationIds: string[], agentId: string) {
    try {
      this.log('ChatService', 'Bulk assign', { count: conversationIds.length, agentId })

      const promises = conversationIds.map(id => 
        this.conversations.assignConversation(id, agentId)
      )

      await Promise.all(promises)

      return true
    } catch (error) {
      this.handleError(error, 'ChatService.bulkAssign')
    }
  }
  /**
   * Notes operations
   */
  async getNotes(conversationId: string) {
    try {
      this.log('ChatService', 'Getting notes', { conversationId })

      const { data, error } = await this.supabase
        .from('conversation_notes')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'ChatService.getNotes')
      }

      // Fetch user data separately for each note
      if (data && data.length > 0) {
        const notesWithUsers = await Promise.all(
          data.map(async (note) => {
            if (note.created_by) {
              const { data: userData } = await this.supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', note.created_by)
                .single()
              
              return {
                ...note,
                created_by_user: userData
              }
            }
            return note
          })
        )
        return notesWithUsers
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'ChatService.getNotes')
    }
  }

  async saveNote(conversationId: string, content: string, rating: number | null, userId: string, noteType?: 'internal' | 'review') {
    try {
      this.log('ChatService', 'Saving note', { conversationId, noteType })

      // Validate
      if (!content || content.trim().length === 0) {
        throw new Error('Note content cannot be empty')
      }
      if (content.length > 1000) {
        throw new Error('Note content exceeds 1000 characters limit')
      }
      if (rating !== null && (rating < 0 || rating > 10)) {
        throw new Error('Rating must be between 0 and 10')
      }

      // Determine note_type if not provided
      let finalNoteType = noteType
      if (!finalNoteType) {
        // Auto-detect: if has rating, it's a review, otherwise internal
        finalNoteType = (rating && rating > 0) ? 'review' : 'internal'
      }

      // @ts-ignore - Supabase type issue
      const { data, error } = await this.supabase
        .from('conversation_notes')
        // @ts-ignore - Supabase type issue
        .insert({
          conversation_id: conversationId,
          content: content.trim(),
          rating,
          created_by: userId,
          note_type: finalNoteType,
          is_visible_to_customer: finalNoteType === 'review',
          tenant_id: this.defaultTenantId,
        })
        .select()
        .single()

      if (error) {
        this.handleError(error, 'ChatService.saveNote')
      }

      return data
    } catch (error) {
      this.handleError(error, 'ChatService.saveNote')
    }
  }

  /**
   * Labels operations
   */
  async getConversationLabels(conversationId: string) {
    try {
      this.log('ChatService', 'Getting conversation labels', { conversationId })

      const { data, error } = await this.supabase
        .from('conversation_labels')
        .select(`
          *,
          label:labels(*)
        `)
        .eq('conversation_id', conversationId)

      if (error) {
        this.handleError(error, 'ChatService.getConversationLabels')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'ChatService.getConversationLabels')
    }
  }

  async getAllLabels() {
    try {
      this.log('ChatService', 'Getting all labels')

      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw new Error('No user found')
      }

      // Get user profile to check role
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Try to get all labels
      const { data, error } = await this.supabase
        .from('labels')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        // Fallback for agents
        if (profile?.role === 'agent') {
          return await this.getOrCreateDefaultLabels(user.id)
        }
        this.handleError(error, 'ChatService.getAllLabels')
      }

      if (!data || data.length === 0) {
        return await this.getOrCreateDefaultLabels(user.id)
      }

      // Remove duplicates by name
      const uniqueLabels = data.reduce((acc: any[], label: any) => {
        if (!acc.find(l => l.name === label.name)) {
          acc.push(label)
        }
        return acc
      }, [])

      return uniqueLabels
    } catch (error) {
      this.handleError(error, 'ChatService.getAllLabels')
    }
  }

  async getOrCreateDefaultLabels(userId: string) {
    try {
      // Check if user has labels
      const { data: existingLabels } = await this.supabase
        .from('labels')
        .select('*')
        .eq('user_id', userId)

      if (existingLabels && existingLabels.length > 0) {
        return existingLabels
      }

      // Create default labels
      const defaultLabels = [
        { name: 'Important', color: '#EF4444' },
        { name: 'Follow-up', color: '#F59E0B' },
        { name: 'Resolved', color: '#10B981' },
        { name: 'Pending', color: '#3B82F6' },
        { name: 'Not Important', color: '#6B7280' },
      ]

      const { data, error } = await this.supabase
        .from('labels')
        .insert(
          defaultLabels.map((label) => ({
            user_id: userId,
            name: label.name,
            color: label.color,
          }))
        )
        .select()

      if (error) {
        this.handleError(error, 'ChatService.getOrCreateDefaultLabels')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'ChatService.getOrCreateDefaultLabels')
    }
  }

  async applyLabel(conversationId: string, labelId: string, userId: string) {
    try {
      this.log('ChatService', 'Applying label', { conversationId, labelId })

      // Check if conversation already has 5 labels
      const { data: existingLabels } = await this.supabase
        .from('conversation_labels')
        .select('id')
        .eq('conversation_id', conversationId)

      if (existingLabels && existingLabels.length >= 5) {
        throw new Error('Maximum 5 labels per conversation')
      }

      // Check if label is already applied
      const { data: existing } = await this.supabase
        .from('conversation_labels')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('label_id', labelId)
        .single()

      if (existing) {
        throw new Error('Label already applied to this conversation')
      }

      // Apply label
      const { data, error } = await this.supabase
        .from('conversation_labels')
        .insert({
          conversation_id: conversationId,
          label_id: labelId,
          created_by: userId,
          tenant_id: this.defaultTenantId,
        })
        .select(`
          *,
          label:labels(*)
        `)
        .single()

      if (error) {
        this.handleError(error, 'ChatService.applyLabel')
      }

      return data
    } catch (error) {
      this.handleError(error, 'ChatService.applyLabel')
    }
  }

  async removeLabel(conversationId: string, labelId: string) {
    try {
      this.log('ChatService', 'Removing label', { conversationId, labelId })

      const { error } = await this.supabase
        .from('conversation_labels')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('label_id', labelId)

      if (error) {
        this.handleError(error, 'ChatService.removeLabel')
      }

      return true
    } catch (error) {
      this.handleError(error, 'ChatService.removeLabel')
    }
  }

  /**
   * Quick Replies operations
   * All users can view and use all quick replies (no user filtering)
   * Only owner can manage (create/update/delete) via /quick-replies page
   */
  async getAllQuickReplies() {
    try {
      // Load ALL quick replies from database (no filtering by user)
      // All users can use all quick replies
      const { data: allReplies, error } = await this.supabase
        .from('quick_replies')
        .select('*')
        .order('title')

      if (error) {
        this.handleError(error, 'ChatService.getAllQuickReplies')
        return []
      }

      return allReplies || []
    } catch (error) {
      this.handleError(error, 'ChatService.getAllQuickReplies')
      return []
    }
  }
}

// Export singleton instance
export const chatService = new ChatService()
