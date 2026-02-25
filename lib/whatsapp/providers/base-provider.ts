/**
 * Base WhatsApp Provider Interface
 * Defines the contract for all WhatsApp API providers
 */

export interface MessageResponse {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: string
}

export interface MediaPayload {
  type: 'image' | 'video' | 'audio' | 'document'
  url?: string
  id?: string
  caption?: string
  filename?: string
}

export interface TemplatePayload {
  name: string
  language: string
  components?: TemplateComponent[]
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'video' | 'document'
  text?: string
  image?: { link: string }
  video?: { link: string }
  document?: { link: string; filename: string }
}

export interface InteractivePayload {
  type: 'button' | 'list'
  header?: {
    type: 'text' | 'image' | 'video' | 'document'
    text?: string
    image?: { link: string }
    video?: { link: string }
    document?: { link: string }
  }
  body: {
    text: string
  }
  footer?: {
    text: string
  }
  action: ButtonAction | ListAction
}

export interface ButtonAction {
  buttons: Array<{
    type: 'reply'
    reply: {
      id: string
      title: string
    }
  }>
}

export interface ListAction {
  button: string
  sections: Array<{
    title: string
    rows: Array<{
      id: string
      title: string
      description?: string
    }>
  }>
}

export interface WebhookMessage {
  from: string
  id: string
  timestamp: string
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts' | 'interactive'
  text?: {
    body: string
  }
  image?: {
    id: string
    mime_type: string
    sha256: string
    caption?: string
  }
  video?: {
    id: string
    mime_type: string
    sha256: string
    caption?: string
  }
  audio?: {
    id: string
    mime_type: string
    sha256: string
  }
  document?: {
    id: string
    mime_type: string
    sha256: string
    filename: string
    caption?: string
  }
  location?: {
    latitude: number
    longitude: number
    name?: string
    address?: string
  }
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: {
      id: string
      title: string
    }
    list_reply?: {
      id: string
      title: string
      description?: string
    }
  }
}

export interface WebhookStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: Array<{
    code: number
    title: string
    message: string
  }>
}

/**
 * Base WhatsApp Provider Interface
 */
export interface WhatsAppProvider {
  /**
   * Send a text message
   */
  sendTextMessage(to: string, message: string): Promise<MessageResponse>

  /**
   * Send a media message (image, video, audio, document)
   */
  sendMediaMessage(to: string, media: MediaPayload): Promise<MessageResponse>

  /**
   * Send a template message (pre-approved message)
   */
  sendTemplateMessage(to: string, template: TemplatePayload): Promise<MessageResponse>

  /**
   * Send an interactive message (buttons or list)
   */
  sendInteractiveMessage(to: string, interactive: InteractivePayload): Promise<MessageResponse>

  /**
   * Get media URL from media ID
   */
  getMediaUrl(mediaId: string): Promise<string>

  /**
   * Upload media and get media ID
   */
  uploadMedia(file: Buffer, mimeType: string): Promise<string>

  /**
   * Mark message as read
   */
  markAsRead(messageId: string): Promise<boolean>

  /**
   * Get provider name
   */
  getProviderName(): string
}

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  apiUrl: string
  apiToken: string
  phoneNumberId: string
  businessAccountId?: string
  webhookVerifyToken?: string
}

/**
 * Provider Factory
 */
export type ProviderType = 'meta' | 'twilio' | '360dialog' | 'messagebird'

export interface ProviderFactory {
  createProvider(type: ProviderType, config: ProviderConfig): WhatsAppProvider
}
