import { createClient } from '@supabase/supabase-js'

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  changes: Record<string, { old: unknown; new: unknown }>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogInput {
  tenant_id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id?: string | null
  changes?: Record<string, { old: unknown; new: unknown }>
  ip_address?: string | null
  user_agent?: string | null
}

export interface AuditLogFilters {
  tenantId?: string
  userId?: string
  action?: string
  resourceType?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface ExportFormat {
  format: 'json' | 'csv'
}

/**
 * AuditLogger - Immutable audit trail for compliance
 * 
 * Logs all security-relevant actions including:
 * - Authentication attempts (login, logout, password changes)
 * - Authorization failures
 * - Data modifications (create, update, delete)
 * - Permission changes
 * - API key operations
 * - Security events
 * 
 * Audit logs are immutable and tamper-evident (enforced by RLS policies)
 */
export class AuditLogger {
  private supabase

  constructor(supabaseClient?: any) {
    // Use service role client to bypass RLS for inserts
    this.supabase = supabaseClient || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Log an action to the audit trail
   * 
   * @param log - Audit log entry data
   * @returns Promise<void>
   * 
   * @example
   * await auditLogger.logAction({
   *   tenant_id: 'tenant-123',
   *   user_id: 'user-456',
   *   action: 'login',
   *   resource_type: 'auth',
   *   resource_id: null,
   *   ip_address: '192.168.1.1',
   *   user_agent: 'Mozilla/5.0...'
   * })
   */
  async logAction(log: AuditLogInput): Promise<void> {
    try {
      // Sanitize sensitive data before logging
      const sanitizedLog = this.sanitizeLogData(log)

      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          tenant_id: sanitizedLog.tenant_id,
          user_id: sanitizedLog.user_id,
          action: sanitizedLog.action,
          resource_type: sanitizedLog.resource_type,
          resource_id: sanitizedLog.resource_id || null,
          changes: sanitizedLog.changes || {},
          ip_address: sanitizedLog.ip_address || null,
          user_agent: sanitizedLog.user_agent || null,
        })

      if (error) {
        console.error('Failed to log audit action:', error)
        // Don't throw - audit logging should not break application flow
      }
    } catch (err) {
      console.error('Unexpected error logging audit action:', err)
      // Don't throw - audit logging should not break application flow
    }
  }

  /**
   * Query audit logs with filters
   * 
   * @param filters - Query filters (tenantId, userId, action, resourceType, dateRange, pagination)
   * @returns Promise<AuditLog[]>
   * 
   * @example
   * const logs = await auditLogger.queryLogs({
   *   tenantId: 'tenant-123',
   *   action: 'login',
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   limit: 100,
   *   offset: 0
   * })
   */
  async queryLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.tenantId) {
        query = query.eq('tenant_id', filters.tenantId)
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      // Apply pagination
      const limit = filters.limit || 100
      const offset = filters.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        console.error('Failed to query audit logs:', error)
        throw new Error('Failed to query audit logs')
      }

      return data || []
    } catch (err) {
      console.error('Unexpected error querying audit logs:', err)
      throw err
    }
  }

  /**
   * Export audit logs to JSON or CSV format
   * 
   * @param tenantId - Tenant ID to export logs for
   * @param startDate - Start date for export (ISO 8601 format)
   * @param endDate - End date for export (ISO 8601 format)
   * @param format - Export format ('json' or 'csv')
   * @returns Promise<string> - Exported data as string
   * 
   * @example
   * const jsonExport = await auditLogger.exportLogs(
   *   'tenant-123',
   *   '2024-01-01',
   *   '2024-01-31',
   *   'json'
   * )
   */
  async exportLogs(
    tenantId: string,
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      // Query all logs for the tenant within the date range
      const logs = await this.queryLogs({
        tenantId,
        startDate,
        endDate,
        limit: 10000, // Large limit for export
      })

      if (format === 'json') {
        return JSON.stringify(logs, null, 2)
      } else if (format === 'csv') {
        return this.convertToCSV(logs)
      } else {
        throw new Error(`Unsupported export format: ${format}`)
      }
    } catch (err) {
      console.error('Failed to export audit logs:', err)
      throw err
    }
  }

  /**
   * Sanitize log data to prevent logging sensitive information
   * 
   * @param log - Raw audit log input
   * @returns Sanitized audit log input
   */
  private sanitizeLogData(log: AuditLogInput): AuditLogInput {
    const sanitized = { ...log }

    // Sanitize changes to remove sensitive fields
    if (sanitized.changes) {
      const sensitiveFields = [
        'password',
        'password_hash',
        'token',
        'access_token',
        'refresh_token',
        'api_key',
        'secret',
        'private_key',
        'encryption_key',
      ]

      const sanitizedChanges: Record<string, { old: unknown; new: unknown }> = {}

      for (const [field, change] of Object.entries(sanitized.changes)) {
        const fieldLower = field.toLowerCase()
        const isSensitive = sensitiveFields.some(sf => fieldLower.includes(sf))

        if (isSensitive) {
          // Replace sensitive values with redacted marker
          sanitizedChanges[field] = {
            old: change.old ? '[REDACTED]' : null,
            new: change.new ? '[REDACTED]' : null,
          }
        } else {
          sanitizedChanges[field] = change
        }
      }

      sanitized.changes = sanitizedChanges
    }

    return sanitized
  }

  /**
   * Convert audit logs to CSV format
   * 
   * @param logs - Array of audit logs
   * @returns CSV string
   */
  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) {
      return ''
    }

    // CSV headers
    const headers = [
      'id',
      'tenant_id',
      'user_id',
      'action',
      'resource_type',
      'resource_id',
      'changes',
      'ip_address',
      'user_agent',
      'created_at',
    ]

    // CSV rows
    const rows = logs.map(log => [
      log.id,
      log.tenant_id,
      log.user_id || '',
      log.action,
      log.resource_type,
      log.resource_id || '',
      JSON.stringify(log.changes),
      log.ip_address || '',
      log.user_agent || '',
      log.created_at,
    ])

    // Escape CSV values
    const escapeCsvValue = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    // Build CSV string
    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(',')),
    ]

    return csvLines.join('\n')
  }
}

// Export singleton instance factory for convenience
let _auditLoggerInstance: AuditLogger | null = null

export const getAuditLogger = (): AuditLogger => {
  if (!_auditLoggerInstance) {
    _auditLoggerInstance = new AuditLogger()
  }
  return _auditLoggerInstance
}
