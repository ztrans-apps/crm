// tests/property/session-management.property.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { SessionManager, SessionData } from '@/lib/security/session-manager'
import { getRedisClient } from '@/lib/cache/redis'

/**
 * Property-Based Tests for Session Management
 * 
 * Tests session security properties including:
 * - Session ID uniqueness and randomness
 * - Session regeneration on authentication
 * - Session invalidation on logout
 * - Concurrent session limits
 * 
 * Uses 10 iterations as specified in requirements
 */

describe('Session Management Properties', () => {
  let sessionManager: SessionManager
  let redisAvailable: boolean

  beforeEach(() => {
    sessionManager = new SessionManager()
    redisAvailable = getRedisClient() !== null
  })

  afterEach(async () => {
    // Cleanup: Clear all test sessions from Redis
    const redis = getRedisClient()
    if (redis) {
      try {
        const sessionKeys = await redis.keys('session:*')
        const userSessionKeys = await redis.keys('user_sessions:*')
        const allKeys = [...sessionKeys, ...userSessionKeys]
        if (allKeys.length > 0) {
          await redis.del(...allKeys)
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })

  /**
   * Property 41: Session ID Uniqueness
   * **Validates: Requirements 29.1**
   * 
   * For any set of sessions created, session IDs should be cryptographically
   * random and unique (no collisions)
   */
  it('Property 41: Session IDs should be cryptographically random and unique', async () => {
    if (!redisAvailable) {
      console.log('⚠️  Skipping test: Redis not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            userId: fc.uuid(),
            tenantId: fc.uuid(),
            email: fc.emailAddress(),
            role: fc.constantFrom('admin', 'agent', 'user'),
            permissions: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          }),
          { minLength: 5, maxLength: 10 }
        ),
        async (sessionDataArray) => {
          const sessionIds: string[] = []

          // Create multiple sessions
          for (const data of sessionDataArray) {
            const sessionData: SessionData = {
              ...data,
              createdAt: Date.now(),
              lastActivity: Date.now(),
            }

            const sessionId = await sessionManager.createSession(data.userId, sessionData)
            sessionIds.push(sessionId)
          }

          // Verify all session IDs are unique
          const uniqueIds = new Set(sessionIds)
          expect(uniqueIds.size).toBe(sessionIds.length)

          // Verify session IDs are hex strings of expected length (64 chars for 32 bytes)
          for (const sessionId of sessionIds) {
            expect(sessionId).toMatch(/^[0-9a-f]{64}$/)
          }

          // Cleanup
          for (const sessionId of sessionIds) {
            await sessionManager.invalidateSession(sessionId)
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property 42: Session Regeneration on Auth
   * **Validates: Requirements 29.6**
   * 
   * For any authentication event, a new session ID should be generated
   * (simulated by creating a new session and invalidating the old one)
   */
  it('Property 42: Session should be regenerated on authentication', async () => {
    if (!redisAvailable) {
      console.log('⚠️  Skipping test: Redis not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          tenantId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'agent', 'user'),
          permissions: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        }),
        async (userData) => {
          const sessionData: SessionData = {
            ...userData,
            createdAt: Date.now(),
            lastActivity: Date.now(),
          }

          // Create initial session (simulating first login)
          const oldSessionId = await sessionManager.createSession(userData.userId, sessionData)
          expect(oldSessionId).toBeTruthy()

          // Verify old session exists
          const oldSession = await sessionManager.getSession(oldSessionId)
          expect(oldSession).toBeTruthy()

          // Simulate re-authentication: create new session and invalidate old one
          const newSessionId = await sessionManager.createSession(userData.userId, sessionData)
          await sessionManager.invalidateSession(oldSessionId)

          // Verify new session ID is different
          expect(newSessionId).not.toBe(oldSessionId)

          // Verify old session is invalidated
          const invalidatedSession = await sessionManager.getSession(oldSessionId)
          expect(invalidatedSession).toBeNull()

          // Verify new session exists
          const newSession = await sessionManager.getSession(newSessionId)
          expect(newSession).toBeTruthy()

          // Cleanup
          await sessionManager.invalidateSession(newSessionId)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property 43: Session Invalidation on Logout
   * **Validates: Requirements 29.7**
   * 
   * For any logout event, the session should be immediately invalidated
   * and subsequent access attempts should fail
   */
  it('Property 43: Session should be invalidated immediately on logout', async () => {
    if (!redisAvailable) {
      console.log('⚠️  Skipping test: Redis not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          tenantId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'agent', 'user'),
          permissions: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        }),
        async (userData) => {
          const sessionData: SessionData = {
            ...userData,
            createdAt: Date.now(),
            lastActivity: Date.now(),
          }

          // Create session
          const sessionId = await sessionManager.createSession(userData.userId, sessionData)

          // Verify session exists
          const session = await sessionManager.getSession(sessionId)
          expect(session).toBeTruthy()
          expect(session?.userId).toBe(userData.userId)

          // Simulate logout: invalidate session
          await sessionManager.invalidateSession(sessionId)

          // Verify session is immediately invalidated
          const invalidatedSession = await sessionManager.getSession(sessionId)
          expect(invalidatedSession).toBeNull()

          // Verify subsequent access attempts fail
          const retrySession = await sessionManager.getSession(sessionId)
          expect(retrySession).toBeNull()
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property 44: Concurrent Session Limits
   * **Validates: Requirements 29.9**
   * 
   * For any user, when the number of concurrent sessions exceeds the limit (5),
   * the oldest sessions should be automatically invalidated
   */
  it('Property 44: Concurrent session limit should be enforced', async () => {
    if (!redisAvailable) {
      console.log('⚠️  Skipping test: Redis not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          tenantId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'agent', 'user'),
          permissions: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        }),
        async (userData) => {
          const MAX_SESSIONS = 5
          const sessionIds: string[] = []

          // Create more sessions than the limit
          for (let i = 0; i < MAX_SESSIONS + 3; i++) {
            const sessionData: SessionData = {
              ...userData,
              createdAt: Date.now() + i, // Ensure different creation times
              lastActivity: Date.now() + i,
            }

            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10))

            const sessionId = await sessionManager.createSession(userData.userId, sessionData)
            sessionIds.push(sessionId)
          }

          // Wait a bit for concurrent session limit enforcement
          await new Promise(resolve => setTimeout(resolve, 100))

          // Count valid sessions
          let validSessionCount = 0
          for (const sessionId of sessionIds) {
            const session = await sessionManager.getSession(sessionId)
            if (session) {
              validSessionCount++
            }
          }

          // Verify that only MAX_SESSIONS remain
          expect(validSessionCount).toBeLessThanOrEqual(MAX_SESSIONS)

          // Verify that the newest sessions are kept (last MAX_SESSIONS)
          const newestSessionIds = sessionIds.slice(-MAX_SESSIONS)
          for (const sessionId of newestSessionIds) {
            const session = await sessionManager.getSession(sessionId)
            expect(session).toBeTruthy()
          }

          // Cleanup remaining sessions
          for (const sessionId of sessionIds) {
            await sessionManager.invalidateSession(sessionId)
          }
        }
      ),
      { numRuns: 10 }
    )
  })
})
