// Message service - handles message business logic
import { BaseService } from './base.service'
import type { MediaAttachment } from '@/lib/types/chat'

export interface SendMessageParams {
  sessionId: string
  whatsappNumber: string
  content: string
  conversationId: string
  userId: string
  media?: MediaAttachment
}

export class MessageService extends BaseService {
  private serviceUrl: string

  constructor() {
    super()
    // Use Next.js API route as proxy to WhatsApp service
    this.serviceUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(conversationId: string, limit: number = 20, offset: number = 0) {
    try {
      this.log('MessageService', 'Getting messages', { conversationId, limit, offset })

      // First get conversation to get contact info
      const { data: conversation } = await this.supabase
        .from('conversations')
        .select('contact:contacts(*)')
        .eq('id', conversationId)
        .single()

      // Then get messages with sender info and quoted message (ordered DESC for pagination, then reverse)
      // @ts-ignore - Supabase type issue
      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sent_by_user:profiles(id, full_name, email, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        this.handleError(error, 'MessageService.getMessages')
      }

      console.log('📋 getMessages result:', {
        conversationId,
        totalMessages: data?.length || 0,
        sampleMessage: data?.[0] ? {
          id: data[0].id,
          sender_id: data[0].sender_id,
          sent_by_user: data[0].sent_by_user,
          has_sent_by_user: !!data[0].sent_by_user
        } : null
      })

      // Reverse to show oldest first (for chat display)
      const reversedData = (data || []).reverse()

      // Fetch quoted messages if any
      const messagesWithQuoted = await Promise.all(
        reversedData.map(async (msg) => {
          let quotedMessage = null
          
          if (msg.quoted_message_id) {
            // Find quoted message by whatsapp_message_id
            const { data: quoted } = await this.supabase
              .from('messages')
              .select(`
                id,
                content,
                sender_type,
                is_from_me,
                sent_by_user:profiles(full_name)
              `)
              .eq('whatsapp_message_id', msg.quoted_message_id)
              .eq('conversation_id', conversationId)
              .single()
            
            if (quoted) {
              quotedMessage = {
                ...quoted,
                contact: conversation?.contact || null
              }
            }
          }

          return {
            ...msg,
            contact: conversation?.contact || null,
            quoted_message: quotedMessage
          }
        })
      )

      return messagesWithQuoted
    } catch (error) {
      this.handleError(error, 'MessageService.getMessages')
    }
  }

  /**
   * Get single message with relations (for realtime updates)
   */
  async getMessage(messageId: string): Promise<any> {
    try {
      this.log('MessageService', 'Getting single message', { messageId })

      // Get message with sender info
      // @ts-ignore - Supabase type issue
      const { data: message, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sent_by_user:profiles(id, full_name, email, avatar_url)
        `)
        .eq('id', messageId)
        .single()

      if (error) {
        this.handleError(error, 'MessageService.getMessage')
        return null
      }

      console.log('🔍 getMessage result:', {
        messageId,
        sender_id: message?.sender_id,
        sent_by_user: message?.sent_by_user,
        has_sent_by_user: !!message?.sent_by_user
      })

      // Get conversation to get contact info
      const { data: conversation } = await this.supabase
        .from('conversations')
        .select('contact:contacts(*)')
        .eq('id', message.conversation_id)
        .single()

      // Fetch quoted message if any
      let quotedMessage = null
      if (message.quoted_message_id) {
        const { data: quoted } = await this.supabase
          .from('messages')
          .select(`
            id,
            content,
            sender_type,
            is_from_me,
            sent_by_user:profiles(full_name)
          `)
          .eq('whatsapp_message_id', message.quoted_message_id)
          .eq('conversation_id', message.conversation_id)
          .single()
        
        if (quoted) {
          quotedMessage = {
            ...quoted,
            contact: conversation?.contact || null
          }
        }
      }

      // Add contact info and quoted message to message
      return {
        ...message,
        contact: conversation?.contact || null,
        quoted_message: quotedMessage
      }
    } catch (error) {
      this.handleError(error, 'MessageService.getMessage')
      return null
    }
  }

  /**
   * Send message via WhatsApp
   */
  async sendMessage(params: SendMessageParams) {
    try {
      this.log('MessageService', 'Sending message', {
        conversationId: params.conversationId,
        hasMedia: !!params.media,
      })

      // Validate params
      if (!params.content.trim() && !params.media) {
        throw new Error('Message content or media is required')
      }

      if (!params.sessionId) {
        throw new Error('WhatsApp session not found')
      }

      // Save message to database first
      const messageData = {
        conversation_id: params.conversationId,
        sender_type: 'agent',
        sender_id: params.userId,
        content: params.content,
        is_from_me: true,
        status: 'sent',
        created_at: new Date().toISOString(),
      }

      // @ts-ignore
      const { data: savedMessage, error: dbError } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (dbError) {
        this.handleError(dbError, 'MessageService.sendMessage.saveToDb')
      }

      // Send via WhatsApp service
      try {
        const response = await fetch(`${this.serviceUrl}/api/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: params.sessionId,
            to: params.whatsappNumber,
            message: params.content,
            conversationId: params.conversationId,
            messageId: savedMessage.id,
          }),
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to send message')
        }

        // Update message status to sent
        // @ts-ignore
        await this.supabase
          .from('messages')
          .update({
            status: 'sent',
            whatsapp_message_id: result.messageId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedMessage.id)

        // Update conversation last_message
        // @ts-ignore
        await this.supabase
          .from('conversations')
          .update({
            last_message: params.content,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.conversationId)

        return {
          success: true,
          messageId: savedMessage.id,
          whatsappMessageId: result.messageId,
        }
      } catch (whatsappError: any) {
        // Update message status to failed
        // @ts-ignore
        await this.supabase
          .from('messages')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedMessage.id)

        throw whatsappError
      }
    } catch (error) {
      this.handleError(error, 'MessageService.sendMessage')
    }
  }

  /**
   * Translate message
   */
  async translateMessage(content: string, targetLanguage: string = 'id') {
    try {
      this.log('MessageService', 'Translating message', { targetLanguage })

      // Call translation API
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content,
          targetLang: targetLanguage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Translation request failed')
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      return result.translatedText
    } catch (error: any) {
      console.error('Translation error:', error)
      // Return original text if translation fails
      return content
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string) {
    try {
      this.log('MessageService', 'Marking messages as read', { conversationId })

      // @ts-ignore
      const { error } = await this.supabase
        .from('messages')
        .update({
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId)
        .eq('is_from_me', false)
        .is('read_at', null)

      if (error) {
        this.handleError(error, 'MessageService.markMessagesAsRead')
      }

      return true
    } catch (error) {
      this.handleError(error, 'MessageService.markMessagesAsRead')
    }
  }

  /**
   * Get message statistics
   */
  async getMessageStats(conversationId: string) {
    try {
      this.log('MessageService', 'Getting message stats', { conversationId })

      const messages = await this.getMessages(conversationId)

      return {
        total: messages.length,
        incoming: messages.filter(m => !m.is_from_me).length,
        outgoing: messages.filter(m => m.is_from_me).length,
        unread: messages.filter(m => !m.is_from_me && !m.read_at).length,
        byStatus: {
          pending: messages.filter(m => m.status === 'pending').length,
          sent: messages.filter(m => m.status === 'sent').length,
          delivered: messages.filter(m => m.status === 'delivered').length,
          read: messages.filter(m => m.status === 'read').length,
          failed: messages.filter(m => m.status === 'failed').length,
        },
      }
    } catch (error) {
      this.handleError(error, 'MessageService.getMessageStats')
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string) {
    try {
      this.log('MessageService', 'Deleting message', { messageId })

      const { error } = await this.supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (error) {
        this.handleError(error, 'MessageService.deleteMessage')
      }

      return true
    } catch (error) {
      this.handleError(error, 'MessageService.deleteMessage')
    }
  }

  /**
   * Search messages
   */
  async searchMessages(conversationId: string, query: string) {
    try {
      this.log('MessageService', 'Searching messages', { conversationId, query })

      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'MessageService.searchMessages')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'MessageService.searchMessages')
    }
  }
}

// Export singleton instance
export const messageService = new MessageService()
