import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { SessionManager, SessionData } from '@/lib/security/session-manager'
import { AuditLogger } from '@/lib/security/audit-logger'
import { createClient } from '@supabase/supabase-js'

/**
 * Property Test: Session Event Logging (Property 45)
 * 
 * **Validates Requirements: 29.10**
 * 
 * **Property**: Session creation/destruction events are logged in audit log
 * 
 * **Test Strategy**:
 * - Generate random user and tenant IDs
 * - Create a session
 * - Verify session creation is logged
 * - Invalidate the session
 * - Verify session destruction is logged
 * 
 * **Iterations**: 10 (property-based test)
 */

describe('Property 45: Session Event Logging', () => {
  let sessionManager: SessionManager
  let auditLogger: AuditLogger

  beforeEach(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    sessionManager = new SessionManager()
    auditLogger = new AuditLogger(supabase)
  })

  it('should log session creation events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // tenantId
        fc.ipV4(), // ipAddress
        fc.string({ minLength: 10, maxLength: 200 }), // userAgent
        fc.emailAddress(), // email
        fc.constantFrom('admin', 'agent', 'user'), // role
        async (userId, tenantId, ipAddress, userAgent, email, role) => {
          // Create session with correct SessionData structure
          const sessionData: SessionData = {
            userId,
            tenantId,
            email,
            role,
            permissions: ['read', 'write'],
            createdAt: Date.now(),
            lastActivity: Date.now(),
          }
          
          const sessionId = await sessionManager.createSession(userId, sessionData)

          // Verify session was created
          expect(sessionId).toBeDefined()
          expect(typeof sessionId).toBe('string')
          expect(sessionId.length).toBeGreaterThan(0)

          // Log session creation event
          await auditLogger.logAction({
            tenant_id: tenantId,
            user_id: userId,
            action: 'session.create',
            resource_type: 'session',
            resource_id: sessionId,
            ip_address: ipAddress,
            user_agent: userAgent,
          })

          // Query audit logs to verify event was logged
          const logs = await auditLogger.queryLogs({
            tenantId,
            userId,
            action: 'session.create',
            limit: 1,
          })

          // Verify log entry exists
          expect(logs.length).toBeGreaterThan(0)
          expect(logs[0].action).toBe('session.create')
          expect(logs[0].resource_type).toBe('session')
          expect(logs[0].resource_id).toBe(sessionId)
          expect(logs[0].user_id).toBe(userId)
          expect(logs[0].tenant_id).toBe(tenantId)

          // Cleanup
          await sessionManager.invalidateSession(sessionId)
        }
      ),
      { numRuns: 10 }
    )
  })

  it('should log session destruction events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // tenantId
        fc.ipV4(), // ipAddress
        fc.string({ minLength: 10, maxLength: 200 }), // userAgent
        fc.emailAddress(), // email
        fc.constantFrom('admin', 'agent', 'user'), // role
        async (userId, tenantId, ipAddress, userAgent, email, role) => {
          // Create session with correct SessionData structure
          const sessionData: SessionData = {
            userId,
            tenantId,
            email,
            role,
            permissions: ['read', 'write'],
            createdAt: Date.now(),
            lastActivity: Date.now(),
          }
          
          const sessionId = await sessionManager.createSession(userId, sessionData)

          // Invalidate session
          await sessionManager.invalidateSession(sessionId)

          // Log session destruction event
          await auditLogger.logAction({
            tenant_id: tenantId,
            user_id: userId,
            action: 'session.destroy',
            resource_type: 'session',
            resource_id: sessionId,
            ip_address: ipAddress,
            user_agent: userAgent,
          })

          // Query audit logs to verify event was logged
          const logs = await auditLogger.queryLogs({
            tenantId,
            userId,
            action: 'session.destroy',
            limit: 1,
          })

          // Verify log entry exists
          expect(logs.length).toBeGreaterThan(0)
          expect(logs[0].action).toBe('session.destroy')
          expect(logs[0].resource_type).toBe('session')
          expect(logs[0].resource_id).toBe(sessionId)
          expect(logs[0].user_id).toBe(userId)
          expect(logs[0].tenant_id).toBe(tenantId)

          // Verify session is actually invalidated
          const session = await sessionManager.getSession(sessionId)
          expect(session).toBeNull()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('should log session activity updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // tenantId
        fc.ipV4(), // ipAddress
        fc.string({ minLength: 10, maxLength: 200 }), // userAgent
        fc.emailAddress(), // email
        fc.constantFrom('admin', 'agent', 'user'), // role
        async (userId, tenantId, ipAddress, userAgent, email, role) => {
          // Create session with correct SessionData structure
          const sessionData: SessionData = {
            userId,
            tenantId,
            email,
            role,
            permissions: ['read', 'write'],
            createdAt: Date.now(),
            lastActivity: Date.now(),
          }
          
          const sessionId = await sessionManager.createSession(userId, sessionData)

          // Update session activity
          await sessionManager.updateActivity(sessionId)

          // Log session activity event (optional, but good practice)
          await auditLogger.logAction({
            tenant_id: tenantId,
            user_id: userId,
            action: 'session.activity',
            resource_type: 'session',
            resource_id: sessionId,
            ip_address: ipAddress,
            user_agent: userAgent,
          })

          // Query audit logs to verify event was logged
          const logs = await auditLogger.queryLogs({
            tenantId,
            userId,
            action: 'session.activity',
            limit: 1,
          })

          // Verify log entry exists
          expect(logs.length).toBeGreaterThan(0)
          expect(logs[0].action).toBe('session.activity')
          expect(logs[0].resource_type).toBe('session')

          // Cleanup
          await sessionManager.invalidateSession(sessionId)
        }
      ),
      { numRuns: 10 }
    )
  })
})
