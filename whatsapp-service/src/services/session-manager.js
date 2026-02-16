/**
 * Multi-Tenant Session Manager for Baileys WhatsApp
 * Handles session isolation, load balancing, and health monitoring
 */

import { supabase } from '../config/supabase.js'

class SessionManager {
  constructor() {
    this.sessions = new Map() // sessionKey (tenantId:sessionId) -> session data
    this.tenantSessions = new Map() // tenantId -> Set of sessionIds
    this.healthCheckInterval = 30000 // 30 seconds
    this.healthCheckTimer = null
    
    // Start health monitoring
    this.startHealthMonitoring()
  }

  /**
   * Generate session key
   */
  getSessionKey(tenantId, sessionId) {
    return `${tenantId}:${sessionId}`
  }

  /**
   * Register a session
   */
  registerSession(tenantId, sessionId, sessionData) {
    const sessionKey = this.getSessionKey(tenantId, sessionId)
    
    // Store session
    this.sessions.set(sessionKey, {
      ...sessionData,
      tenantId,
      sessionId,
      registeredAt: new Date(),
      lastActivity: new Date(),
      status: 'active',
      messageCount: 0,
      errorCount: 0
    })
    
    // Track tenant sessions
    if (!this.tenantSessions.has(tenantId)) {
      this.tenantSessions.set(tenantId, new Set())
    }
    this.tenantSessions.get(tenantId).add(sessionId)
    
    console.log(`[SessionManager] Registered session: ${sessionKey}`)
    console.log(`[SessionManager] Tenant ${tenantId} now has ${this.tenantSessions.get(tenantId).size} session(s)`)
  }

  /**
   * Unregister a session
   */
  unregisterSession(tenantId, sessionId) {
    const sessionKey = this.getSessionKey(tenantId, sessionId)
    
    // Remove session
    this.sessions.delete(sessionKey)
    
    // Remove from tenant sessions
    if (this.tenantSessions.has(tenantId)) {
      this.tenantSessions.get(tenantId).delete(sessionId)
      
      // Clean up empty tenant entry
      if (this.tenantSessions.get(tenantId).size === 0) {
        this.tenantSessions.delete(tenantId)
      }
    }
    
    console.log(`[SessionManager] Unregistered session: ${sessionKey}`)
  }

  /**
   * Get session
   */
  getSession(tenantId, sessionId) {
    const sessionKey = this.getSessionKey(tenantId, sessionId)
    return this.sessions.get(sessionKey)
  }

  /**
   * Get all sessions for a tenant
   */
  getTenantSessions(tenantId) {
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

  /**
   * Get active sessions for a tenant
   */
  getActiveTenantSessions(tenantId) {
    return this.getTenantSessions(tenantId).filter(s => s.status === 'active')
  }

  /**
   * Get best session for tenant (load balancing)
   * Returns session with lowest message count
   */
  getBestSessionForTenant(tenantId) {
    const activeSessions = this.getActiveTenantSessions(tenantId)
    
    if (activeSessions.length === 0) {
      return null
    }
    
    // Sort by message count (ascending)
    activeSessions.sort((a, b) => a.messageCount - b.messageCount)
    
    return activeSessions[0]
  }

  /**
   * Update session activity
   */
  updateActivity(tenantId, sessionId, type = 'message') {
    const session = this.getSession(tenantId, sessionId)
    
    if (session) {
      session.lastActivity = new Date()
      
      if (type === 'message') {
        session.messageCount++
      } else if (type === 'error') {
        session.errorCount++
      }
    }
  }

  /**
   * Update session status
   */
  updateStatus(tenantId, sessionId, status) {
    const session = this.getSession(tenantId, sessionId)
    
    if (session) {
      session.status = status
      session.lastActivity = new Date()
      
      console.log(`[SessionManager] Session ${tenantId}:${sessionId} status: ${status}`)
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values())
  }

  /**
   * Get session statistics
   */
  getStatistics() {
    const allSessions = this.getAllSessions()
    
    return {
      totalSessions: allSessions.length,
      activeSessions: allSessions.filter(s => s.status === 'active').length,
      inactiveSessions: allSessions.filter(s => s.status !== 'active').length,
      totalTenants: this.tenantSessions.size,
      totalMessages: allSessions.reduce((sum, s) => sum + s.messageCount, 0),
      totalErrors: allSessions.reduce((sum, s) => sum + s.errorCount, 0),
      byTenant: Array.from(this.tenantSessions.entries()).map(([tenantId, sessionIds]) => ({
        tenantId,
        sessionCount: sessionIds.size,
        activeSessions: this.getActiveTenantSessions(tenantId).length
      }))
    }
  }

  /**
   * Health check for all sessions
   */
  async performHealthCheck() {
    console.log('[SessionManager] Performing health check...')
    
    const allSessions = this.getAllSessions()
    const now = new Date()
    const inactiveThreshold = 5 * 60 * 1000 // 5 minutes
    
    for (const session of allSessions) {
      const timeSinceActivity = now - session.lastActivity
      
      // Mark as inactive if no activity for threshold
      if (timeSinceActivity > inactiveThreshold && session.status === 'active') {
        console.log(`[SessionManager] Session ${session.tenantId}:${session.sessionId} inactive for ${Math.round(timeSinceActivity / 1000)}s`)
        this.updateStatus(session.tenantId, session.sessionId, 'inactive')
        
        // Update database
        try {
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              status: 'inactive',
              metadata: { lastHealthCheck: now.toISOString(), reason: 'No activity' }
            })
            .eq('id', session.sessionId)
            .eq('tenant_id', session.tenantId)
        } catch (error) {
          console.error('[SessionManager] Failed to update session status:', error)
        }
      }
      
      // Check error rate
      if (session.errorCount > 10) {
        console.warn(`[SessionManager] Session ${session.tenantId}:${session.sessionId} has high error count: ${session.errorCount}`)
      }
    }
    
    // Log statistics
    const stats = this.getStatistics()
    console.log('[SessionManager] Health check complete:', {
      total: stats.totalSessions,
      active: stats.activeSessions,
      inactive: stats.inactiveSessions,
      tenants: stats.totalTenants
    })
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.healthCheckInterval)
    
    console.log(`[SessionManager] Health monitoring started (interval: ${this.healthCheckInterval}ms)`)
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
      console.log('[SessionManager] Health monitoring stopped')
    }
  }

  /**
   * Clean up inactive sessions
   */
  async cleanupInactiveSessions() {
    const allSessions = this.getAllSessions()
    const now = new Date()
    const cleanupThreshold = 30 * 60 * 1000 // 30 minutes
    
    for (const session of allSessions) {
      const timeSinceActivity = now - session.lastActivity
      
      if (timeSinceActivity > cleanupThreshold && session.status === 'inactive') {
        console.log(`[SessionManager] Cleaning up inactive session: ${session.tenantId}:${session.sessionId}`)
        this.unregisterSession(session.tenantId, session.sessionId)
      }
    }
  }
}

// Singleton instance
const sessionManager = new SessionManager()

export default sessionManager

