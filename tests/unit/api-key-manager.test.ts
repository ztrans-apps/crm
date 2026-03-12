import { describe, it, expect, beforeEach, vi } from 'vitest'
import { APIKeyManager } from '@/lib/security/api-key-manager'
import type { APIKey } from '@/lib/security/api-key-manager'

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn((key: string) => Promise.resolve(`hashed_${key}`)),
    compare: vi.fn((key: string, hash: string) => 
      Promise.resolve(hash === `hashed_${key}`)
    ),
  },
}))

// Create mock Supabase client
const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn(function(this: any) { return this }),
    insert: vi.fn(function(this: any) { return this }),
    select: vi.fn(function(this: any) { return this }),
    single: vi.fn(),
    eq: vi.fn(function(this: any) { return this }),
    is: vi.fn(function(this: any) { return this }),
    update: vi.fn(function(this: any) { return this }),
    order: vi.fn(function(this: any) { return this }),
  }
  return mock
}

describe('APIKeyManager', () => {
  let apiKeyManager: APIKeyManager
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    apiKeyManager = new APIKeyManager(mockSupabase)
  })

  describe('createAPIKey', () => {
    it('should create a new API key with correct format', async () => {
      const mockKeyData: APIKey = {
        id: 'key-123',
        tenant_id: 'tenant-123',
        name: 'Test API Key',
        key_prefix: 'sk_live_abcd',
        key_hash: 'hashed_key',
        scopes: ['contact.read', 'contact.write'],
        ip_whitelist: [],
        expires_at: null,
        last_used_at: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockKeyData,
        error: null,
      })

      const result = await apiKeyManager.createAPIKey({
        tenantId: 'tenant-123',
        name: 'Test API Key',
        scopes: ['contact.read', 'contact.write'],
      })

      expect(result.key).toMatch(/^sk_live_[A-Za-z0-9_-]+$/)
      expect(result.keyData).toEqual(mockKeyData)
      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    it('should create API key with IP whitelist', async () => {
      const mockKeyData: APIKey = {
        id: 'key-123',
        tenant_id: 'tenant-123',
        name: 'Test API Key',
        key_prefix: 'sk_live_abcd',
        key_hash: 'hashed_key',
        scopes: ['contact.read'],
        ip_whitelist: ['192.168.1.1', '10.0.0.0/8'],
        expires_at: null,
        last_used_at: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockKeyData,
        error: null,
      })

      const result = await apiKeyManager.createAPIKey({
        tenantId: 'tenant-123',
        name: 'Test API Key',
        scopes: ['contact.read'],
        ipWhitelist: ['192.168.1.1', '10.0.0.0/8'],
      })

      expect(result.keyData.ip_whitelist).toEqual(['192.168.1.1', '10.0.0.0/8'])
    })

    it('should create API key with expiration date', async () => {
      const expiresAt = new Date('2025-12-31')
      const mockKeyData: APIKey = {
        id: 'key-123',
        tenant_id: 'tenant-123',
        name: 'Test API Key',
        key_prefix: 'sk_live_abcd',
        key_hash: 'hashed_key',
        scopes: ['contact.read'],
        ip_whitelist: [],
        expires_at: expiresAt.toISOString(),
        last_used_at: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockKeyData,
        error: null,
      })

      const result = await apiKeyManager.createAPIKey({
        tenantId: 'tenant-123',
        name: 'Test API Key',
        scopes: ['contact.read'],
        expiresAt,
      })

      expect(result.keyData.expires_at).toBe(expiresAt.toISOString())
    })

    it('should throw error if database insert fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        apiKeyManager.createAPIKey({
          tenantId: 'tenant-123',
          name: 'Test API Key',
          scopes: ['contact.read'],
        })
      ).rejects.toThrow('Failed to create API key')
    })
  })

  describe('validateAPIKey', () => {
    it('should validate a valid API key', async () => {
      const testKey = 'sk_live_test123456789'
      const mockKeyData: APIKey = {
        id: 'key-123',
        tenant_id: 'tenant-123',
        name: 'Test API Key',
        key_prefix: 'sk_live_test',
        key_hash: `hashed_${testKey}`,
        scopes: ['contact.read'],
        ip_whitelist: [],
        expires_at: null,
        last_used_at: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      // Mock the entire chain
      mockSupabase.is.mockReturnValueOnce(Promise.resolve({
        data: [mockKeyData],
        error: null,
      }))
      
      // Mock updateLastUsed chain
      mockSupabase.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      const result = await apiKeyManager.validateAPIKey(testKey)

      expect(result.valid).toBe(true)
      expect(result.keyData).toEqual(mockKeyData)
    })

    it('should reject invalid API key', async () => {
      mockSupabase.is.mockReturnValueOnce(Promise.resolve({
        data: [],
        error: null,
      }))

      const result = await apiKeyManager.validateAPIKey('sk_live_invalid')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('API key not found')
    })

    it('should reject expired API key', async () => {
      const testKey = 'sk_live_test123456789'
      const mockKeyData: APIKey = {
        id: 'key-123',
        tenant_id: 'tenant-123',
        name: 'Test API Key',
        key_prefix: 'sk_live_test',
        key_hash: `hashed_${testKey}`,
        scopes: ['contact.read'],
        ip_whitelist: [],
        expires_at: new Date('2020-01-01').toISOString(), // Expired
        last_used_at: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSupabase.is.mockReturnValueOnce(Promise.resolve({
        data: [mockKeyData],
        error: null,
      }))

      const result = await apiKeyManager.validateAPIKey(testKey)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('API key expired')
    })

    it('should update last_used_at on successful validation', async () => {
      const testKey = 'sk_live_test123456789'
      const mockKeyData: APIKey = {
        id: 'key-123',
        tenant_id: 'tenant-123',
        name: 'Test API Key',
        key_prefix: 'sk_live_test',
        key_hash: `hashed_${testKey}`,
        scopes: ['contact.read'],
        ip_whitelist: [],
        expires_at: null,
        last_used_at: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      mockSupabase.is.mockReturnValueOnce(Promise.resolve({
        data: [mockKeyData],
        error: null,
      }))
      
      // Mock updateLastUsed chain
      mockSupabase.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      await apiKeyManager.validateAPIKey(testKey)

      // updateLastUsed is fire-and-forget, so we just verify it was called
      expect(mockSupabase.update).toHaveBeenCalled()
    })
  })

  describe('revokeAPIKey', () => {
    it('should revoke an API key', async () => {
      mockSupabase.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      await apiKeyManager.revokeAPIKey('key-123')

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ revoked_at: expect.any(String) })
      )
    })

    it('should throw error if revocation fails', async () => {
      mockSupabase.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      })

      await expect(apiKeyManager.revokeAPIKey('key-123')).rejects.toThrow(
        'Failed to revoke API key'
      )
    })
  })

  describe('rotateAPIKey', () => {
    it('should rotate an API key', async () => {
      const oldKeyData: APIKey = {
        id: 'key-123',
        tenant_id: 'tenant-123',
        name: 'Test API Key',
        key_prefix: 'sk_live_old',
        key_hash: 'hashed_old',
        scopes: ['contact.read', 'contact.write'],
        ip_whitelist: ['192.168.1.1'],
        expires_at: null,
        last_used_at: null,
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      const newKeyData: APIKey = {
        ...oldKeyData,
        id: 'key-456',
        key_prefix: 'sk_live_new',
        key_hash: 'hashed_new',
      }

      // Mock fetching old key - need to mock the chain
      mockSupabase.single.mockResolvedValueOnce({
        data: oldKeyData,
        error: null,
      })

      // Mock revoking old key
      mockSupabase.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      // Mock creating new key
      mockSupabase.single.mockResolvedValueOnce({
        data: newKeyData,
        error: null,
      })

      const result = await apiKeyManager.rotateAPIKey('key-123')

      expect(result.key).toMatch(/^sk_live_[A-Za-z0-9_-]+$/)
      expect(result.keyData.tenant_id).toBe(oldKeyData.tenant_id)
      expect(result.keyData.scopes).toEqual(oldKeyData.scopes)
      expect(result.keyData.ip_whitelist).toEqual(oldKeyData.ip_whitelist)
    })

    it('should throw error if old key not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(apiKeyManager.rotateAPIKey('key-123')).rejects.toThrow(
        'API key not found'
      )
    })
  })

  describe('listAPIKeys', () => {
    it('should list all active API keys for a tenant', async () => {
      const mockKeys: APIKey[] = [
        {
          id: 'key-1',
          tenant_id: 'tenant-123',
          name: 'Key 1',
          key_prefix: 'sk_live_key1',
          key_hash: 'hash1',
          scopes: ['contact.read'],
          ip_whitelist: [],
          expires_at: null,
          last_used_at: null,
          created_at: new Date().toISOString(),
          revoked_at: null,
        },
        {
          id: 'key-2',
          tenant_id: 'tenant-123',
          name: 'Key 2',
          key_prefix: 'sk_live_key2',
          key_hash: 'hash2',
          scopes: ['message.send'],
          ip_whitelist: [],
          expires_at: null,
          last_used_at: null,
          created_at: new Date().toISOString(),
          revoked_at: null,
        },
      ]

      mockSupabase.is.mockReturnValueOnce(Promise.resolve({
        data: mockKeys,
        error: null,
      }))

      const result = await apiKeyManager.listAPIKeys('tenant-123')

      expect(result).toEqual(mockKeys)
    })

    it('should include revoked keys when requested', async () => {
      mockSupabase.order.mockReturnValueOnce(Promise.resolve({
        data: [],
        error: null,
      }))

      await apiKeyManager.listAPIKeys('tenant-123', true)

      // When includeRevoked is true, is() should not be called
      expect(mockSupabase.is).not.toHaveBeenCalled()
    })
  })

  describe('isIPWhitelisted', () => {
    it('should allow all IPs when whitelist is empty', () => {
      const result = apiKeyManager.isIPWhitelisted('192.168.1.1', [])
      expect(result).toBe(true)
    })

    it('should allow IP in whitelist', () => {
      const result = apiKeyManager.isIPWhitelisted('192.168.1.1', [
        '192.168.1.1',
        '10.0.0.1',
      ])
      expect(result).toBe(true)
    })

    it('should reject IP not in whitelist', () => {
      const result = apiKeyManager.isIPWhitelisted('192.168.1.100', [
        '192.168.1.1',
        '10.0.0.1',
      ])
      expect(result).toBe(false)
    })
  })

  describe('hasScope', () => {
    const mockKeyData: APIKey = {
      id: 'key-123',
      tenant_id: 'tenant-123',
      name: 'Test Key',
      key_prefix: 'sk_live_test',
      key_hash: 'hash',
      scopes: ['contact.read', 'contact.write'],
      ip_whitelist: [],
      expires_at: null,
      last_used_at: null,
      created_at: new Date().toISOString(),
      revoked_at: null,
    }

    it('should return true for granted scope', () => {
      const result = apiKeyManager.hasScope(mockKeyData, 'contact.read')
      expect(result).toBe(true)
    })

    it('should return false for non-granted scope', () => {
      const result = apiKeyManager.hasScope(mockKeyData, 'message.send')
      expect(result).toBe(false)
    })

    it('should return true for any scope when wildcard is granted', () => {
      const wildcardKey: APIKey = {
        ...mockKeyData,
        scopes: ['*'],
      }

      expect(apiKeyManager.hasScope(wildcardKey, 'contact.read')).toBe(true)
      expect(apiKeyManager.hasScope(wildcardKey, 'message.send')).toBe(true)
      expect(apiKeyManager.hasScope(wildcardKey, 'any.permission')).toBe(true)
    })
  })
})
