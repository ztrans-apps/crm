// lib/security/session-manager.ts
import { getRedisClient } from '@/lib/cache/redis'
import { randomBytes } from 'crypto'

/**
 * Session data stored in Redis
 */
export interface SessionData {
  userId: string
  tenantId: string
  email: string
  role: string
  permissions: string[]
  createdAt: number
  lastActivity: number
}

/**
 * Session configuration
 */
const SESSION_CONFIG = {
  INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  ABSOLUTE_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_CONCURRENT_SESSIONS: 5,
  SESSION_ID_BYTES: 32,
  KEY_PREFIX: 'session',
  USER_SESSIONS_PREFIX: 'user_sessions',
}

/**
 * Session Manager
 * Manages user sessions with Redis storage and encryption
 * 
 * Features:
 * - Cryptographically secure session IDs
 * - Inactivity timeout (30 minutes)
 * - Absolute timeout (24 hours)
 * - Concurrent session limits (5 per user)
 * - Session cleanup
 * 
 * Requirements: 29.1, 29.4, 29.5, 29.7, 29.8
 */
export class SessionManager {
  /**
   * Create a new session
   * Generates a cryptographically secure session ID and stores session data in Redis
   * 
   * @param userId - User ID
   * @param data - Session data
   * @returns Session ID
   */
  async createSession(userId: string, data: SessionData): Promise<string> {
    const redis = getRedisClient()
    
    // Generate cryptographically secure session ID
    const sessionId = this.generateSessionId()
    
    // Set timestamps
    const now = Date.now()
    const sessionData: SessionData = {
      ...data,
      userId,
      createdAt: data.createdAt || now,
      lastActivity: data.lastActivity || now,
    }
    
    // Store session in Redis with absolute timeout
    const sessionKey = this.getSessionKey(sessionId)
    const ttlSeconds = Math.floor(SESSION_CONFIG.ABSOLUTE_TIMEOUT / 1000)
    
    if (redis) {
      try {
        await redis.setex(sessionKey, ttlSeconds, JSON.stringify(sessionData))
        
        // Track user sessions for concurrent session limit enforcement
        await this.addUserSession(userId, sessionId)
        
        // Enforce concurrent session limits
        await this.enforceConcurrentSessionLimit(userId)
      } catch (error) {
        console.error('Failed to create session in Redis:', error)
        // Graceful degradation: continue without Redis
      }
    }
    
    return sessionId
  }

  /**
   * Get session data
   * 
   * @param sessionId - Session ID
   * @returns Session data or null if not found/expired
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const redis = getRedisClient()
    if (!redis) return null
    
    try {
      const sessionKey = this.getSessionKey(sessionId)
      const data = await redis.get<string>(sessionKey)
      
      if (!data) {
        return null
      }
      
      const sessionData: SessionData = typeof data === 'string' ? JSON.parse(data) : data
      
      // Check inactivity timeout
      const now = Date.now()
      const inactivityDuration = now - sessionData.lastActivity
      
      if (inactivityDuration > SESSION_CONFIG.INACTIVITY_TIMEOUT) {
        // Session expired due to inactivity
        await this.invalidateSession(sessionId)
        return null
      }
      
      // Check absolute timeout
      const sessionDuration = now - sessionData.createdAt
      if (sessionDuration > SESSION_CONFIG.ABSOLUTE_TIMEOUT) {
        // Session expired due to absolute timeout
        await this.invalidateSession(sessionId)
        return null
      }
      
      return sessionData
    } catch (error) {
      console.error('Failed to get session from Redis:', error)
      return null
    }
  }

  /**
   * Update session activity timestamp
   * Extends the session by updating the last activity time
   * 
   * @param sessionId - Session ID
   */
  async updateActivity(sessionId: string): Promise<void> {
    const redis = getRedisClient()
    if (!redis) return
    
    try {
      const sessionData = await this.getSession(sessionId)
      if (!sessionData) return
      
      // Update last activity timestamp
      sessionData.lastActivity = Date.now()
      
      // Calculate remaining TTL based on absolute timeout
      const sessionAge = Date.now() - sessionData.createdAt
      const remainingTtl = Math.max(
        0,
        Math.floor((SESSION_CONFIG.ABSOLUTE_TIMEOUT - sessionAge) / 1000)
      )
      
      if (remainingTtl > 0) {
        const sessionKey = this.getSessionKey(sessionId)
        await redis.setex(sessionKey, remainingTtl, JSON.stringify(sessionData))
      } else {
        // Session has exceeded absolute timeout
        await this.invalidateSession(sessionId)
      }
    } catch (error) {
      console.error('Failed to update session activity:', error)
    }
  }

