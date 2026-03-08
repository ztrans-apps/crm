import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebhookHandler } from '@/lib/security/webhook-handler'
import type { WebhookPayload, WebhookConfig } from '@/lib/security/webhook-handler'

// Mock Redis client
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(() => null) // Return null to test without Redis
}))

describe('WebhookHandler', () => {
  let handler: WebhookHandler
  
  beforeEach(() => {
    vi.clearAllMocks()
    handler = new WebhookHandler()
  })
  
  describe('verifySignature', () => {
    const config: WebhookConfig = {
      secret: 'test-secret',
      signatureHeader: 'X-Signature',
      algorithm: 'sha256'
    }
    
    it('should verify valid signature', async () => {
      const payload = JSON.stringify({ test: 'data' })
      const signature = WebhookHandler.generateSignature(payload, config.secret, config.algorithm)
      
      const isValid = await handler.verifySignature(payload, signature, config)
      expect(isValid).toBe(true)
    })
    
    it('should reject invalid signature', async () => {
      const payload = JSON.stringify({ test: 'data' })
      const invalidSignature = 'invalid-signature-12345'
      
      const isValid = await handler.verifySignature(payload, invalidSignature, config)
      expect(isValid).toBe(false)
    })
    
    it('should reject signature with wrong secret', async () => {
      const payload = JSON.stringify({ test: 'data' })
      const signature = WebhookHandler.generateSignature(payload, 'wrong-secret', config.algorithm)
      
      const isValid = await handler.verifySignature(payload, signature, config)
      expect(isValid).toBe(false)
    })
    
    it('should reject signature with modified payload', async () => {
      const originalPayload = JSON.stringify({ test: 'data' })
      const signature = WebhookHandler.generateSignature(originalPayload, config.secret, config.algorithm)
      
      const modifiedPayload = JSON.stringify({ test: 'modified' })
      const isValid = await handler.verifySignature(modifiedPayload, signature, config)
      expect(isValid).toBe(false)
    })
    
    it('should support SHA-512 algorithm', async () => {
      const sha512Config: WebhookConfig = {
        ...config,
        algorithm: 'sha512'
      }
      
      const payload = JSON.stringify({ test: 'data' })
      const signature = WebhookHandler.generateSignature(payload, sha512Config.secret, sha512Config.algorithm)
      
      const isValid = await handler.verifySignature(payload, signature, sha512Config)
      expect(isValid).toBe(true)
    })
    
    it('should handle signature verification errors gracefully', async () => {
      const payload = JSON.stringify({ test: 'data' })
      const signature = 'too-short' // Will cause Buffer length mismatch
      
      const isValid = await handler.verifySignature(payload, signature, config)
      expect(isValid).toBe(false)
    })
  })
  
  describe('validatePayload', () => {
    it('should validate correct payload structure', () => {
      const payload: WebhookPayload = {
        id: 'webhook-123',
        event: 'user.created',
        data: { userId: '456' },
        timestamp: Date.now()
      }
      
      const isValid = handler.validatePayload(payload)
      expect(isValid).toBe(true)
    })
    
    it('should reject payload without id', () => {
      const payload = {
        event: 'user.created',
        data: { userId: '456' },
        timestamp: Date.now()
      }
      
      const isValid = handler.validatePayload(payload)
      expect(isValid).toBe(false)
    })
    
    it('should reject payload without event', () => {
      const payload = {
        id: 'webhook-123',
        data: { userId: '456' },
        timestamp: Date.now()
      }
      
      const isValid = handler.validatePayload(payload)
      expect(isValid).toBe(false)
    })
    
    it('should reject payload without data', () => {
      const payload = {
        id: 'webhook-123',
        event: 'user.created',
        timestamp: Date.now()
      }
      
      const isValid = handler.validatePayload(payload)
      expect(isValid).toBe(false)
    })
    
    it('should reject payload without timestamp', () => {
      const payload = {
        id: 'webhook-123',
        event: 'user.created',
        data: { userId: '456' }
      }
      
      const isValid = handler.validatePayload(payload)
      expect(isValid).toBe(false)
    })
    
    it('should reject non-object payload', () => {
      const isValid = handler.validatePayload('not an object')
      expect(isValid).toBe(false)
    })
    
    it('should reject null payload', () => {
      const isValid = handler.validatePayload(null)
      expect(isValid).toBe(false)
    })
  })
  
  describe('processWebhook', () => {
    const config: WebhookConfig = {
      secret: 'test-secret',
      signatureHeader: 'X-Signature',
      algorithm: 'sha256'
    }
    
    it('should process valid webhook', async () => {
      const payload: WebhookPayload = {
        id: 'webhook-123',
        event: 'user.created',
        data: { userId: '456' },
        timestamp: Date.now()
      }
      
      await expect(handler.processWebhook(payload, config)).resolves.not.toThrow()
    })
    
    it('should reject webhook with old timestamp', async () => {
      const payload: WebhookPayload = {
        id: 'webhook-123',
        event: 'user.created',
        data: { userId: '456' },
        timestamp: Date.now() - (10 * 60 * 1000) // 10 minutes ago
      }
      
      await expect(handler.processWebhook(payload, config)).rejects.toThrow(/timestamp too old/)
    })
    
    it('should accept webhook within time window', async () => {
      const payload: WebhookPayload = {
        id: 'webhook-123',
        event: 'user.created',
        data: { userId: '456' },
        timestamp: Date.now() - (2 * 60 * 1000) // 2 minutes ago (within 5 minute window)
      }
      
      await expect(handler.processWebhook(payload, config)).resolves.not.toThrow()
    })
  })
  
  describe('preventReplay', () => {
    it('should allow first webhook', async () => {
      const webhookId = 'webhook-123'
      
      const isReplay = await handler.preventReplay(webhookId)
      expect(isReplay).toBe(false)
    })
    
    it('should handle Redis unavailability gracefully', async () => {
      const webhookId = 'webhook-456'
      
      // Should not throw error even without Redis
      const isReplay = await handler.preventReplay(webhookId)
      expect(isReplay).toBe(false)
    })
  })
  
  describe('queueWebhook', () => {
    it('should queue webhook successfully', async () => {
      const payload: WebhookPayload = {
        id: 'webhook-123',
        event: 'user.created',
        data: { userId: '456' },
        timestamp: Date.now()
      }
      
      await expect(handler.queueWebhook(payload)).resolves.not.toThrow()
    })
    
    it('should handle queueing errors gracefully', async () => {
      const payload: WebhookPayload = {
        id: 'webhook-789',
        event: 'user.updated',
        data: { userId: '789' },
        timestamp: Date.now()
      }
      
      // Should not throw even if Redis is unavailable
      await expect(handler.queueWebhook(payload)).resolves.not.toThrow()
    })
  })
  
  describe('generateSignature', () => {
    it('should generate consistent signatures', () => {
      const payload = JSON.stringify({ test: 'data' })
      const secret = 'test-secret'
      
      const signature1 = WebhookHandler.generateSignature(payload, secret)
      const signature2 = WebhookHandler.generateSignature(payload, secret)
      
      expect(signature1).toBe(signature2)
    })
    
    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ test: 'data1' })
      const payload2 = JSON.stringify({ test: 'data2' })
      const secret = 'test-secret'
      
      const signature1 = WebhookHandler.generateSignature(payload1, secret)
      const signature2 = WebhookHandler.generateSignature(payload2, secret)
      
      expect(signature1).not.toBe(signature2)
    })
    
    it('should generate different signatures for different secrets', () => {
      const payload = JSON.stringify({ test: 'data' })
      const secret1 = 'secret1'
      const secret2 = 'secret2'
      
      const signature1 = WebhookHandler.generateSignature(payload, secret1)
      const signature2 = WebhookHandler.generateSignature(payload, secret2)
      
      expect(signature1).not.toBe(signature2)
    })
    
    it('should support SHA-512 algorithm', () => {
      const payload = JSON.stringify({ test: 'data' })
      const secret = 'test-secret'
      
      const sha256Sig = WebhookHandler.generateSignature(payload, secret, 'sha256')
      const sha512Sig = WebhookHandler.generateSignature(payload, secret, 'sha512')
      
      expect(sha256Sig).not.toBe(sha512Sig)
      expect(sha512Sig.length).toBeGreaterThan(sha256Sig.length) // SHA-512 produces longer hash
    })
  })
})
