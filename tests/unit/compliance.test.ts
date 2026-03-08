import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataExportService } from '@/lib/compliance/data-export'
import { DataDeletionService } from '@/lib/compliance/data-deletion'
import { ConsentManager } from '@/lib/compliance/consent-manager'
import { DataRetentionService } from '@/lib/compliance/data-retention'

/**
 * Unit Tests for GDPR Compliance Features
 * 
 * **Requirements: 38.1, 38.2, 38.3, 38.4, 38.6**
 * 
 * Tests:
 * - Data export functionality
 * - Data deletion (soft and hard)
 * - Consent management
 * - Data retention policies
 */

describe('Compliance Features', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Mock Supabase client with proper chaining
    const createMockChain = () => ({
      eq: vi.fn(() => createMockChain()),
      is: vi.fn(() => createMockChain()),
      not: vi.fn(() => createMockChain()),
      lt: vi.fn(() => createMockChain()),
      in: vi.fn(() => createMockChain()),
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })

    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => createMockChain()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
        update: vi.fn(() => createMockChain()),
        delete: vi.fn(() => createMockChain()),
      })),
    }
  })

  describe('DataExportService', () => {
    it('should export user data in JSON format', async () => {
      const exportService = new DataExportService(mockSupabase)

      // Mock user data
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 'user-123',
                      email: 'test@example.com',
                      created_at: '2024-01-01',
                      updated_at: '2024-01-01',
                    },
                    error: null,
                  })
                ),
              })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        }
      })

      const result = await exportService.exportUserData('user-123', 'tenant-123')

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.id).toBe('user-123')
      expect(result.contacts).toBeInstanceOf(Array)
      expect(result.messages).toBeInstanceOf(Array)
      expect(result.broadcasts).toBeInstanceOf(Array)
      expect(result.export_metadata).toBeDefined()
      expect(result.export_metadata.tenant_id).toBe('tenant-123')
    })

    it('should export user data as JSON string', async () => {
      const exportService = new DataExportService(mockSupabase)

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { id: 'user-123', email: 'test@example.com' },
                error: null,
              })
            ),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }))

      const result = await exportService.exportUserDataAsJSON('user-123', 'tenant-123')

      expect(typeof result).toBe('string')
      expect(() => JSON.parse(result)).not.toThrow()
    })
  })

  describe('DataDeletionService', () => {
    it('should soft delete user data', async () => {
      const deletionService = new DataDeletionService(mockSupabase)

      const result = await deletionService.softDeleteUserData('user-123', 'tenant-123')

      expect(result.success).toBe(true)
      expect(result.deletedAt).toBeDefined()
      expect(result.permanentDeletionScheduledFor).toBeDefined()
      expect(result.itemsDeleted).toBeDefined()
    })

    it('should schedule permanent deletion 30 days after soft delete', async () => {
      const deletionService = new DataDeletionService(mockSupabase, 30)

      const result = await deletionService.softDeleteUserData('user-123', 'tenant-123')

      const deletedDate = new Date(result.deletedAt)
      const permanentDate = new Date(result.permanentDeletionScheduledFor)
      const daysDiff = Math.floor(
        (permanentDate.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(daysDiff).toBe(30)
    })

    it('should hard delete user data permanently', async () => {
      const deletionService = new DataDeletionService(mockSupabase)

      const result = await deletionService.hardDeleteUserData('user-123', 'tenant-123')

      expect(result.success).toBe(true)
      expect(result.deletedAt).toBeDefined()
    })
  })

  describe('ConsentManager', () => {
    it('should grant consent', async () => {
      const consentManager = new ConsentManager(mockSupabase)

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: 'consent-123',
                  consent_type: 'privacy_policy',
                  granted: true,
                },
                error: null,
              })
            ),
          })),
        })),
      }))

      const result = await consentManager.grantConsent('user-123', 'tenant-123', {
        consent_type: 'privacy_policy',
        purpose: 'Accept privacy policy',
        version: '1.0',
      })

      expect(result).toBeDefined()
      expect(result.granted).toBe(true)
    })

    it('should revoke consent', async () => {
      const consentManager = new ConsentManager(mockSupabase)

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    id: 'consent-123',
                    consent_type: 'marketing',
                    granted: false,
                  },
                  error: null,
                })
              ),
            })),
          })),
        })),
      }))

      const result = await consentManager.revokeConsent('user-123', 'tenant-123', {
        consent_type: 'marketing',
      })

      expect(result).toBeDefined()
      expect(result.granted).toBe(false)
    })

    it('should check if user has consent', async () => {
      const consentManager = new ConsentManager(mockSupabase)

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { granted: true },
                  error: null,
                })
              ),
            })),
          })),
        })),
      }))

      const hasConsent = await consentManager.hasConsent(
        'user-123',
        'tenant-123',
        'privacy_policy'
      )

      expect(hasConsent).toBe(true)
    })
  })

  describe('DataRetentionService', () => {
    it('should return retention policies', () => {
      const retentionService = new DataRetentionService(mockSupabase)

      const policies = retentionService.getRetentionPolicies()

      expect(policies).toBeInstanceOf(Array)
      expect(policies.length).toBeGreaterThan(0)
      expect(policies[0]).toHaveProperty('dataType')
      expect(policies[0]).toHaveProperty('retentionDays')
      expect(policies[0]).toHaveProperty('description')
    })

    it('should get retention policy for specific data type', () => {
      const retentionService = new DataRetentionService(mockSupabase)

      const policy = retentionService.getRetentionPolicy('messages')

      expect(policy).toBeDefined()
      expect(policy?.dataType).toBe('messages')
      expect(policy?.retentionDays).toBe(730) // 2 years
    })

    it('should cleanup expired messages', async () => {
      const retentionService = new DataRetentionService(mockSupabase)

      const result = await retentionService.cleanupExpiredMessages()

      expect(result).toBeDefined()
      expect(result.dataType).toBe('messages')
      expect(result.itemsDeleted).toBeGreaterThanOrEqual(0)
    })

    it('should run all cleanup jobs', async () => {
      const retentionService = new DataRetentionService(mockSupabase)

      const results = await retentionService.runAllCleanupJobs()

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('dataType')
      expect(results[0]).toHaveProperty('itemsDeleted')
    })
  })
})
