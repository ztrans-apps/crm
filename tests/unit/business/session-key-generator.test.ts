/**
 * Session Key Generator - Pure Unit Test
 * Business logic for session key generation
 */

import { describe, it, expect } from 'vitest'

// Pure functions to test
function generateSessionKey(tenantId: string, sessionId: string): string {
  if (!tenantId || !sessionId) {
    throw new Error('tenantId and sessionId are required')
  }
  return `${tenantId}:${sessionId}`
}

function parseSessionKey(sessionKey: string): { tenantId: string; sessionId: string } | null {
  if (!sessionKey || typeof sessionKey !== 'string') return null
  
  const parts = sessionKey.split(':')
  if (parts.length !== 2) return null
  
  return {
    tenantId: parts[0],
    sessionId: parts[1],
  }
}

function isValidSessionKey(sessionKey: string): boolean {
  const parsed = parseSessionKey(sessionKey)
  return parsed !== null && parsed.tenantId.length > 0 && parsed.sessionId.length > 0
}

describe('Session Key Generator - Pure Unit', () => {
  describe('generateSessionKey', () => {
    it('should generate correct session key', () => {
      const key = generateSessionKey('tenant-1', 'session-1')
      expect(key).toBe('tenant-1:session-1')
    })

    it('should handle UUID format', () => {
      const tenantId = '00000000-0000-0000-0000-000000000001'
      const sessionId = '11111111-1111-1111-1111-111111111111'
      const key = generateSessionKey(tenantId, sessionId)
      expect(key).toBe(`${tenantId}:${sessionId}`)
    })

    it('should throw error for missing tenantId', () => {
      expect(() => generateSessionKey('', 'session-1')).toThrow('tenantId and sessionId are required')
    })

    it('should throw error for missing sessionId', () => {
      expect(() => generateSessionKey('tenant-1', '')).toThrow('tenantId and sessionId are required')
    })

    it('should throw error for null values', () => {
      expect(() => generateSessionKey(null as any, 'session-1')).toThrow()
      expect(() => generateSessionKey('tenant-1', null as any)).toThrow()
    })
  })

  describe('parseSessionKey', () => {
    it('should parse valid session key', () => {
      const result = parseSessionKey('tenant-1:session-1')
      expect(result).toEqual({
        tenantId: 'tenant-1',
        sessionId: 'session-1',
      })
    })

    it('should parse UUID session key', () => {
      const key = '00000000-0000-0000-0000-000000000001:11111111-1111-1111-1111-111111111111'
      const result = parseSessionKey(key)
      expect(result).toEqual({
        tenantId: '00000000-0000-0000-0000-000000000001',
        sessionId: '11111111-1111-1111-1111-111111111111',
      })
    })

    it('should return null for invalid format', () => {
      expect(parseSessionKey('invalid')).toBeNull()
      expect(parseSessionKey('tenant-1')).toBeNull()
      expect(parseSessionKey('tenant-1:session-1:extra')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(parseSessionKey('')).toBeNull()
    })

    it('should return null for null/undefined', () => {
      expect(parseSessionKey(null as any)).toBeNull()
      expect(parseSessionKey(undefined as any)).toBeNull()
    })
  })

  describe('isValidSessionKey', () => {
    it('should validate correct session key', () => {
      expect(isValidSessionKey('tenant-1:session-1')).toBe(true)
    })

    it('should validate UUID session key', () => {
      const key = '00000000-0000-0000-0000-000000000001:11111111-1111-1111-1111-111111111111'
      expect(isValidSessionKey(key)).toBe(true)
    })

    it('should reject invalid format', () => {
      expect(isValidSessionKey('invalid')).toBe(false)
      expect(isValidSessionKey('tenant-1')).toBe(false)
      expect(isValidSessionKey('tenant-1:session-1:extra')).toBe(false)
    })

    it('should reject empty parts', () => {
      expect(isValidSessionKey(':session-1')).toBe(false)
      expect(isValidSessionKey('tenant-1:')).toBe(false)
      expect(isValidSessionKey(':')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isValidSessionKey('')).toBe(false)
    })
  })
})
