/**
 * Reconnect Manager
 * Handles automatic reconnection for WhatsApp sessions
 */

class ReconnectManager {
  constructor() {
    this.reconnectAttempts = new Map(); // sessionId -> attempt count
    this.reconnectTimers = new Map(); // sessionId -> timer
    this.maxAttempts = 10; // Increased to 10 attempts
    // Custom delays: 3s, 10s, 30s, 60s, 120s, then 300s (5min)
    this.delays = [3000, 10000, 30000, 60000, 120000, 300000, 300000, 300000, 300000, 300000]
  }

  /**
   * Get backoff delay for attempt
   */
  getBackoffDelay(attempt) {
    // Use predefined delays, or last delay if exceeded
    return this.delays[attempt] || this.delays[this.delays.length - 1]
  }

  /**
   * Get current attempt count
   */
  getAttemptCount(sessionId) {
    return this.reconnectAttempts.get(sessionId) || 0;
  }

  /**
   * Reset reconnect attempts
   */
  resetAttempts(sessionId) {
    this.reconnectAttempts.delete(sessionId);
    this.clearTimer(sessionId);
  }

  /**
   * Clear reconnect timer
   */
  clearTimer(sessionId) {
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(sessionId, reconnectFn, onMaxAttemptsReached) {
    const attempt = this.getAttemptCount(sessionId);
    
    if (attempt >= this.maxAttempts) {
      console.error(`[Reconnect] Max attempts (${this.maxAttempts}) reached for session ${sessionId}`);
      this.resetAttempts(sessionId);
      if (onMaxAttemptsReached) {
        onMaxAttemptsReached(sessionId);
      }
      return false;
    }

    const delay = this.getBackoffDelay(attempt);
    console.log(`[Reconnect] Scheduling attempt ${attempt + 1}/${this.maxAttempts} for session ${sessionId} in ${delay}ms`);

    // Clear any existing timer
    this.clearTimer(sessionId);

    // Schedule reconnection
    const timer = setTimeout(async () => {
      try {
        console.log(`[Reconnect] Attempting reconnection ${attempt + 1}/${this.maxAttempts} for session ${sessionId}`);
        
        // Increment attempt count
        this.reconnectAttempts.set(sessionId, attempt + 1);
        
        // Attempt reconnection
        const success = await reconnectFn(sessionId);
        
        if (success) {
          console.log(`[Reconnect] Successfully reconnected session ${sessionId}`);
          this.resetAttempts(sessionId);
        } else {
          console.log(`[Reconnect] Failed to reconnect session ${sessionId}, will retry`);
          // Schedule next attempt
          this.scheduleReconnect(sessionId, reconnectFn, onMaxAttemptsReached);
        }
      } catch (error) {
        console.error(`[Reconnect] Error during reconnection attempt for session ${sessionId}:`, error);
        // Schedule next attempt
        this.scheduleReconnect(sessionId, reconnectFn, onMaxAttemptsReached);
      }
    }, delay);

    this.reconnectTimers.set(sessionId, timer);
    return true;
  }

  /**
   * Cancel all reconnection attempts for a session
   */
  cancelReconnect(sessionId) {
    console.log(`[Reconnect] Cancelling reconnection attempts for session ${sessionId}`);
    this.resetAttempts(sessionId);
  }

  /**
   * Get reconnection status
   */
  getStatus(sessionId) {
    const attempt = this.getAttemptCount(sessionId);
    const hasTimer = this.reconnectTimers.has(sessionId);
    
    return {
      isReconnecting: hasTimer,
      attempt,
      maxAttempts: this.maxAttempts,
      nextDelay: hasTimer ? this.getBackoffDelay(attempt) : null,
    };
  }

  /**
   * Get all active reconnections
   */
  getAllActive() {
    const active = [];
    for (const [sessionId, attempt] of this.reconnectAttempts.entries()) {
      active.push({
        sessionId,
        attempt,
        maxAttempts: this.maxAttempts,
        hasTimer: this.reconnectTimers.has(sessionId),
      });
    }
    return active;
  }
}

// Singleton instance
const reconnectManager = new ReconnectManager();

export default reconnectManager;
