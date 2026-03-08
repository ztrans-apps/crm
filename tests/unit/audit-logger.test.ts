import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuditLogger, AuditLogInput } from '@/lib/security/audit-logger'

describe('AuditLogger', () => {
  let auditLogger: AuditLogger
  let mockSupabase: any

  beforeEach(() => {
    // Mock Supabase client with proper chaining
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn().mockReturnValue(mockQuery),
      }),
    }

    auditLogger = new AuditLogger(mockSupabase)
  })

  describe('logAction', () => {
    it('should log an action successfully', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'login',
        resource_type: 'auth',
        resource_id: null,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      await auditLogger.logAction(logInput)

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs')
      expect(mockInsert).toHaveBeenCalledWith({
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'login',
        resource_type: 'auth',
        resource_id: null,
        changes: {},
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      })
    })

    it('should log data modification with changes', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'update_contact',
        resource_type: 'contact',
        resource_id: 'contact-789',
        changes: {
          name: { old: 'John Doe', new: 'Jane Doe' },
          email: { old: 'john@example.com', new: 'jane@example.com' },
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      await auditLogger.logAction(logInput)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update_contact',
          resource_type: 'contact',
          resource_id: 'contact-789',
          changes: {
            name: { old: 'John Doe', new: 'Jane Doe' },
            email: { old: 'john@example.com', new: 'jane@example.com' },
          },
        })
      )
    })

    it('should sanitize sensitive data in changes', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'update_user',
        resource_type: 'user',
        resource_id: 'user-789',
        changes: {
          email: { old: 'old@example.com', new: 'new@example.com' },
          password: { old: 'oldpassword123', new: 'newpassword456' },
          api_key: { old: 'sk_live_old123', new: 'sk_live_new456' },
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      await auditLogger.logAction(logInput)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.changes.email).toEqual({
        old: 'old@example.com',
        new: 'new@example.com',
      })
      expect(insertCall.changes.password).toEqual({
        old: '[REDACTED]',
        new: '[REDACTED]',
      })
      expect(insertCall.changes.api_key).toEqual({
        old: '[REDACTED]',
        new: '[REDACTED]',
      })
    })

    it('should not throw on database error', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'login',
        resource_type: 'auth',
      }

      const mockInsert = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Database error' } })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      // Should not throw
      await expect(auditLogger.logAction(logInput)).resolves.toBeUndefined()
    })

    it('should handle system actions with null user_id', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: null,
        action: 'system_cleanup',
        resource_type: 'system',
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      await auditLogger.logAction(logInput)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          action: 'system_cleanup',
        })
      )
    })
  })

  describe('queryLogs', () => {
    it('should query logs with tenant filter', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          action: 'login',
          resource_type: 'auth',
          resource_id: null,
          changes: {},
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      })

      const logs = await auditLogger.queryLogs({ tenantId: 'tenant-123' })

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs')
      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123')
      expect(logs).toEqual(mockLogs)
    })

    it('should query logs with multiple filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          action: 'login',
          resource_type: 'auth',
          resource_id: null,
          changes: {},
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      })

      const logs = await auditLogger.queryLogs({
        tenantId: 'tenant-123',
        userId: 'user-456',
        action: 'login',
        resourceType: 'auth',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 50,
        offset: 0,
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-456')
      expect(mockQuery.eq).toHaveBeenCalledWith('action', 'login')
      expect(mockQuery.eq).toHaveBeenCalledWith('resource_type', 'auth')
      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2024-01-31')
      expect(mockQuery.range).toHaveBeenCalledWith(0, 49)
      expect(logs).toEqual(mockLogs)
    })

    it('should apply default pagination', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      })

      await auditLogger.queryLogs({ tenantId: 'tenant-123' })

      expect(mockQuery.range).toHaveBeenCalledWith(0, 99) // Default limit 100
    })

    it('should throw on database error', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      })

      await expect(
        auditLogger.queryLogs({ tenantId: 'tenant-123' })
      ).rejects.toThrow('Failed to query audit logs')
    })
  })

  describe('exportLogs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'login',
        resource_type: 'auth',
        resource_id: null,
        changes: {},
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'log-2',
        tenant_id: 'tenant-123',
        user_id: 'user-789',
        action: 'create_contact',
        resource_type: 'contact',
        resource_id: 'contact-123',
        changes: { name: { old: null, new: 'John Doe' } },
        ip_address: '192.168.1.2',
        user_agent: 'Chrome/120.0',
        created_at: '2024-01-02T00:00:00Z',
      },
    ]

    beforeEach(() => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      })
    })

    it('should export logs as JSON', async () => {
      const result = await auditLogger.exportLogs(
        'tenant-123',
        '2024-01-01',
        '2024-01-31',
        'json'
      )

      expect(result).toBe(JSON.stringify(mockLogs, null, 2))
    })

    it('should export logs as CSV', async () => {
      const result = await auditLogger.exportLogs(
        'tenant-123',
        '2024-01-01',
        '2024-01-31',
        'csv'
      )

      expect(result).toContain('id,tenant_id,user_id,action,resource_type')
      expect(result).toContain('log-1,tenant-123,user-456,login,auth')
      expect(result).toContain('log-2,tenant-123,user-789,create_contact,contact')
    })

    it('should escape CSV values with special characters', async () => {
      const logsWithSpecialChars = [
        {
          id: 'log-1',
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          action: 'update',
          resource_type: 'contact',
          resource_id: 'contact-123',
          changes: { note: { old: 'Hello, World', new: 'Hello "World"' } },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi
          .fn()
          .mockResolvedValue({ data: logsWithSpecialChars, error: null }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      })

      const result = await auditLogger.exportLogs(
        'tenant-123',
        '2024-01-01',
        '2024-01-31',
        'csv'
      )

      // CSV should escape quotes by doubling them and wrap in quotes
      expect(result).toContain('"{""note"":{""old"":""Hello, World""')
    })

    it('should default to JSON format', async () => {
      const result = await auditLogger.exportLogs(
        'tenant-123',
        '2024-01-01',
        '2024-01-31'
      )

      expect(result).toBe(JSON.stringify(mockLogs, null, 2))
    })

    it('should throw on unsupported format', async () => {
      await expect(
        auditLogger.exportLogs(
          'tenant-123',
          '2024-01-01',
          '2024-01-31',
          'xml' as any
        )
      ).rejects.toThrow('Unsupported export format: xml')
    })

    it('should handle empty logs', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      })

      const jsonResult = await auditLogger.exportLogs(
        'tenant-123',
        '2024-01-01',
        '2024-01-31',
        'json'
      )
      expect(jsonResult).toBe('[]')

      const csvResult = await auditLogger.exportLogs(
        'tenant-123',
        '2024-01-01',
        '2024-01-31',
        'csv'
      )
      expect(csvResult).toBe('')
    })
  })

  describe('sensitive data sanitization', () => {
    it('should redact password fields', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'update_password',
        resource_type: 'user',
        changes: {
          password_hash: { old: 'hash1', new: 'hash2' },
        },
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      await auditLogger.logAction(logInput)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.changes.password_hash).toEqual({
        old: '[REDACTED]',
        new: '[REDACTED]',
      })
    })

    it('should redact token fields', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'refresh_token',
        resource_type: 'auth',
        changes: {
          access_token: { old: 'token1', new: 'token2' },
          refresh_token: { old: 'refresh1', new: 'refresh2' },
        },
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      await auditLogger.logAction(logInput)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.changes.access_token).toEqual({
        old: '[REDACTED]',
        new: '[REDACTED]',
      })
      expect(insertCall.changes.refresh_token).toEqual({
        old: '[REDACTED]',
        new: '[REDACTED]',
      })
    })

    it('should redact encryption key fields', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'rotate_key',
        resource_type: 'encryption',
        changes: {
          encryption_key: { old: 'key1', new: 'key2' },
          private_key: { old: 'private1', new: 'private2' },
        },
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      await auditLogger.logAction(logInput)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.changes.encryption_key).toEqual({
        old: '[REDACTED]',
        new: '[REDACTED]',
      })
      expect(insertCall.changes.private_key).toEqual({
        old: '[REDACTED]',
        new: '[REDACTED]',
      })
    })

    it('should not redact non-sensitive fields', async () => {
      const logInput: AuditLogInput = {
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        action: 'update_contact',
        resource_type: 'contact',
        changes: {
          name: { old: 'John', new: 'Jane' },
          email: { old: 'john@example.com', new: 'jane@example.com' },
          phone: { old: '+1234567890', new: '+0987654321' },
        },
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      await auditLogger.logAction(logInput)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.changes.name).toEqual({ old: 'John', new: 'Jane' })
      expect(insertCall.changes.email).toEqual({
        old: 'john@example.com',
        new: 'jane@example.com',
      })
      expect(insertCall.changes.phone).toEqual({
        old: '+1234567890',
        new: '+0987654321',
      })
    })
  })
})
