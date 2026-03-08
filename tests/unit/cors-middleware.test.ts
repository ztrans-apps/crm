/**
 * Unit tests for CORS middleware functionality
 * Tests CORS header configuration, origin whitelisting, and preflight handling
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.10**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(async () => {
    const response = NextResponse.next()
    return response
  }),
}))

vi.mock('@/lib/middleware/request-logger', () => ({
  RequestLogger: {
    logSecurityEvent: vi.fn(),
  },
}))

describe('CORS Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should allow localhost origins in development', async () => {
      const { middleware } = await import('@/middleware')
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          origin: 'http://localhost:3000',
        },
      })

      const response = await middleware(request)
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should allow 127.0.0.1 origins in development', async () => {
      const { middleware } = await import('@/middleware')
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          origin: 'http://127.0.0.1:3000',
        },
      })

      const response = await middleware(request)
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:3000')
    })
  })

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should allow whitelisted origins in production', async () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'
      
      // Need to re-import to pick up new env vars
      vi.resetModules()
      const { middleware } = await import('@/middleware')
      
      const request = new NextRequest('https://app.example.com/api/test', {
        headers: {
          origin: 'https://app.example.com',
        },
      })

      const response = await middleware(request)
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should reject non-whitelisted origins in production', async () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com'
      
      vi.resetModules()
      const { middleware } = await import('@/middleware')
      const { RequestLogger } = await import('@/lib/middleware/request-logger')
      
      const request = new NextRequest('https://app.example.com/api/test', {
        headers: {
          origin: 'https://malicious.com',
        },
      })

      const response = await middleware(request)
      
      // Should not include CORS headers for non-whitelisted origin
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
      
      // Should log CORS violation
      expect(RequestLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'suspicious_activity',
          details: expect.objectContaining({
            event: 'cors_violation',
            origin: 'https://malicious.com',
            reason: 'origin_not_whitelisted',
          }),
        })
      )
    })

    it('should not allow localhost in production', async () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com'
      
      vi.resetModules()
      const { middleware } = await import('@/middleware')
      
      const request = new NextRequest('https://app.example.com/api/test', {
        headers: {
          origin: 'http://localhost:3000',
        },
      })

      const response = await middleware(request)
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })
  })

  describe('Preflight OPTIONS Requests', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should handle preflight OPTIONS requests correctly', async () => {
      const { middleware } = await import('@/middleware')
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
        },
      })

      const response = await middleware(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, PATCH, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should reject preflight requests from non-whitelisted origins', async () => {
      process.env.NODE_ENV = 'production'
      process.env.ALLOWED_ORIGINS = 'https://app.example.com'
      
      vi.resetModules()
      const { middleware } = await import('@/middleware')
      const { RequestLogger } = await import('@/lib/middleware/request-logger')
      
      const request = new NextRequest('https://app.example.com/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://malicious.com',
        },
      })

      const response = await middleware(request)
      
      expect(response.status).toBe(403)
      expect(RequestLogger.logSecurityEvent).toHaveBeenCalled()
    })
  })

  describe('CORS Headers', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should include all required CORS headers for allowed origins', async () => {
      const { middleware } = await import('@/middleware')
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          origin: 'http://localhost:3000',
        },
      })

      const response = await middleware(request)
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should not include CORS headers when no origin is present', async () => {
      const { middleware } = await import('@/middleware')
      
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await middleware(request)
      
      // No origin header means same-origin request, no CORS headers needed
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })
  })

  describe('CORS Violation Logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.ALLOWED_ORIGINS = 'https://app.example.com'
    })

    it('should log CORS violations with full context', async () => {
      vi.resetModules()
      const { middleware } = await import('@/middleware')
      const { RequestLogger } = await import('@/lib/middleware/request-logger')
      
      const request = new NextRequest('https://app.example.com/api/contacts', {
        method: 'GET',
        headers: {
          origin: 'https://evil.com',
          'user-agent': 'Mozilla/5.0',
        },
      })

      await middleware(request)
      
      expect(RequestLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'suspicious_activity',
          details: expect.objectContaining({
            event: 'cors_violation',
            origin: 'https://evil.com',
            reason: 'origin_not_whitelisted',
            path: '/api/contacts',
            method: 'GET',
            userAgent: 'Mozilla/5.0',
          }),
        })
      )
    })
  })
})
