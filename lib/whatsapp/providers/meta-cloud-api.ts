/**
 * Meta Cloud API Provider
 * Implementation for WhatsApp Business Cloud API from Meta
 * 
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import axios, { AxiosInstance } from 'axios'
import type {
  WhatsAppProvider,
  MessageResponse,
  MediaPayload,
  TemplatePayload,
  InteractivePayload,
  ProviderConfig,
} from './base-provider'

export class MetaCloudAPIProvider implements WhatsAppProvider {
  private client: AxiosInstance
  private phoneNumberId: string
  private businessAccountId: string

  constructor(config: ProviderConfig) {
    this.phoneNumberId = config.phoneNumberId
    this.businessAccountId = config.businessAccountId || ''

    this.client = axios.create({
      baseURL: config.apiUrl || 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })
  }

  getProviderName(): string {
    return 'meta-cloud-api'
  }

  /**
   * Send text message
   */
  async sendTextMessage(to: string, message: string): Promise<MessageResponse> {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'text',
        text: {
          preview_url: true,
          body: message,
        },
      })

      return {
        success: true,
        messageId: response.data.messages[0].id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  /**
   * Send media message
   */
  async sendMediaMessage(to: string, media: MediaPayload): Promise<MessageResponse> {
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: media.type,
      }

      // Build media object based on type
      payload[media.type] = media.id
        ? { id: media.id }
        : { link: media.url }

      // Add caption if provided
      if (media.caption) {
        payload[media.type].caption = media.caption
      }

      // Add filename for documents
      if (media.type === 'document' && media.filename) {
        payload[media.type].filename = media.filename
      }

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, payload)

      return {
        success: true,
        messageId: response.data.messages[0].id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(to: string, template: TemplatePayload): Promise<MessageResponse> {
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: template.language,
          },
        },
      }

      // Add components if provided
      if (template.components && template.components.length > 0) {
        payload.template.components = template.components
      }

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, payload)

      return {
        success: true,
        messageId: response.data.messages[0].id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  /**
   * Send interactive message
   */
  async sendInteractiveMessage(
    to: string,
    interactive: InteractivePayload
  ): Promise<MessageResponse> {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'interactive',
        interactive,
      })

      return {
        success: true,
        messageId: response.data.messages[0].id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  /**
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const response = await this.client.get(`/${mediaId}`)
      return response.data.url
    } catch (error: any) {
      console.error('[Meta Cloud API] Error getting media URL:', error)
      throw new Error(`Failed to get media URL: ${error.message}`)
    }
  }

  /**
   * Upload media and get media ID
   */
  async uploadMedia(file: Buffer, mimeType: string): Promise<string> {
    try {
      const FormData = require('form-data')
      const form = new FormData()
      
      form.append('messaging_product', 'whatsapp')
      form.append('file', file, {
        contentType: mimeType,
        filename: `upload_${Date.now()}`,
      })

      const response = await this.client.post(`/${this.phoneNumberId}/media`, form, {
        headers: {
          ...form.getHeaders(),
        },
      })

      return response.data.id
    } catch (error: any) {
      console.error('[Meta Cloud API] Error uploading media:', error)
      throw new Error(`Failed to upload media: ${error.message}`)
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      })

      return true
    } catch (error: any) {
      console.error('[Meta Cloud API] Error marking message as read:', error)
      return false
    }
  }

  /**
   * Format phone number for WhatsApp
   * Remove + and any non-digit characters
   */
  private formatPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): MessageResponse {
    console.error('[Meta Cloud API] Error:', error.response?.data || error.message)

    const errorData = error.response?.data?.error
    
    return {
      success: false,
      error: errorData?.message || error.message || 'Unknown error',
      errorCode: errorData?.code?.toString() || 'UNKNOWN',
    }
  }
}

/**
 * Create Meta Cloud API Provider instance
 */
export function createMetaCloudAPIProvider(config: ProviderConfig): WhatsAppProvider {
  return new MetaCloudAPIProvider(config)
}
