/**
 * Health Check Routes
 * Provides detailed health and monitoring endpoints
 */

import express from 'express';
import healthMonitor from '../services/healthMonitor.js';
import rateLimiterInstance from '../middleware/rateLimiter.js';
import deliveryTracker from '../services/deliveryTracker.js';
import messageDeduplicator from '../services/messageDeduplicator.js';
import circuitBreakers from '../services/circuitBreaker.js';

const router = express.Router();

/**
 * GET / (mounted at /api/health)
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'whatsapp-service',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /detailed (mounted at /api/health/detailed)
 * Detailed health check with metrics
 */
router.get('/detailed', (req, res) => {
  const whatsappService = req.app.get('whatsappService');
  const health = healthMonitor.getHealth(whatsappService);
  
  res.json({
    success: true,
    ...health,
  });
});

/**
 * GET /metrics (mounted at /api/health/metrics)
 * Performance metrics
 */
router.get('/metrics', (req, res) => {
  const whatsappService = req.app.get('whatsappService');
  const health = healthMonitor.getHealth(whatsappService);
  const performance = healthMonitor.getPerformanceMetrics();
  
  res.json({
    success: true,
    status: health.status,
    uptime: health.uptime,
    operations: health.metrics.operations,
    sessions: health.metrics.sessions,
    circuitBreakers: health.circuitBreakers || {},
    deliveryStats: health.deliveryStats || { sent: 0, delivered: 0, read: 0, failed: 0 },
    recentOperations: health.recentOperations || [],
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /rate-limits (mounted at /api/health/rate-limits)
 * Rate limiter statistics
 */
router.get('/rate-limits', (req, res) => {
  const stats = rateLimiterInstance.getStats();
  
  res.json({
    success: true,
    rateLimiter: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /delivery (mounted at /api/health/delivery)
 * Delivery tracker statistics
 */
router.get('/delivery', (req, res) => {
  const stats = deliveryTracker.getStats();
  const pending = deliveryTracker.getPendingCount();
  
  res.json({
    success: true,
    delivery: {
      ...stats,
      pendingCount: pending,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /deduplication (mounted at /api/health/deduplication)
 * Message deduplication statistics
 */
router.get('/deduplication', (req, res) => {
  const stats = messageDeduplicator.getStats();
  
  res.json({
    success: true,
    deduplication: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /circuit-breakers (mounted at /api/health/circuit-breakers)
 * Circuit breaker states
 */
router.get('/circuit-breakers', (req, res) => {
  const states = {};
  
  for (const [name, breaker] of Object.entries(circuitBreakers)) {
    states[name] = breaker.getState();
  }
  
  res.json({
    success: true,
    circuitBreakers: states,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /all (mounted at /api/health/all)
 * All health information
 */
router.get('/all', (req, res) => {
  const whatsappService = req.app.get('whatsappService');
  const health = healthMonitor.getHealth(whatsappService);
  const performance = healthMonitor.getPerformanceMetrics();
  const rateLimiterStats = rateLimiterInstance.getStats();
  const deliveryStats = deliveryTracker.getStats();
  const deduplicationStats = messageDeduplicator.getStats();
  
  const circuitBreakerStates = {};
  for (const [name, breaker] of Object.entries(circuitBreakers)) {
    circuitBreakerStates[name] = breaker.getState();
  }
  
  res.json({
    success: true,
    health,
    performance,
    rateLimiter: rateLimiterStats,
    delivery: {
      ...deliveryStats,
      pendingCount: deliveryTracker.getPendingCount(),
    },
    deduplication: deduplicationStats,
    circuitBreakers: circuitBreakerStates,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /reset (mounted at /api/health/reset)
 * Reset health metrics (admin only)
 */
router.post('/reset', (req, res) => {
  // TODO: Add authentication
  
  healthMonitor.reset();
  
  res.json({
    success: true,
    message: 'Health metrics reset',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /circuit-breakers/reset (mounted at /api/health/circuit-breakers/reset)
 * Reset all circuit breakers
 */
router.post('/circuit-breakers/reset', (req, res) => {
  // TODO: Add authentication
  
  let resetCount = 0;
  for (const [name, breaker] of Object.entries(circuitBreakers)) {
    breaker.reset();
    resetCount++;
  }
  
  res.json({
    success: true,
    message: `${resetCount} circuit breaker(s) reset`,
    timestamp: new Date().toISOString(),
  });
});

export default router;
