/**
 * Meta WhatsApp Cloud API Client
 * Official WhatsApp Business Cloud API implementation
 * 
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 * 
 * Required environment variables:
 *   WHATSAPP_API_TOKEN        - Permanent access token from Meta Business
 *   WHATSAPP_PHONE_NUMBER_ID  - Phone Number ID from WhatsApp Business
 *   WHATSAPP_BUSINESS_ACCOUNT_ID - Business Account ID (optional)
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN - Token for webhook verification
 *   WHATSAPP_API_VERSION      - Graph API version (default: v21.0)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetaApiConfig {
  apiToken: string
  phoneNumberId: string
  businessAccountId?: string
  apiVersion?: string
}

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: string
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  sub_type?: 'quick_reply' | 'url' | 'phone_number'
  index?: string
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'video' | 'document' | 'payload'
  text?: string
  payload?: string
  image?: { link: string }
  video?: { link: string }
  document?: { link: string; filename?: string }
}

export interface MediaPayload {
  type: 'image' | 'video' | 'audio' | 'document'
  url?: string
  id?: string
  caption?: string
  filename?: string
}

export interface LocationPayload {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface InteractiveButton {
  type: 'reply'
  reply: { id: string; title: string }
}

export interface InteractiveListSection {
  title: string
  rows: Array<{ id: string; title: string; description?: string }>
}

// ─── Meta Cloud API Client ───────────────────────────────────────────────────

export class MetaCloudAPI {
  private baseUrl: string
  private apiToken: string
  private phoneNumberId: string
  private businessAccountId: string

  constructor(config?: Partial<MetaApiConfig>) {
    const apiVersion = config?.apiVersion || process.env.WHATSAPP_API_VERSION || 'v21.0'
    this.apiToken = config?.apiToken || process.env.WHATSAPP_API_TOKEN || ''
    this.phoneNumberId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    this.businessAccountId = config?.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || ''
    this.baseUrl = `https://graph.facebook.com/${apiVersion}`
  }

  // ─── Core request method ─────────────────────────────────────────────────

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data?.error
      console.error('[Meta Cloud API] Request failed:', {
        url,
        status: response.status,
        error: error?.message || data,
      })
      throw new MetaApiError(
        error?.message || `HTTP ${response.status}`,
        error?.code?.toString() || response.status.toString(),
        error?.error_subcode,
        response.status
      )
    }

    return data
  }

  // ─── Send Text Message ───────────────────────────────────────────────────

  async sendText(to: string, text: string): Promise<SendResult> {
    try {
      const data = await this.request(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhone(to),
          type: 'text',
          text: {
            preview_url: true,
            body: text,
          },
        }),
      })

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  // ─── Send Media Message ──────────────────────────────────────────────────

  async sendMedia(to: string, media: MediaPayload): Promise<SendResult> {
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhone(to),
        type: media.type,
      }

      // Build media object
      const mediaObj: any = media.id ? { id: media.id } : { link: media.url }
      if (media.caption) mediaObj.caption = media.caption
      if (media.type === 'document' && media.filename) mediaObj.filename = media.filename

      payload[media.type] = mediaObj

      const data = await this.request(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  // ─── Send Image (shorthand) ──────────────────────────────────────────────

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendResult> {
    return this.sendMedia(to, { type: 'image', url: imageUrl, caption })
  }

  // ─── Send Video (shorthand) ──────────────────────────────────────────────

  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<SendResult> {
    return this.sendMedia(to, { type: 'video', url: videoUrl, caption })
  }

  // ─── Send Document (shorthand) ───────────────────────────────────────────

  async sendDocument(to: string, docUrl: string, filename?: string, caption?: string): Promise<SendResult> {
    return this.sendMedia(to, { type: 'document', url: docUrl, caption, filename })
  }

  // ─── Send Audio (shorthand) ──────────────────────────────────────────────

  async sendAudio(to: string, audioUrl: string): Promise<SendResult> {
    return this.sendMedia(to, { type: 'audio', url: audioUrl })
  }

  // ─── Send Location ───────────────────────────────────────────────────────

  async sendLocation(to: string, location: LocationPayload): Promise<SendResult> {
    try {
      const data = await this.request(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhone(to),
          type: 'location',
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            name: location.name || '',
            address: location.address || '',
          },
        }),
      })

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  // ─── Send Template Message ───────────────────────────────────────────────

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: TemplateComponent[]
  ): Promise<SendResult> {
    try {
      const template: any = {
        name: templateName,
        language: { code: languageCode },
      }

      if (components && components.length > 0) {
        template.components = components
      }

      const data = await this.request(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhone(to),
          type: 'template',
          template,
        }),
      })

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  // ─── Send Interactive Buttons ────────────────────────────────────────────

  async sendButtons(
    to: string,
    bodyText: string,
    buttons: InteractiveButton[],
    headerText?: string,
    footerText?: string
  ): Promise<SendResult> {
    try {
      const interactive: any = {
        type: 'button',
        body: { text: bodyText },
        action: { buttons },
      }

      if (headerText) interactive.header = { type: 'text', text: headerText }
      if (footerText) interactive.footer = { text: footerText }

      const data = await this.request(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhone(to),
          type: 'interactive',
          interactive,
        }),
      })

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  // ─── Send Interactive List ───────────────────────────────────────────────

  async sendList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: InteractiveListSection[],
    headerText?: string,
    footerText?: string
  ): Promise<SendResult> {
    try {
      const interactive: any = {
        type: 'list',
        body: { text: bodyText },
        action: { button: buttonText, sections },
      }

      if (headerText) interactive.header = { type: 'text', text: headerText }
      if (footerText) interactive.footer = { text: footerText }

      const data = await this.request(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhone(to),
          type: 'interactive',
          interactive,
        }),
      })

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      }
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  // ─── Mark Message as Read ────────────────────────────────────────────────

  async markAsRead(messageId: string): Promise<boolean> {
    try {
      await this.request(`/${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      })
      return true
    } catch (error) {
      console.error('[Meta Cloud API] markAsRead failed:', error)
      return false
    }
  }

  // ─── Upload Media ────────────────────────────────────────────────────────

  async uploadMedia(file: Buffer | Blob, mimeType: string, filename?: string): Promise<string> {
    const formData = new FormData()
    formData.append('messaging_product', 'whatsapp')

    if (file instanceof Buffer) {
      formData.append('file', new Blob([file], { type: mimeType }), filename || `upload_${Date.now()}`)
    } else {
      formData.append('file', file, filename || `upload_${Date.now()}`)
    }

    const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: formData,
    })

    const data = await response.json() as any

    if (!response.ok) {
      throw new Error(`Upload failed: ${data?.error?.message || response.statusText}`)
    }

    return data.id
  }

  // ─── Get Media URL ───────────────────────────────────────────────────────

  async getMediaUrl(mediaId: string): Promise<string> {
    const data = await this.request(`/${mediaId}`)
    return data.url
  }

  // ─── Download Media ──────────────────────────────────────────────────────

  async downloadMedia(mediaUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    return { buffer, contentType }
  }

  // ─── Get Business Profile ────────────────────────────────────────────────

  async getBusinessProfile(): Promise<any> {
    const data = await this.request(`/${this.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`)
    return data.data?.[0]
  }

  // ─── Get Phone Number Info ───────────────────────────────────────────────

  async getPhoneNumberInfo(): Promise<any> {
    const data = await this.request(`/${this.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`)
    return data
  }

  // ─── Get Message Templates ───────────────────────────────────────────────

  async getTemplates(limit: number = 100): Promise<any[]> {
    if (!this.businessAccountId) {
      throw new Error('Business Account ID required for template operations')
    }
    const data = await this.request(`/${this.businessAccountId}/message_templates?limit=${limit}`)
    return data.data || []
  }

  // ─── Create Message Template ─────────────────────────────────────────────

  async createTemplate(template: {
    name: string
    language: string
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
    components: any[]
  }): Promise<any> {
    if (!this.businessAccountId) {
      throw new Error('Business Account ID required for template operations')
    }
    return this.request(`/${this.businessAccountId}/message_templates`, {
      method: 'POST',
      body: JSON.stringify(template),
    })
  }

  // ─── Delete Message Template ─────────────────────────────────────────────

  async deleteTemplate(templateName: string): Promise<any> {
    if (!this.businessAccountId) {
      throw new Error('Business Account ID required for template operations')
    }
    return this.request(`/${this.businessAccountId}/message_templates?name=${templateName}`, {
      method: 'DELETE',
    })
  }

  // ─── Utility Methods ─────────────────────────────────────────────────────

  /**
   * Format phone number for WhatsApp (remove +, spaces, dashes)
   */
  private formatPhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): SendResult {
    if (error instanceof MetaApiError) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      }
    }
    return {
      success: false,
      error: error?.message || 'Unknown error',
      errorCode: 'UNKNOWN',
    }
  }

  /**
   * Validate configuration
   */
  isConfigured(): boolean {
    return !!(this.apiToken && this.phoneNumberId)
  }

  /**
   * Get current configuration (safe, no token exposed)
   */
  getConfig() {
    return {
      phoneNumberId: this.phoneNumberId,
      businessAccountId: this.businessAccountId,
      baseUrl: this.baseUrl,
      configured: this.isConfigured(),
    }
  }
}

