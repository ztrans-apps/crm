import { describe, it, expect } from 'vitest'
import {
  RATE_LIMIT_TIERS,
  getRateLimitOptions,
  getAuthRateLimitOptions,
  getWhatsAppRateLimitOptions,
  getStandardApiRateLimitOptions,
  getAdminRateLimitOptions,
  getWebhookRateLimitOptions,
} from '@/lib/middleware/rate-limit-config'

describe('Rate Limit Configuration', () => {
  describe('RATE_LIMIT_TIERS', () => {
    it('should define authentication tier with 5 requests per minute per IP', () => {
      expect(RATE_LIMIT_TIERS.AUTHENTICATION).toEqual({
        maxRequests: 5,
        windowSeconds: 60,
        description: 'Authentication endpoints (login, register, password reset)',
        identifierType: 'ip',
      })
    })

    it('should define WhatsApp messaging tier with 100 requests per hour per tenant', () => {
      expect(RATE_LIMIT_TIERS.WHATSAPP_MESSAGING).toEqual({
        maxRequests: 100,
        windowSeconds: 3600,
        description: 'WhatsApp message sending endpoints',
        identifierType: 'tenant',
      })
    })

    it('should define standard API tier with 1000 requests per hour per tenant', () => {
      expect(RATE_LIMIT_TIERS.STANDARD_API).toEqual({
        maxRequests: 1000,
        windowSeconds: 3600,
        description: 'Standard API endpoints',
        identifierType: 'tenant',
      })
    })

    it('should define admin tier with 500 requests per hour per user', () => {
      expect(RATE_LIMIT_TIERS.ADMIN).toEqual({
        maxRequests: 500,
        windowSeconds: 3600,
        description: 'Admin endpoints',
        identifierType: 'user',
      })
    })

    it('should define webhook tier with 10000 requests per hour per tenant', () => {
      expect(RATE_LIMIT_TIERS.WEBHOOK).toEqual({
        maxRequests: 10000,
        windowSeconds: 3600,
        description: 'Webhook endpoints',
        identifierType: 'tenant',
      })
    })
  })

  describe('getRateLimitOptions', () => {
    it('should return correct options for authentication category', () => {
      const options = getRateLimitOptions('AUTHENTICATION', '192.168.1.1')
      
      expect(options).toEqual({
        maxRequests: 5,
        windowSeconds: 60,
        keyPrefix: 'authentication',
        identifier: '192.168.1.1',
      })
    })

    it('should return correct options for WhatsApp messaging category', () => {
      const options = getRateLimitOptions('WHATSAPP_MESSAGING', 'tenant-123')
      
      expect(options).toEqual({
        maxRequests: 100,
        windowSeconds: 3600,
        keyPrefix: 'whatsapp_messaging',
        identifier: 'tenant-123',
      })
    })

    it('should return correct options for standard API category', () => {
      const options = getRateLimitOptions('STANDARD_API', 'tenant-456')
      
      expect(options).toEqual({
        maxRequests: 1000,
        windowSeconds: 3600,
        keyPrefix: 'standard_api',
        identifier: 'tenant-456',
      })
    })

    it('should return correct options for admin category', () => {
      const options = getRateLimitOptions('ADMIN', 'user-789')
      
      expect(options).toEqual({
        maxRequests: 500,
        windowSeconds: 3600,
        keyPrefix: 'admin',
        identifier: 'user-789',
      })
    })

    it('should allow custom key prefix', () => {
      const options = getRateLimitOptions('AUTHENTICATION', '192.168.1.1', 'custom:auth')
      
      expect(options.keyPrefix).toBe('custom:auth')
    })
  })

  describe('Helper functions', () => {
    it('getAuthRateLimitOptions should return authentication options', () => {
      const options = getAuthRateLimitOptions('192.168.1.1')
      
      expect(options).toEqual({
        maxRequests: 5,
        windowSeconds: 60,
        keyPrefix: 'auth',
        identifier: '192.168.1.1',
      })
    })

    it('getWhatsAppRateLimitOptions should return WhatsApp messaging options', () => {
      const options = getWhatsAppRateLimitOptions('tenant-123')
      
      expect(options).toEqual({
        maxRequests: 100,
        windowSeconds: 3600,
        keyPrefix: 'whatsapp',
        identifier: 'tenant-123',
      })
    })

    it('getStandardApiRateLimitOptions should return standard API options', () => {
      const options = getStandardApiRateLimitOptions('tenant-456')
      
      expect(options).toEqual({
        maxRequests: 1000,
        windowSeconds: 3600,
        keyPrefix: 'api',
        identifier: 'tenant-456',
      })
    })

    it('getAdminRateLimitOptions should return admin options', () => {
      const options = getAdminRateLimitOptions('user-789')
      
      expect(options).toEqual({
        maxRequests: 500,
        windowSeconds: 3600,
        keyPrefix: 'admin',
        identifier: 'user-789',
      })
    })

    it('getWebhookRateLimitOptions should return webhook options', () => {
      const options = getWebhookRateLimitOptions('tenant-123')
      
      expect(options).toEqual({
        maxRequests: 10000,
        windowSeconds: 3600,
        keyPrefix: 'webhook',
        identifier: 'tenant-123',
      })
    })
  })

  describe('Rate limit requirements validation', () => {
    it('should meet Requirement 3.6: Authentication endpoints - 5 requests/minute per IP', () => {
      const tier = RATE_LIMIT_TIERS.AUTHENTICATION
      
      expect(tier.maxRequests).toBe(5)
      expect(tier.windowSeconds).toBe(60) // 1 minute
      expect(tier.identifierType).toBe('ip')
    })

    it('should meet Requirement 3.7: WhatsApp message sending - 100 requests/hour per tenant', () => {
      const tier = RATE_LIMIT_TIERS.WHATSAPP_MESSAGING
      
      expect(tier.maxRequests).toBe(100)
      expect(tier.windowSeconds).toBe(3600) // 1 hour
      expect(tier.identifierType).toBe('tenant')
    })

    it('should meet Requirement 3.8: Standard API endpoints - 1000 requests/hour per tenant', () => {
      const tier = RATE_LIMIT_TIERS.STANDARD_API
      
      expect(tier.maxRequests).toBe(1000)
      expect(tier.windowSeconds).toBe(3600) // 1 hour
      expect(tier.identifierType).toBe('tenant')
    })

    it('should meet Requirement 3.9: Admin endpoints - 500 requests/hour per user', () => {
      const tier = RATE_LIMIT_TIERS.ADMIN
      
      expect(tier.maxRequests).toBe(500)
      expect(tier.windowSeconds).toBe(3600) // 1 hour
      expect(tier.identifierType).toBe('user')
    })
  })
})
