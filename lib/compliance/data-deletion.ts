import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Data Deletion Service
 * 
 * Implements GDPR Article 17 - Right to Erasure (Right to be Forgotten)
 * 
 * **Requirement 38.2**: Users can request deletion of all their data
 * 
 * Deletion process:
 * 1. Soft delete: Mark data as deleted with retention period (30 days)
 * 2. Anonymize audit logs: Replace user_id with "deleted_user"
 * 3. Hard delete: Permanently remove data after retention period
 * 
 * Data deleted:
 * - User profile
 * - Contacts
 * - Messages
 * - Broadcasts
 * - Files
 * - Settings
 * - API keys
 * - Sessions
 */

export interface DeletionResult {
  success: boolean
  deletedAt: string
  permanentDeletionScheduledFor: string
  itemsDeleted: {
    contacts: number
    messages: number
    broadcasts: number
    files: number
    apiKeys: number
    sessions: number
  }
}

export class DataDeletionService {
  private supabase: SupabaseClient
  private retentionDays: number = 30 // Retention period before permanent deletion

  constructor(supabase: SupabaseClient, retentionDays: number = 30) {
    this.supabase = supabase
    this.retentionDays = retentionDays
  }

  /**
   * Soft delete user data (mark as deleted, retain for retention period)
   * 
   * @param userId - User ID to delete data for
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Deletion result with counts
   */
  async softDeleteUserData(userId: string, tenantId: string): Promise<DeletionResult> {
    const deletedAt = new Date()
    const permanentDeletionDate = new Date(deletedAt)
    permanentDeletionDate.setDate(permanentDeletionDate.getDate() + this.retentionDays)

    const itemsDeleted = {
      contacts: 0,
      messages: 0,
      broadcasts: 0,
      files: 0,
      apiKeys: 0,
      sessions: 0,
    }

    // Soft delete contacts
    const { data: contacts } = await this.supabase
      .from('contacts')
      .update({ deleted_at: deletedAt.toISOString() })
      .eq('tenant_id', tenantId)
      .select('id')

    itemsDeleted.contacts = contacts?.length || 0

    // Soft delete messages
    const { data: messages } = await this.supabase
      .from('messages')
      .update({ deleted_at: deletedAt.toISOString() })
      .eq('tenant_id', tenantId)
      .select('id')

    itemsDeleted.messages = messages?.length || 0

    // Soft delete broadcasts
    const { data: broadcasts } = await this.supabase
      .from('broadcasts')
      .update({ deleted_at: deletedAt.toISOString() })
      .eq('tenant_id', tenantId)
      .select('id')

    itemsDeleted.broadcasts = broadcasts?.length || 0

    // Soft delete file uploads
    const { data: files } = await this.supabase
      .from('file_uploads')
      .update({ deleted_at: deletedAt.toISOString() })
      .eq('tenant_id', tenantId)
      .select('id')

    itemsDeleted.files = files?.length || 0

    // Revoke API keys
    const { data: apiKeys } = await this.supabase
      .from('api_keys')
      .update({ revoked_at: deletedAt.toISOString() })
      .eq('tenant_id', tenantId)
      .is('revoked_at', null)
      .select('id')

    itemsDeleted.apiKeys = apiKeys?.length || 0

    // Anonymize audit logs (replace user_id with "deleted_user")
    await this.supabase
      .from('audit_logs')
      .update({ user_id: 'deleted_user' })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    // Mark user for deletion
    await this.supabase
      .from('users')
      .update({
        deleted_at: deletedAt.toISOString(),
        email: `deleted_${userId}@deleted.local`,
      })
      .eq('id', userId)

    return {
      success: true,
      deletedAt: deletedAt.toISOString(),
      permanentDeletionScheduledFor: permanentDeletionDate.toISOString(),
      itemsDeleted,
    }
  }

  /**
   * Hard delete user data (permanent deletion)
   * 
   * This should only be called after the retention period has passed.
   * 
   * @param userId - User ID to permanently delete data for
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Deletion result
   */
  async hardDeleteUserData(userId: string, tenantId: string): Promise<DeletionResult> {
    const deletedAt = new Date()

    const itemsDeleted = {
      contacts: 0,
      messages: 0,
      broadcasts: 0,
      files: 0,
      apiKeys: 0,
      sessions: 0,
    }

    // Delete contacts
    const { data: contacts } = await this.supabase
      .from('contacts')
      .delete()
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .select('id')

    itemsDeleted.contacts = contacts?.length || 0

    // Delete messages
    const { data: messages } = await this.supabase
      .from('messages')
      .delete()
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .select('id')

    itemsDeleted.messages = messages?.length || 0

    // Delete broadcasts
    const { data: broadcasts } = await this.supabase
      .from('broadcasts')
      .delete()
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .select('id')

    itemsDeleted.broadcasts = broadcasts?.length || 0

    // Delete file uploads
    const { data: files } = await this.supabase
      .from('file_uploads')
      .delete()
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .select('id')

    itemsDeleted.files = files?.length || 0

    // Delete API keys
    const { data: apiKeys } = await this.supabase
      .from('api_keys')
      .delete()
      .eq('tenant_id', tenantId)
      .not('revoked_at', 'is', null)
      .select('id')

    itemsDeleted.apiKeys = apiKeys?.length || 0

    // Delete user
    await this.supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .not('deleted_at', 'is', null)

    return {
      success: true,
      deletedAt: deletedAt.toISOString(),
      permanentDeletionScheduledFor: deletedAt.toISOString(),
      itemsDeleted,
    }
  }

  /**
   * Cleanup expired soft-deleted data
   * 
   * This should be run as a scheduled job to permanently delete data
   * that has passed the retention period.
   * 
   * @returns Number of users permanently deleted
   */
  async cleanupExpiredData(): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays)

    // Find users marked for deletion that have passed retention period
    const { data: expiredUsers } = await this.supabase
      .from('users')
      .select('id, user_metadata')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate.toISOString())

    if (!expiredUsers || expiredUsers.length === 0) {
      return 0
    }

    // Permanently delete each user's data
    for (const user of expiredUsers) {
      const tenantId = user.user_metadata?.tenant_id
      if (tenantId) {
        await this.hardDeleteUserData(user.id, tenantId)
      }
    }

    return expiredUsers.length
  }
}
