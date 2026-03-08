import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Data Export Service
 * 
 * Implements GDPR Article 20 - Right to Data Portability
 * 
 * **Requirement 38.1**: Users can export all their data in JSON format
 * 
 * Exports include:
 * - User profile data
 * - Contacts
 * - Messages
 * - Broadcasts
 * - Settings and preferences
 * - Metadata (created_at, updated_at)
 */

export interface UserDataExport {
  user: {
    id: string
    email: string
    created_at: string
    updated_at: string
  }
  contacts: Array<{
    id: string
    name: string
    phone_number: string
    email: string | null
    notes: string | null
    tags: string[]
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
  }>
  messages: Array<{
    id: string
    conversation_id: string
    content: string
    direction: string
    status: string
    media_url: string | null
    media_type: string | null
    created_at: string
  }>
  broadcasts: Array<{
    id: string
    name: string
    message_template: string
    status: string
    scheduled_at: string | null
    sent_count: number
    delivered_count: number
    failed_count: number
    created_at: string
  }>
  settings: Record<string, unknown>
  export_metadata: {
    exported_at: string
    export_version: string
    tenant_id: string
  }
}

export class DataExportService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Export all user data in JSON format
   * 
   * @param userId - User ID to export data for
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Complete user data export
   */
  async exportUserData(userId: string, tenantId: string): Promise<UserDataExport> {
    // Fetch user profile
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id, email, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`)
    }

    // Fetch contacts
    const { data: contacts, error: contactsError } = await this.supabase
      .from('contacts')
      .select('id, name, phone_number, email, notes, tags, metadata, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`)
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await this.supabase
      .from('messages')
      .select('id, conversation_id, content, direction, status, media_url, media_type, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`)
    }

    // Fetch broadcasts
    const { data: broadcasts, error: broadcastsError } = await this.supabase
      .from('broadcasts')
      .select('id, name, message_template, status, scheduled_at, sent_count, delivered_count, failed_count, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (broadcastsError) {
      throw new Error(`Failed to fetch broadcasts: ${broadcastsError.message}`)
    }

    // Fetch settings (if settings table exists)
    let settings: Record<string, unknown> = {}
    try {
      const { data: settingsData } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single()

      if (settingsData) {
        settings = settingsData
      }
    } catch (error) {
      // Settings table might not exist, ignore error
    }

    // Build export
    const exportData: UserDataExport = {
      user,
      contacts: contacts || [],
      messages: messages || [],
      broadcasts: broadcasts || [],
      settings,
      export_metadata: {
        exported_at: new Date().toISOString(),
        export_version: '1.0',
        tenant_id: tenantId,
      },
    }

    return exportData
  }

  /**
   * Export user data as JSON string
   * 
   * @param userId - User ID to export data for
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns JSON string of user data
   */
  async exportUserDataAsJSON(userId: string, tenantId: string): Promise<string> {
    const data = await this.exportUserData(userId, tenantId)
    return JSON.stringify(data, null, 2)
  }

  /**
   * Export user data as downloadable file
   * 
   * @param userId - User ID to export data for
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Buffer containing JSON data
   */
  async exportUserDataAsFile(userId: string, tenantId: string): Promise<Buffer> {
    const json = await this.exportUserDataAsJSON(userId, tenantId)
    return Buffer.from(json, 'utf-8')
  }
}
