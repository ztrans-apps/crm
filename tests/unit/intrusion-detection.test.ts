import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IntrusionDetectionSystem } from '@/lib/security/intrusion-detection'
import type { ThreatEvent } from '@/lib/security/intrusion-detection'

// Mock Redis client
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(() => null) // Return null to use in-memory fallback
}))

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('IntrusionDetectionSystem', () => {
  let ids: IntrusionDetectionSystem
  let mockSupabase: any
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      insert: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      gt: vi.fn(() => mockSupabase),
      gte: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      limit: vi.fn(() => mockSupabase),
      single: vi.fn(() => ({ data: null, error: { code: 'PGRST116' } }))
    }
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
    
    ids = new IntrusionDetectionSystem()
  })
  
  describe('detectBruteForce', () => {
    it('should detect brute force after 5 failed attempts', async () => {
      const ip = '192.168.1.1'
      
      // First 4 attempts should not trigger
      for (let i = 0; i < 4; i++) {
        const detected = await ids.detectBruteForce(ip)
        expect(detected).toBe(false)
      }
      
      // 5th attempt should trigger
      const detected = await ids.detectBruteForce(ip)
      expect(detected).toBe(true)
    })
    
    it('should track brute force per user when userId provided', async () => {
      const ip = '192.168.1.1'
      const userId = 'user-123'
      
      // 5 attempts with userId
      for (let i = 0; i < 5; i++) {
        await ids.detectBruteForce(ip, userId)
      }
      
      const detected = await ids.detectBruteForce(ip, userId)
      expect(detected).toBe(true)
      
      // Different user should not be affected
      const detectedDifferentUser = await ids.detectBruteForce(ip, 'user-456')
      expect(detectedDifferentUser).toBe(false)
    })
    
    it('should track brute force per IP when no userId provided', async () => {
      const ip1 = '192.168.1.1'
      const ip2 = '192.168.1.2'
      
      // 5 attempts from IP1
      for (let i = 0; i < 5; i++) {
        await ids.detectBruteForce(ip1)
      }
      
      const detected1 = await ids.detectBruteForce(ip1)
      expect(detected1).toBe(true)
      
      // IP2 should not be affected
      const detected2 = await ids.detectBruteForce(ip2)
      expect(detected2).toBe(false)
    })
  })
  
  describe('detectCredentialStuffing', () => {
    it('should detect credential stuffing after 20 failed attempts', async () => {
      const ip = '192.168.1.1'
      
      // First 19 attempts should not trigger
      for (let i = 0; i < 19; i++) {
        const detected = await ids.detectCredentialStuffing(ip)
        expect(detected).toBe(false)
      }
      
      // 20th attempt should trigger
      const detected = await ids.detectCredentialStuffing(ip)
      expect(detected).toBe(true)
    })
    
    it('should track credential stuffing per IP', async () => {
      const ip1 = '192.168.1.1'
      const ip2 = '192.168.1.2'
      
      // 20 attempts from IP1
      for (let i = 0; i < 20; i++) {
        await ids.detectCredentialStuffing(ip1)
      }
      
      const detected1 = await ids.detectCredentialStuffing(ip1)
      expect(detected1).toBe(true)
      
      // IP2 should not be affected
      const detected2 = await ids.detectCredentialStuffing(ip2)
      expect(detected2).toBe(false)
    })
  })
  
  describe('detectSuspiciousPattern', () => {
    it('should detect rapid API calls pattern', async () => {
      const ip = '192.168.1.1'
      const event = {
        type: 'rapid_api_calls',
        ip,
        details: {}
      }
      
      // First 99 calls should not trigger
      for (let i = 0; i < 99; i++) {
        const detected = await ids.detectSuspiciousPattern(event)
        expect(detected).toBe(false)
      }
      
      // 100th call should trigger
      const detected = await ids.detectSuspiciousPattern(event)
      expect(detected).toBe(true)
    })
    
    it('should return false for unknown pattern types', async () => {
      const event = {
        type: 'unknown_pattern',
        ip: '192.168.1.1',
        details: {}
      }
      
      const detected = await ids.detectSuspiciousPattern(event)
      expect(detected).toBe(false)
    })
  })
  
  describe('blockIP', () => {
    it('should insert blocked IP into database', async () => {
      const ip = '192.168.1.1'
      const duration = 900 // 15 minutes
      const reason = 'Brute force detected'
      
      await ids.blockIP(ip, duration, reason)
      
      expect(mockSupabase.from).toHaveBeenCalledWith('blocked_entities')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'ip',
          entity_identifier: ip,
          reason,
          expires_at: expect.any(String)
        })
      )
    })
    
    it('should calculate correct expiration time', async () => {
      const ip = '192.168.1.1'
      const duration = 900 // 15 minutes
      const reason = 'Brute force detected'
      
      const beforeBlock = Date.now()
      await ids.blockIP(ip, duration, reason)
      const afterBlock = Date.now()
      
      const insertCall = mockSupabase.insert.mock.calls[0][0]
      const expiresAt = new Date(insertCall.expires_at).getTime()
      
      // Should expire approximately 15 minutes from now
      expect(expiresAt).toBeGreaterThanOrEqual(beforeBlock + duration * 1000)
      expect(expiresAt).toBeLessThanOrEqual(afterBlock + duration * 1000)
    })
  })
  
  describe('blockUser', () => {
    it('should insert blocked user into database', async () => {
      const userId = 'user-123'
      const duration = 900 // 15 minutes
      const reason = 'Suspicious activity'
      
      await ids.blockUser(userId, duration, reason)
      
      expect(mockSupabase.from).toHaveBeenCalledWith('blocked_entities')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'user',
          entity_identifier: userId,
          reason,
          expires_at: expect.any(String)
        })
      )
    })
  })
  
  describe('isBlocked', () => {
    it('should return true when IP is blocked', async () => {
      const ip = '192.168.1.1'
      
      // Mock database response with active block
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: '123',
          entity_type: 'ip',
          entity_identifier: ip,
          expires_at: new Date(Date.now() + 900000).toISOString()
        },
        error: null
      })
      
      const blocked = await ids.isBlocked('ip', ip)
      expect(blocked).toBe(true)
    })
    
    it('should return false when IP is not blocked', async () => {
      const ip = '192.168.1.1'
      
      // Mock database response with no block
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })
      
      const blocked = await ids.isBlocked('ip', ip)
      expect(blocked).toBe(false)
    })
    
    it('should return true when user is blocked', async () => {
      const userId = 'user-123'
      
      // Mock database response with active block
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: '123',
          entity_type: 'user',
          entity_identifier: userId,
          expires_at: new Date(Date.now() + 900000).toISOString()
        },
        error: null
      })
      
      const blocked = await ids.isBlocked('user', userId)
      expect(blocked).toBe(true)
    })
    
    it('should query database with correct filters', async () => {
      const ip = '192.168.1.1'
      
      await ids.isBlocked('ip', ip)
      
      expect(mockSupabase.from).toHaveBeenCalledWith('blocked_entities')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('entity_type', 'ip')
      expect(mockSupabase.eq).toHaveBeenCalledWith('entity_identifier', ip)
      expect(mockSupabase.gt).toHaveBeenCalledWith('expires_at', expect.any(String))
    })
  })
  
  describe('logThreatEvent', () => {
    it('should insert threat event into database', async () => {
      const event: ThreatEvent = {
        type: 'brute_force',
        severity: 'high',
        ip: '192.168.1.1',
        userId: 'user-123',
        tenantId: 'tenant-456',
        details: { attempts: 5 },
        timestamp: new Date().toISOString()
      }
      
      await ids.logThreatEvent(event)
      
      expect(mockSupabase.from).toHaveBeenCalledWith('security_events')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: event.type,
          severity: event.severity,
          ip_address: event.ip,
          user_id: event.userId,
          tenant_id: event.tenantId,
          details: event.details,
          created_at: event.timestamp
        })
      )
    })
    
    it('should handle optional fields', async () => {
      const event: ThreatEvent = {
        type: 'suspicious_pattern',
        severity: 'medium',
        ip: '192.168.1.1',
        details: {},
        timestamp: new Date().toISOString()
      }
      
      await ids.logThreatEvent(event)
      
      const insertCall = mockSupabase.insert.mock.calls[0][0]
      expect(insertCall.user_id).toBeNull()
      expect(insertCall.tenant_id).toBeNull()
    })
  })
  
  describe('getActiveThreats', () => {
    it('should fetch threats from last 24 hours', async () => {
      const mockThreats = [
        {
          id: '1',
          event_type: 'brute_force',
          severity: 'high',
          ip_address: '192.168.1.1',
          user_id: 'user-123',
          tenant_id: 'tenant-456',
          details: { attempts: 5 },
          created_at: new Date().toISOString()
        }
      ]
      
      mockSupabase.limit.mockResolvedValueOnce({
        data: mockThreats,
        error: null
      })
      
      const threats = await ids.getActiveThreats()
      
      expect(mockSupabase.from).toHaveBeenCalledWith('security_events')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', expect.any(String))
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockSupabase.limit).toHaveBeenCalledWith(100)
      
      expect(threats).toHaveLength(1)
      expect(threats[0]).toMatchObject({
        type: 'brute_force',
        severity: 'high',
        ip: '192.168.1.1',
        userId: 'user-123',
        tenantId: 'tenant-456'
      })
    })
    
    it('should return empty array on error', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      })
      
      const threats = await ids.getActiveThreats()
      expect(threats).toEqual([])
    })
  })
})