// ─── Custom Error Class ────────────────────────────────────────────────────

export class MetaApiError extends Error {
  code: string
  subcode?: number
  httpStatus: number

  constructor(message: string, code: string, subcode?: number, httpStatus: number = 500) {
    super(message)
    this.name = 'MetaApiError'
    this.code = code
    this.subcode = subcode
    this.httpStatus = httpStatus
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────

let _defaultInstance: MetaCloudAPI | null = null
const _instanceCache = new Map<string, MetaCloudAPI>()

/**
 * Get MetaCloudAPI instance using default env vars (backward compatible).
 * Use this when you don't need multi-number support.
 */
export function getMetaCloudAPI(config?: Partial<MetaApiConfig>): MetaCloudAPI {
  if (!_defaultInstance || config) {
    _defaultInstance = new MetaCloudAPI(config)
  }
  return _defaultInstance
}

/**
 * Get MetaCloudAPI instance for a specific phone number ID.
 * Used for multi-number support — each number gets its own instance.
 * Falls back to default env if phoneNumberId not provided.
 */
export function getMetaCloudAPIForPhoneNumberId(phoneNumberId: string): MetaCloudAPI {
  if (!phoneNumberId) {
    return getMetaCloudAPI()
  }

  if (_instanceCache.has(phoneNumberId)) {
    return _instanceCache.get(phoneNumberId)!
  }

  const instance = new MetaCloudAPI({ phoneNumberId })
  _instanceCache.set(phoneNumberId, instance)
  return instance
}

/**
 * Look up the Meta Phone Number ID for a session from the database,
 * and return the correct MetaCloudAPI instance.
 * Falls back to default env if session has no meta_phone_number_id.
 */
export async function getMetaCloudAPIForSession(
  sessionId: string | undefined,
  supabase: any
): Promise<MetaCloudAPI> {
  if (!sessionId) {
    return getMetaCloudAPI()
  }

  try {
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('meta_phone_number_id')
      .eq('id', sessionId)
      .single()

    if (session?.meta_phone_number_id) {
      return getMetaCloudAPIForPhoneNumberId(session.meta_phone_number_id)
    }
  } catch (e) {
    console.warn('[Meta Cloud API] Could not look up session, using default:', e)
  }

  return getMetaCloudAPI()
}

export default MetaCloudAPI
