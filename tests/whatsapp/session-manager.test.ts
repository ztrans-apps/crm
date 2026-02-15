/**
 * WhatsApp Session Manager Tests
 * Test session registration, isolation, and management
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Mock SessionManager class
class MockSessionManager {
  private sessions = new Map()
  private tenantSessions = new Map()

  getSessionKey(tenantId: string, sessionId: string) {
    return `${tenantId}:${sessionId}`
  }

  registerSession(tenantId: string, sessionId: string, sessionData: any) {
    const sessionKey = this.getSessionKey(tenantId, sessionId)
    
    this.sessions.set(sessionKey, {
      ...sessionData,
      tenantId,
      sessionId,
      registeredAt: new Date(),
      status: 'active',
    })
    
    if (!this.tenantSessions.has(tenantId)) {
      this.tenantSessions.set(tenantId, new Set())
    }
    this.tenantSessions.get(tenantId).add(sessionId)
  }

  getSession(tenantId: string, sessionId: string) {
    const sessionKey = this.getSessionKey(tenantId, sessionId)
    return this.sessions.get(sessionKey)
  }

  getTenantSessions(tenantId: string) {
    const sessionIds = this.tenantSessions.get(tenantId) || new Set()
    const sessions = []
    
    for (const sessionId of sessionIds) {
      const session = this.getSession(tenantId, sessionId)
      if (session) {
        sessions.push(session)
      }
    }
    
    return sessions
  }

  unregisterSession(tenantId: string, sessionId: string) {
    const sessionKey = this.getSessionKey(tenantId, sessionId)
    this.sessions.delete(sessionKey)
    
    if (this.tenantSessions.has(tenantId)) {
      this.tenantSessions.get(tenantId).delete(sessionId)
      
      if (this.tenantSessions.get(tenantId).size === 0) {
        this.tenantSessions.delete(tenantId)
      }
    }
  }

  getAllSessions() {
    return Array.from(this.sessions.values())
  }
}

describe('WhatsApp Session Manager', () => {
  let sessionManager: MockSessionManager

  beforeEach(() => {
    sessionManager = new MockSessionManager()
  })

  describe('Session Registration', () => {
    it('should register a new session', () => {
      const tenantId = 'tenant-1'
      const sessionId = 'session-1'
      const sessionData = { sock: {}, phoneNumber: '+6281234567890' }

      sessionManager.registerSession(tenantId, sessionId, sessionData)

      const session = sessionManager.getSession(tenantId, sessionId)

      expect(session).toBeDefined()
      expect(session.tenantId).toBe(tenantId)
      expect(session.sessionId).toBe(sessionId)
      expect(session.status).toBe('active')
    })

    it('should generate correct session key', () => {
      const tenantId = 'tenant-1'
      const sessionId = 'session-1'

      const key = sessionManager.getSessionKey(tenantId, sessionId)

      expect(key).toBe('tenant-1:session-1')
    })

    it('should track tenant sessions', () => {
      sessionManager.registerSession('tenant-1', 'session-1', {})
      sessionManager.registerSession('tenant-1', 'session-2', {})

      const sessions = sessionManager.getTenantSessions('tenant-1')

      expect(sessions).toHaveLength(2)
    })
  })

  describe('Session Isolation', () => {
    it('should isolate sessions by tenant', () => {
      sessionManager.registerSession('tenant-1', 'session-1', { data: 'tenant1' })
      sessionManager.registerSession('tenant-2', 'session-1', { data: 'tenant2' })

      const session1 = sessionManager.getSession('tenant-1', 'session-1')
      const session2 = sessionManager.getSession('tenant-2', 'session-1')

      expect(session1.data).toBe('tenant1')
      expect(session2.data).toBe('tenant2')
      expect(session1).not.toEqual(session2)
    })

    it('should not leak sessions between tenants', () => {
      sessionManager.registerSession('tenant-1', 'session-1', {})

      const session = sessionManager.getSession('tenant-2', 'session-1')

      expect(session).toBeUndefined()
    })
  })

  describe('Session Retrieval', () => {
    it('should retrieve session by tenant and session ID', () => {
      const sessionData = { phoneNumber: '+6281234567890' }
      sessionManager.registerSession('tenant-1', 'session-1', sessionData)

      const session = sessionManager.getSession('tenant-1', 'session-1')

      expect(session).toBeDefined()
      expect(session.phoneNumber).toBe('+6281234567890')
    })

    it('should return undefined for non-existent session', () => {
      const session = sessionManager.getSession('tenant-1', 'non-existent')

      expect(session).toBeUndefined()
    })

    it('should get all sessions for a tenant', () => {
      sessionManager.registerSession('tenant-1', 'session-1', {})
      sessionManager.registerSession('tenant-1', 'session-2', {})
      sessionManager.registerSession('tenant-2', 'session-3', {})

      const tenant1Sessions = sessionManager.getTenantSessions('tenant-1')
      const tenant2Sessions = sessionManager.getTenantSessions('tenant-2')

      expect(tenant1Sessions).toHaveLength(2)
      expect(tenant2Sessions).toHaveLength(1)
    })
  })

  describe('Session Unregistration', () => {
    it('should unregister a session', () => {
      sessionManager.registerSession('tenant-1', 'session-1', {})

      sessionManager.unregisterSession('tenant-1', 'session-1')

      const session = sessionManager.getSession('tenant-1', 'session-1')

      expect(session).toBeUndefined()
    })

    it('should clean up tenant entry when last session removed', () => {
      sessionManager.registerSession('tenant-1', 'session-1', {})

      sessionManager.unregisterSession('tenant-1', 'session-1')

      const sessions = sessionManager.getTenantSessions('tenant-1')

      expect(sessions).toHaveLength(0)
    })

    it('should not affect other tenant sessions', () => {
      sessionManager.registerSession('tenant-1', 'session-1', {})
      sessionManager.registerSession('tenant-2', 'session-2', {})

      sessionManager.unregisterSession('tenant-1', 'session-1')

      const tenant2Session = sessionManager.getSession('tenant-2', 'session-2')

      expect(tenant2Session).toBeDefined()
    })
  })

  describe('Get All Sessions', () => {
    it('should return all sessions across tenants', () => {
      sessionManager.registerSession('tenant-1', 'session-1', {})
      sessionManager.registerSession('tenant-1', 'session-2', {})
      sessionManager.registerSession('tenant-2', 'session-3', {})

      const allSessions = sessionManager.getAllSessions()

      expect(allSessions).toHaveLength(3)
    })

    it('should return empty array when no sessions', () => {
      const allSessions = sessionManager.getAllSessions()

      expect(allSessions).toHaveLength(0)
      expect(allSessions).toEqual([])
    })
  })
})
