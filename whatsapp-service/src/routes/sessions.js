/**
 * Session Management Routes
 * Multi-tenant session listing and statistics
 */

import express from 'express'
import sessionManager from '../services/session-manager.js'
import sessionStateRegistry from '../services/session-state-registry.js'
import { supabase } from '../config/supabase.js'

const router = express.Router()

/**
 * Get session states from state registry
 * GET /api/sessions/states
 * Returns real-time connection states for all sessions
 */
router.get('/states', async (req, res) => {
  try {
    const states = sessionStateRegistry.getAllStates()
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sessionCount: states.length,
      states: states.map(state => ({
        sessionId: state.sessionId,
        state: state.state,
        lastUpdate: state.lastUpdate,
        errorCount: state.errorCount,
        metadata: state.metadata
      }))
    })
  } catch (error) {
    console.error('[Sessions] Error getting session states:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get all sessions for a tenant
 * GET /api/sessions/:tenantId
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params
    
    // Get sessions from session manager
    const sessions = sessionManager.getTenantSessions(tenantId)
    
    // Get sessions from database for additional info
    const { data: dbSessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Merge data
    const mergedSessions = dbSessions.map(dbSession => {
      const activeSession = sessions.find(s => s.sessionId === dbSession.id)
      
      return {
        ...dbSession,
        isActive: !!activeSession,
        activeStatus: activeSession?.status || 'inactive',
        lastActivity: activeSession?.lastActivity || dbSession.last_activity,
        messageCount: activeSession?.messageCount || 0,
        errorCount: activeSession?.errorCount || 0
      }
    })
    
    res.json({
      success: true,
      tenantId,
      sessionCount: mergedSessions.length,
      activeSessions: sessions.length,
      sessions: mergedSessions
    })
  } catch (error) {
    console.error('[Sessions] Error getting tenant sessions:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get active sessions for a tenant
 * GET /api/sessions/:tenantId/active
 */
router.get('/:tenantId/active', async (req, res) => {
  try {
    const { tenantId } = req.params
    
    const sessions = sessionManager.getActiveTenantSessions(tenantId)
    
    res.json({
      success: true,
      tenantId,
      activeCount: sessions.length,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        status: s.status,
        lastActivity: s.lastActivity,
        messageCount: s.messageCount,
        errorCount: s.errorCount,
        registeredAt: s.registeredAt
      }))
    })
  } catch (error) {
    console.error('[Sessions] Error getting active sessions:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get best session for tenant (load balancing)
 * GET /api/sessions/:tenantId/best
 */
router.get('/:tenantId/best', async (req, res) => {
  try {
    const { tenantId } = req.params
    
    const session = sessionManager.getBestSessionForTenant(tenantId)
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'No active sessions found for tenant'
      })
    }
    
    res.json({
      success: true,
      tenantId,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        messageCount: session.messageCount,
        lastActivity: session.lastActivity
      }
    })
  } catch (error) {
    console.error('[Sessions] Error getting best session:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get session statistics
 * GET /api/sessions/stats
 */
router.get('/stats/all', async (req, res) => {
  try {
    const stats = sessionManager.getStatistics()
    
    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('[Sessions] Error getting statistics:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get session health status
 * GET /api/sessions/:tenantId/:sessionId/health
 */
router.get('/:tenantId/:sessionId/health', async (req, res) => {
  try {
    const { tenantId, sessionId } = req.params
    
    const session = sessionManager.getSession(tenantId, sessionId)
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }
    
    const now = new Date()
    const timeSinceActivity = now - session.lastActivity
    const isHealthy = timeSinceActivity < 5 * 60 * 1000 // 5 minutes
    
    res.json({
      success: true,
      health: {
        sessionId,
        tenantId,
        status: session.status,
        isHealthy,
        lastActivity: session.lastActivity,
        timeSinceActivity: Math.round(timeSinceActivity / 1000), // seconds
        messageCount: session.messageCount,
        errorCount: session.errorCount,
        errorRate: session.messageCount > 0 
          ? (session.errorCount / session.messageCount * 100).toFixed(2) + '%'
          : '0%'
      }
    })
  } catch (error) {
    console.error('[Sessions] Error getting health status:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Trigger health check
 * POST /api/sessions/health-check
 */
router.post('/health-check', async (req, res) => {
  try {
    await sessionManager.performHealthCheck()
    
    res.json({
      success: true,
      message: 'Health check completed'
    })
  } catch (error) {
    console.error('[Sessions] Error performing health check:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get specific session state
 * GET /api/sessions/:sessionId/state
 */
router.get('/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    const state = sessionStateRegistry.getState(sessionId)
    
    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Session state not found'
      })
    }
    
    res.json({
      success: true,
      sessionId,
      state: state.state,
      lastUpdate: state.lastUpdate,
      errorCount: state.errorCount,
      metadata: state.metadata
    })
  } catch (error) {
    console.error('[Sessions] Error getting session state:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router

