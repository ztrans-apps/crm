/**
 * Health Monitoring Service
 * Monitors service health, sessions, and performance metrics
 */

class HealthMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      totalErrors: 0,
      lastError: null,
      lastErrorTime: null,
    };
    
    this.sessionMetrics = new Map(); // sessionId -> metrics
    this.performanceMetrics = [];
    this.maxPerformanceMetrics = 100; // Keep last 100 metrics
    
    // Start metrics cleanup
    this.startCleanup();
  }

  /**
   * Record a request
   */
  recordRequest(success = true) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Record a message sent
   */
  recordMessageSent(sessionId, success = true) {
    this.metrics.totalMessagesSent++;
    
    if (!this.sessionMetrics.has(sessionId)) {
      this.sessionMetrics.set(sessionId, {
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        lastActivity: Date.now(),
      });
    }
    
    const sessionMetric = this.sessionMetrics.get(sessionId);
    sessionMetric.messagesSent++;
    sessionMetric.lastActivity = Date.now();
    
    if (!success) {
      sessionMetric.errors++;
    }
  }

  /**
   * Record a message received
   */
  recordMessageReceived(sessionId) {
    this.metrics.totalMessagesReceived++;
    
    if (!this.sessionMetrics.has(sessionId)) {
      this.sessionMetrics.set(sessionId, {
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        lastActivity: Date.now(),
      });
    }
    
    const sessionMetric = this.sessionMetrics.get(sessionId);
    sessionMetric.messagesReceived++;
    sessionMetric.lastActivity = Date.now();
  }

  /**
   * Record an operation (generic)
   */
  recordOperation(operationName, success = true) {
    this.recordRequest(success);
    
    if (!success) {
      this.recordError(new Error(`Operation failed: ${operationName}`), {
        operation: operationName,
      });
    }
  }

  /**
   * Record session status
   */
  recordSessionStatus(sessionId, status) {
    if (!this.sessionMetrics.has(sessionId)) {
      this.sessionMetrics.set(sessionId, {
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        lastActivity: Date.now(),
        status,
      });
    } else {
      const sessionMetric = this.sessionMetrics.get(sessionId);
      sessionMetric.status = status;
      sessionMetric.lastActivity = Date.now();
    }
  }

  /**
   * Record an error
   */
  recordError(error, context = {}) {
    this.metrics.totalErrors++;
    this.metrics.lastError = {
      message: error.message,
      stack: error.stack,
      context,
    };
    this.metrics.lastErrorTime = Date.now();
    
    // Log to console
    console.error('❌ Error recorded:', error.message, context);
  }

  /**
   * Record performance metric
   */
  recordPerformance(operation, duration, metadata = {}) {
    const metric = {
      operation,
      duration,
      timestamp: Date.now(),
      ...metadata,
    };
    
    this.performanceMetrics.push(metric);
    
    // Keep only last N metrics
    if (this.performanceMetrics.length > this.maxPerformanceMetrics) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Get health status
   */
  getHealth(whatsappService) {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    
    // Calculate success rate
    const successRate = this.metrics.totalRequests > 0
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
      : 100;
    
    // Get session count
    const activeSessions = whatsappService ? whatsappService.sessions.size : 0;
    
    // Determine overall status
    let status = 'healthy';
    const issues = [];
    
    if (successRate < 90) {
      status = 'degraded';
      issues.push('Low success rate');
    }
    
    if (this.metrics.totalErrors > 10 && this.metrics.lastErrorTime > Date.now() - 60000) {
      status = 'unhealthy';
      issues.push('High error rate');
    }
    
    if (activeSessions === 0) {
      status = 'warning';
      issues.push('No active sessions');
    }
    
    return {
      status,
      issues,
      uptime: {
        seconds: uptimeSeconds,
        formatted: this.formatUptime(uptimeSeconds),
      },
      metrics: {
        requests: {
          total: this.metrics.totalRequests,
          successful: this.metrics.successfulRequests,
          failed: this.metrics.failedRequests,
          successRate: successRate.toFixed(2) + '%',
        },
        messages: {
          sent: this.metrics.totalMessagesSent,
          received: this.metrics.totalMessagesReceived,
        },
        errors: {
          total: this.metrics.totalErrors,
          lastError: this.metrics.lastError,
          lastErrorTime: this.metrics.lastErrorTime,
        },
        sessions: {
          active: activeSessions,
          metrics: Array.from(this.sessionMetrics.entries()).map(([id, metrics]) => ({
            sessionId: id,
            ...metrics,
          })),
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    if (this.performanceMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        metrics: [],
      };
    }
    
    const durations = this.performanceMetrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    
    return {
      count: this.performanceMetrics.length,
      averageDuration: Math.round(sum / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      metrics: this.performanceMetrics.slice(-20), // Last 20
    };
  }

  /**
   * Format uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      startTime: Date.now(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      totalErrors: 0,
      lastError: null,
      lastErrorTime: null,
    };
    this.sessionMetrics.clear();
    this.performanceMetrics = [];
  }

  /**
   * Cleanup old session metrics
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [sessionId, metrics] of this.sessionMetrics.entries()) {
      if (now - metrics.lastActivity > maxAge) {
        this.sessionMetrics.delete(sessionId);
      }
    }
  }

  /**
   * Start cleanup job
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 300000); // Every 5 minutes
  }
}

// Singleton instance
const healthMonitor = new HealthMonitor();

export default healthMonitor;