  /**
   * Invalidate a session
   * Removes session from Redis and user session tracking
   * 
   * @param sessionId - Session ID
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const redis = getRedisClient()
    if (!redis) return
    
    try {
      // Get session data to find user ID
      const sessionData = await this.getSession(sessionId)
      
      // Delete session
      const sessionKey = this.getSessionKey(sessionId)
      await redis.del(sessionKey)
      
      // Remove from user sessions tracking
      if (sessionData) {
        await this.removeUserSession(sessionData.userId, sessionId)
      }
    } catch (error) {
      console.error('Failed to invalidate session:', error)
    }
  }

  /**
   * Invalidate all sessions for a user
   * Useful for logout from all devices or security incidents
   * 
   * @param userId - User ID
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    const redis = getRedisClient()
    if (!redis) return
    
    try {
      // Get all session IDs for the user
      const sessionIds = await this.getUserSessions(userId)
      
      // Delete each session
      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(sessionId)
        await redis.del(sessionKey)
      }
      
      // Clear user sessions tracking
      const userSessionsKey = this.getUserSessionsKey(userId)
      await redis.del(userSessionsKey)
    } catch (error) {
      console.error('Failed to invalidate user sessions:', error)
    }
  }

  /**
   * Cleanup expired sessions
   * Should be run periodically (e.g., via cron job)
   */
  async cleanupExpiredSessions(): Promise<void> {
    const redis = getRedisClient()
    if (!redis) return
    
    try {
      // Redis automatically expires keys with TTL, so we just need to clean up
      // user session tracking for sessions that no longer exist
      
      // Get all user session keys
      const userSessionKeys = await redis.keys(`${SESSION_CONFIG.USER_SESSIONS_PREFIX}:*`)
      
      for (const userSessionsKey of userSessionKeys) {
        const sessionIds = await redis.smembers<string[]>(userSessionsKey)
        
        // Check each session and remove if it doesn't exist
        for (const sessionId of sessionIds) {
          const sessionKey = this.getSessionKey(sessionId)
          const exists = await redis.exists(sessionKey)
          
          if (!exists) {
            // Remove from user sessions tracking
            await redis.srem(userSessionsKey, sessionId)
          }
        }
        
        // If no sessions remain, delete the user sessions key
        const remainingCount = await redis.scard(userSessionsKey)
        if (remainingCount === 0) {
          await redis.del(userSessionsKey)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error)
    }
  }

  /**
   * Generate cryptographically secure session ID
   * 
   * @returns Session ID (hex string)
   */
  private generateSessionId(): string {
    return randomBytes(SESSION_CONFIG.SESSION_ID_BYTES).toString('hex')
  }

  /**
   * Get Redis key for session
   * 
   * @param sessionId - Session ID
   * @returns Redis key
   */
  private getSessionKey(sessionId: string): string {
    return `${SESSION_CONFIG.KEY_PREFIX}:${sessionId}`
  }

  /**
   * Get Redis key for user sessions tracking
   * 
   * @param userId - User ID
   * @returns Redis key
   */
  private getUserSessionsKey(userId: string): string {
    return `${SESSION_CONFIG.USER_SESSIONS_PREFIX}:${userId}`
  }

  /**
   * Add session to user sessions tracking
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   */
  private async addUserSession(userId: string, sessionId: string): Promise<void> {
    const redis = getRedisClient()
    if (!redis) return
    
    try {
      const userSessionsKey = this.getUserSessionsKey(userId)
      await redis.sadd(userSessionsKey, sessionId)
      
      // Set TTL on user sessions key to match absolute timeout
      const ttlSeconds = Math.floor(SESSION_CONFIG.ABSOLUTE_TIMEOUT / 1000)
      await redis.expire(userSessionsKey, ttlSeconds)
    } catch (error) {
      console.error('Failed to add user session:', error)
    }
  }

  /**
   * Remove session from user sessions tracking
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   */
  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const redis = getRedisClient()
    if (!redis) return
    
    try {
      const userSessionsKey = this.getUserSessionsKey(userId)
      await redis.srem(userSessionsKey, sessionId)
    } catch (error) {
      console.error('Failed to remove user session:', error)
    }
  }

  /**
   * Get all session IDs for a user
   * 
   * @param userId - User ID
   * @returns Array of session IDs
   */
  private async getUserSessions(userId: string): Promise<string[]> {
    const redis = getRedisClient()
    if (!redis) return []
    
    try {
      const userSessionsKey = this.getUserSessionsKey(userId)
      return await redis.smembers<string[]>(userSessionsKey)
    } catch (error) {
      console.error('Failed to get user sessions:', error)
      return []
    }
  }

  /**
   * Enforce concurrent session limit
   * Removes oldest sessions if limit is exceeded
   * 
   * @param userId - User ID
   */
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const redis = getRedisClient()
    if (!redis) return
    
    try {
      const sessionIds = await this.getUserSessions(userId)
      
      if (sessionIds.length <= SESSION_CONFIG.MAX_CONCURRENT_SESSIONS) {
        return
      }
      
      // Get session data for all sessions to find oldest ones
      const sessions: Array<{ sessionId: string; createdAt: number }> = []
      
      for (const sessionId of sessionIds) {
        const sessionData = await this.getSession(sessionId)
        if (sessionData) {
          sessions.push({
            sessionId,
            createdAt: sessionData.createdAt,
          })
        }
      }
      
      // Sort by creation time (oldest first)
      sessions.sort((a, b) => a.createdAt - b.createdAt)
      
      // Remove oldest sessions to get back to limit
      const sessionsToRemove = sessions.length - SESSION_CONFIG.MAX_CONCURRENT_SESSIONS
      for (let i = 0; i < sessionsToRemove; i++) {
        await this.invalidateSession(sessions[i].sessionId)
      }
    } catch (error) {
      console.error('Failed to enforce concurrent session limit:', error)
    }
  }
}

/**
 * Singleton instance
 */
export const sessionManager = new SessionManager()
