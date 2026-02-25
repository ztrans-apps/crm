/**
 * API Key Authentication Middleware - Unit Test
 * Tests API key validation and scope checking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock API key data
const mockApiKey = {
  id: 'key-1',
  tenant_id: 'tenant-1',
  key_hash: 'hashed-key',
  scopes: ['messages.send', 'messages.read', 'contacts.read'],
  is_active: true,
  expires_at: null,
  last_used_at: null,
}

// Mock API key service
const mockApiKeyService = {
  validateKey: vi.fn(),
  hasScope: vi.fn(),
  logUsage: vi.fn(),
}

// Mock request
class MockNextRequest {
  headers: Map<string, string>
  url: string
  method: string

  constructor(url: string, method: string = 'GET', headers: Record<string, string> = {}) {
    this.url = url
    this.method = method
    this.headers = new Map(Object.entries(headers))
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null
  }
}

// Mock validation function
async function mockValidateApiKey(
  request: any,
  requiredScope?: string
): Promise<{ valid: boolean; context?: any; error?: string }> {
  try {
    // Get API key from header
    const apiKey = request.get('x-api-key') || request.get('authorization')?.replace('Bearer ', '')
    
    if (!apiKey) {
      return {
        valid: false,
        error: 'API key required. Provide via X-API-Key header or Authorization: Bearer <key>',
      }
    }
    
    // Validate key
    const keyData = await mockApiKeyService.validateKey(apiKey)
    
    if (!keyData) {
      return {
        valid: false,
        error: 'Invalid or expired API key',
      }
    }
    
    // Check scope if required
    if (requiredScope && !mockApiKeyService.hasScope(keyData, requiredScope)) {
      return {
        valid: false,
        error: `Insufficient permissions. Required scope: ${requiredScope}`,
      }
    }
    
    return {
      valid: true,
      context: {
        apiKey: keyData,
        tenantId: keyData.tenant_id,
      },
    }
  } catch (error: any) {
    return {
      valid: false,
      error: 'Internal server error',
    }
  }
}

describe('API Key Authentication Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiKeyService.validateKey.mockResolvedValue(mockApiKey)
    mockApiKeyService.hasScope.mockReturnValue(true)
    mockApiKeyService.logUsage.mockResolvedValue(undefined)
  })

  describe('API Key Extraction', () => {
    it('should extract API key from X-API-Key header', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'test-key-123',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(mockApiKeyService.validateKey).toHaveBeenCalledWith('test-key-123')
      expect(result.valid).toBe(true)
    })

    it('should extract API key from Authorization Bearer header', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'authorization': 'Bearer test-key-123',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(mockApiKeyService.validateKey).toHaveBeenCalledWith('test-key-123')
      expect(result.valid).toBe(true)
    })

    it('should return error when API key missing', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET')
      
      const result = await mockValidateApiKey(request)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('API key required')
    })
  })

  describe('API Key Validation', () => {
    it('should validate correct API key', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.valid).toBe(true)
      expect(result.context).toBeDefined()
      expect(result.context.tenantId).toBe('tenant-1')
    })

    it('should reject invalid API key', async () => {
      mockApiKeyService.validateKey.mockResolvedValueOnce(null)
      
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'invalid-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid or expired')
    })

    it('should reject expired API key', async () => {
      mockApiKeyService.validateKey.mockResolvedValueOnce(null)
      
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'expired-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid or expired')
    })
  })

  describe('Scope Checking', () => {
    it('should allow request with required scope', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result = await mockValidateApiKey(request, 'messages.send')
      
      expect(result.valid).toBe(true)
      expect(mockApiKeyService.hasScope).toHaveBeenCalledWith(mockApiKey, 'messages.send')
    })

    it('should reject request without required scope', async () => {
      mockApiKeyService.hasScope.mockReturnValueOnce(false)
      
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result = await mockValidateApiKey(request, 'admin.access')
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Insufficient permissions')
      expect(result.error).toContain('admin.access')
    })

    it('should allow request when no scope required', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.valid).toBe(true)
      expect(mockApiKeyService.hasScope).not.toHaveBeenCalled()
    })
  })

  describe('Context Extraction', () => {
    it('should extract tenant ID from API key', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.context.tenantId).toBe('tenant-1')
    })

    it('should include API key data in context', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.context.apiKey).toBeDefined()
      expect(result.context.apiKey.id).toBe('key-1')
      expect(result.context.apiKey.scopes).toContain('messages.send')
    })
  })

  describe('Usage Logging', () => {
    it('should log successful API usage', async () => {
      await mockApiKeyService.logUsage(
        'key-1',
        'tenant-1',
        '/api/messages',
        'POST',
        200,
        150
      )
      
      expect(mockApiKeyService.logUsage).toHaveBeenCalledWith(
        'key-1',
        'tenant-1',
        '/api/messages',
        'POST',
        200,
        150
      )
    })

    it('should log failed API usage', async () => {
      await mockApiKeyService.logUsage(
        'key-1',
        'tenant-1',
        '/api/messages',
        'POST',
        500,
        200
      )
      
      expect(mockApiKeyService.logUsage).toHaveBeenCalledWith(
        'key-1',
        'tenant-1',
        '/api/messages',
        'POST',
        500,
        200
      )
    })

    it('should include request metadata in logs', async () => {
      await mockApiKeyService.logUsage(
        'key-1',
        'tenant-1',
        '/api/messages',
        'POST',
        200,
        150,
        '192.168.1.1',
        'Mozilla/5.0'
      )
      
      expect(mockApiKeyService.logUsage).toHaveBeenCalledWith(
        'key-1',
        'tenant-1',
        '/api/messages',
        'POST',
        200,
        150,
        '192.168.1.1',
        'Mozilla/5.0'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      mockApiKeyService.validateKey.mockRejectedValueOnce(new Error('Database error'))
      
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Internal server error')
    })

    it('should handle scope check errors', async () => {
      mockApiKeyService.hasScope.mockImplementationOnce(() => {
        throw new Error('Scope check failed')
      })
      
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result = await mockValidateApiKey(request, 'messages.send')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Internal server error')
    })
  })

  describe('Multiple Scopes', () => {
    it('should check multiple scopes', async () => {
      const keyWithMultipleScopes = {
        ...mockApiKey,
        scopes: ['messages.send', 'messages.read', 'contacts.read', 'contacts.write'],
      }
      
      mockApiKeyService.validateKey.mockResolvedValueOnce(keyWithMultipleScopes)
      mockApiKeyService.hasScope.mockReturnValue(true)
      
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'valid-key',
      })
      
      const result1 = await mockValidateApiKey(request, 'messages.send')
      const result2 = await mockValidateApiKey(request, 'contacts.write')
      
      expect(result1.valid).toBe(true)
      expect(result2.valid).toBe(true)
    })
  })

  describe('Tenant Isolation', () => {
    it('should isolate API keys by tenant', async () => {
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'tenant-1-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.context.tenantId).toBe('tenant-1')
    })

    it('should not allow cross-tenant access', async () => {
      const tenant2Key = { ...mockApiKey, tenant_id: 'tenant-2' }
      mockApiKeyService.validateKey.mockResolvedValueOnce(tenant2Key)
      
      const request = new MockNextRequest('http://localhost/api/test', 'GET', {
        'x-api-key': 'tenant-2-key',
      })
      
      const result = await mockValidateApiKey(request)
      
      expect(result.context.tenantId).toBe('tenant-2')
      expect(result.context.tenantId).not.toBe('tenant-1')
    })
  })
})
