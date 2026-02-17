/**
 * Session State Registry
 * Tracks connection state of all WhatsApp sessions
 * States: CONNECTED, CONNECTING, DISCONNECTED, LOGGED_OUT, ERROR
 */

class SessionStateRegistry {
  constructor() {
    // In-memory state storage
    // Format: { sessionKey: { state, phone, lastUpdate, errorCount, lastError } }
    this.states = new Map()
    
    // State constants
    this.STATES = {
      CONNECTED: 'CONNECTED',
      CONNECTING: 'CONNECTING',
      DISCONNECTED: 'DISCONNECTED',
      LOGGED_OUT: 'LOGGED_OUT',
      ERROR: 'ERROR'
    }
  }

  /**
   * Set session state
   */
  setState(sessionKey, state, metadata = {}) {
    const existing = this.states.get(sessionKey) || {}
    
    this.states.set(sessionKey, {
      ...existing,
      state,
      lastUpdate: new Date().toISOString(),
      ...metadata
    })
    
    console.log(`📊 [StateRegistry] ${sessionKey}: ${state}`)
  }

  /**
   * Get session state
   */
  getState(sessionKey) {
    return this.states.get(sessionKey)
  }

  /**
   * Get all states
   */
  getAllStates() {
    const states = []
    for (const [sessionId, value] of this.states.entries()) {
      states.push({
        sessionId,
        ...value
      })
    }
    return states
  }

  /**
   * Get states by status
   */
  getStatesByStatus(status) {
    const filtered = {}
    for (const [key, value] of this.states.entries()) {
      if (value.state === status) {
        filtered[key] = value
      }
    }
    return filtered
  }

  /**
   * Increment error count
   */
  incrementErrorCount(sessionKey, error) {
    const existing = this.states.get(sessionKey) || {}
    const errorCount = (existing.errorCount || 0) + 1
    
    this.setState(sessionKey, this.STATES.ERROR, {
      ...existing,
      errorCount,
      lastError: error
    })
    
    return errorCount
  }

  /**
   * Reset error count
   */
  resetErrorCount(sessionKey) {
    const existing = this.states.get(sessionKey)
    if (existing) {
      this.setState(sessionKey, existing.state, {
        ...existing,
        errorCount: 0,
        lastError: null
      })
    }
  }

  /**
   * Remove session
   */
  remove(sessionKey) {
    this.states.delete(sessionKey)
    console.log(`🗑️  [StateRegistry] Removed ${sessionKey}`)
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const summary = {
      total: this.states.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      loggedOut: 0,
      error: 0
    }
    
    for (const [, value] of this.states.entries()) {
      switch (value.state) {
        case this.STATES.CONNECTED:
          summary.connected++
          break
        case this.STATES.CONNECTING:
          summary.connecting++
          break
        case this.STATES.DISCONNECTED:
          summary.disconnected++
          break
        case this.STATES.LOGGED_OUT:
          summary.loggedOut++
          break
        case this.STATES.ERROR:
          summary.error++
          break
      }
    }
    
    return summary
  }
}

// Singleton instance
const sessionStateRegistry = new SessionStateRegistry()

export default sessionStateRegistry
