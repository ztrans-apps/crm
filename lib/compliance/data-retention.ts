import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Data Retention Service
 * 
 * Implements GDPR Article 5(1)(e) - Storage Limitation
 * 
 * **Requirement 38.6**: Automated cleanup of data that exceeds retention periods
 * 
 * Retention Policies:
 * - Messages: 2 years
 * - Audit logs: 7 years (legal requirement)
 * - Contacts: Indefinite (until user deletes or account closed)
 * - Broadcasts: 1 year after completion
 * - File uploads: 2 years
 * - Sessions: 30 days after last activity
 * - Security events: 1 year
 * - Soft-deleted data: 30 days before permanent deletion
 */

export interface RetentionPolicy {
  dataType: string
  retentionDays: number
  description: string
}

export interface CleanupResult {
  dataType: string
  itemsDeleted: number
  oldestDeletedDate: string | null
  newestDeletedDate: string | null
}

export class DataRetentionService {
  private supabase: SupabaseClient

  // Retention policies (in days)
  private readonly retentionPolicies: Record<string, number> = {
    messages: 730, // 2 years
    audit_logs: 2555, // 7 years
    broadcasts: 365, // 1 year after completion
    file_uploads: 730, // 2 years
    sessions: 30, // 30 days after last activity
    security_events: 365, // 1 year
    soft_deleted: 30, // 30 days before permanent deletion
  }

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Get all retention policies
   * 
   * @returns Array of retention policies
   */
  getRetentionPolicies(): RetentionPolicy[] {
    return [
      {
        dataType: 'messages',
        retentionDays: this.retentionPolicies.messages,
        description: 'Messages are retained for 2 years',
      },
      {
        dataType: 'audit_logs',
        retentionDays: this.retentionPolicies.audit_logs,
        description: 'Audit logs are retained for 7 years (legal requirement)',
      },
      {
        dataType: 'broadcasts',
        retentionDays: this.retentionPolicies.broadcasts,
        description: 'Completed broadcasts are retained for 1 year',
      },
      {
        dataType: 'file_uploads',
        retentionDays: this.retentionPolicies.file_uploads,
        description: 'File uploads are retained for 2 years',
      },
      {
        dataType: 'sessions',
        retentionDays: this.retentionPolicies.sessions,
        description: 'Inactive sessions are retained for 30 days',
      },
      {
        dataType: 'security_events',
        retentionDays: this.retentionPolicies.security_events,
        description: 'Security events are retained for 1 year',
      },
      {
        dataType: 'soft_deleted',
        retentionDays: this.retentionPolicies.soft_deleted,
        description: 'Soft-deleted data is retained for 30 days before permanent deletion',
      },
    ]
  }

  /**
   * Clean up expired messages
   * 
   * @returns Cleanup result
   */
  async cleanupExpiredMessages(): Promise<CleanupResult> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.messages)

    const { data, error } = await this.supabase
      .from('messages')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id, created_at')

    if (error) {
      throw new Error(`Failed to cleanup messages: ${error.message}`)
    }

    return {
      dataType: 'messages',
      itemsDeleted: data?.length || 0,
      oldestDeletedDate: data?.[0]?.created_at || null,
      newestDeletedDate: data?.[data.length - 1]?.created_at || null,
    }
  }

  /**
   * Clean up expired audit logs
   * 
   * @returns Cleanup result
   */
  async cleanupExpiredAuditLogs(): Promise<CleanupResult> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.audit_logs)

    const { data, error } = await this.supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id, created_at')

    if (error) {
      throw new Error(`Failed to cleanup audit logs: ${error.message}`)
    }

    return {
      dataType: 'audit_logs',
      itemsDeleted: data?.length || 0,
      oldestDeletedDate: data?.[0]?.created_at || null,
      newestDeletedDate: data?.[data.length - 1]?.created_at || null,
    }
  }

  /**
   * Clean up expired broadcasts
   * 
   * Only deletes broadcasts that are completed or failed.
   * 
   * @returns Cleanup result
   */
  async cleanupExpiredBroadcasts(): Promise<CleanupResult> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.broadcasts)

    const { data, error } = await this.supabase
      .from('broadcasts')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .in('status', ['completed', 'failed', 'cancelled'])
      .select('id, created_at')

    if (error) {
      throw new Error(`Failed to cleanup broadcasts: ${error.message}`)
    }

    return {
      dataType: 'broadcasts',
      itemsDeleted: data?.length || 0,
      oldestDeletedDate: data?.[0]?.created_at || null,
      newestDeletedDate: data?.[data.length - 1]?.created_at || null,
    }
  }

  /**
   * Clean up expired file uploads
   * 
   * @returns Cleanup result
   */
  async cleanupExpiredFileUploads(): Promise<CleanupResult> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.file_uploads)

    const { data, error } = await this.supabase
      .from('file_uploads')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id, created_at')

    if (error) {
      throw new Error(`Failed to cleanup file uploads: ${error.message}`)
    }

    return {
      dataType: 'file_uploads',
      itemsDeleted: data?.length || 0,
      oldestDeletedDate: data?.[0]?.created_at || null,
      newestDeletedDate: data?.[data.length - 1]?.created_at || null,
    }
  }

  /**
   * Clean up expired security events
   * 
   * @returns Cleanup result
   */
  async cleanupExpiredSecurityEvents(): Promise<CleanupResult> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.security_events)

    const { data, error } = await this.supabase
      .from('security_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id, created_at')

    if (error) {
      throw new Error(`Failed to cleanup security events: ${error.message}`)
    }

    return {
      dataType: 'security_events',
      itemsDeleted: data?.length || 0,
      oldestDeletedDate: data?.[0]?.created_at || null,
      newestDeletedDate: data?.[data.length - 1]?.created_at || null,
    }
  }

  /**
   * Run all cleanup jobs
   * 
   * This should be run as a scheduled job (e.g., daily cron job).
   * 
   * @returns Array of cleanup results
   */
  async runAllCleanupJobs(): Promise<CleanupResult[]> {
    const results: CleanupResult[] = []

    try {
      results.push(await this.cleanupExpiredMessages())
    } catch (error) {
      console.error('Failed to cleanup messages:', error)
    }

    try {
      results.push(await this.cleanupExpiredAuditLogs())
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error)
    }

    try {
      results.push(await this.cleanupExpiredBroadcasts())
    } catch (error) {
      console.error('Failed to cleanup broadcasts:', error)
    }

    try {
      results.push(await this.cleanupExpiredFileUploads())
    } catch (error) {
      console.error('Failed to cleanup file uploads:', error)
    }

    try {
      results.push(await this.cleanupExpiredSecurityEvents())
    } catch (error) {
      console.error('Failed to cleanup security events:', error)
    }

    return results
  }

  /**
   * Get retention policy for a specific data type
   * 
   * @param dataType - Data type to get policy for
   * @returns Retention policy or null if not found
   */
  getRetentionPolicy(dataType: string): RetentionPolicy | null {
    const retentionDays = this.retentionPolicies[dataType]
    if (!retentionDays) {
      return null
    }

    const policy = this.getRetentionPolicies().find(p => p.dataType === dataType)
    return policy || null
  }
}
