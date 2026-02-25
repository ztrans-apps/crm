/**
 * WhatsApp Service
 * High-level service for WhatsApp operations
 */

import type {
  WhatsAppProvider,
  MessageResponse,
  MediaPayload,
  TemplatePayload,
  InteractivePayload,
} from '../providers/base-provider'
import { createMetaCloudAPIProvider } from '../providers/meta-cloud-api'
import { createClient } from '@/lib/supabase/server'

export class WhatsAppService {
  private provider: WhatsAppProvider

  constructor(provider?: WhatsAppProvider) {
    if (provider) {
      this.provider = provider
    } else {
      // Default to Meta Cloud API
      this.provider = createMetaCloudAPIProvider({
        apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
        apiToken: process.env.WHATSAPP_API_TOKEN || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      })
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(
    tenantId: string,
    to: string,
    message: string,
    conversationId?: string
  ): Promise<MessageResponse> {
    const startTime = Date.now()

    try {
      // Send message via provider
      const response = await this.provider.sendTextMessage(to, message)

      // Log to database
      if (response.success && response.messageId) {
        await this.logMessage({
          tenantId,
          conversationId,
          messageId: response.messageId,
          to,
          type: 'text',
          content: message,
          status: 'sent',
          provider: this.provider.getProviderName(),
          sentAt: new Date(),
        })
      }

      // Log metrics
      console.log('[WhatsApp Service] Send text message', {
        success: response.success,
        to,
        messageId: response.messageId,
        duration: Date.now() - startTime,
      })

      return response
    } catch (error: any) {
      console.error('[WhatsApp Service] Error sending text message:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Send media message
   */
  async sendMediaMessage(
    tenantId: string,
    to: string,
    media: MediaPayload,
    conversationId?: string
  ): Promise<MessageResponse> {
    const startTime = Date.now()

    try {
      const response = await this.provider.sendMediaMessage(to, media)

      if (response.success && response.messageId) {
        await this.logMessage({
          tenantId,
          conversationId,
          messageId: response.messageId,
          to,
          type: media.type,
          content: media.caption || media.url || media.id || '',
          status: 'sent',
          provider: this.provider.getProviderName(),
          sentAt: new Date(),
        })
      }

      console.log('[WhatsApp Service] Send media message', {
        success: response.success,
        to,
        type: media.type,
        messageId: response.messageId,
        duration: Date.now() - startTime,
      })

      return response
    } catch (error: any) {
      console.error('[WhatsApp Service] Error sending media message:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(
    tenantId: string,
    to: string,
    template: TemplatePayload,
    conversationId?: string
  ): Promise<MessageResponse> {
    const startTime = Date.now()

    try {
      const response = await this.provider.sendTemplateMessage(to, template)

      if (response.success && response.messageId) {
        await this.logMessage({
          tenantId,
          conversationId,
          messageId: response.messageId,
          to,
          type: 'template',
          content: template.name,
          status: 'sent',
          provider: this.provider.getProviderName(),
          sentAt: new Date(),
        })
      }

      console.log('[WhatsApp Service] Send template message', {
        success: response.success,
        to,
        template: template.name,
        messageId: response.messageId,
        duration: Date.now() - startTime,
      })

      return response
    } catch (error: any) {
      console.error('[WhatsApp Service] Error sending template message:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Send interactive message
   */
  async sendInteractiveMessage(
    tenantId: string,
    to: string,
    interactive: InteractivePayload,
    conversationId?: string
  ): Promise<MessageResponse> {
    const startTime = Date.now()

    try {
      const response = await this.provider.sendInteractiveMessage(to, interactive)

      if (response.success && response.messageId) {
        await this.logMessage({
          tenantId,
          conversationId,
          messageId: response.messageId,
          to,
          type: 'interactive',
          content: interactive.body.text,
          status: 'sent',
          provider: this.provider.getProviderName(),
          sentAt: new Date(),
        })
      }

      console.log('[WhatsApp Service] Send interactive message', {
        success: response.success,
        to,
        type: interactive.type,
        messageId: response.messageId,
        duration: Date.now() - startTime,
      })

      return response
    } catch (error: any) {
      console.error('[WhatsApp Service] Error sending interactive message:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Get media URL
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    return this.provider.getMediaUrl(mediaId)
  }

  /**
   * Upload media
   */
  async uploadMedia(file: Buffer, mimeType: string): Promise<string> {
    return this.provider.uploadMedia(file, mimeType)
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    return this.provider.markAsRead(messageId)
  }

  /**
   * Log message to database
   */
  private async logMessage(data: {
    tenantId: string
    conversationId?: string
    messageId: string
    to: string
    type: string
    content: string
    status: string
    provider: string
    sentAt: Date
  }): Promise<void> {
    try {
      const supabase = createClient()

      await supabase.from('whatsapp_messages').insert({
        tenant_id: data.tenantId,
        conversation_id: data.conversationId,
        message_id: data.messageId,
        phone_number: data.to,
        message_type: data.type,
        content: data.content,
        status: data.status,
        provider: data.provider,
        sent_at: data.sentAt.toISOString(),
      })
    } catch (error) {
      console.error('[WhatsApp Service] Error logging message:', error)
      // Don't throw, just log the error
    }
  }
}

/**
 * Create WhatsApp Service instance
 */
export function createWhatsAppService(provider?: WhatsAppProvider): WhatsAppService {
  return new WhatsAppService(provider)
}
