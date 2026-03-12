import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceMonitor,
  PerformanceMetric,
  PerformanceStats,
  SlowQuery,
  SystemMetrics,
  trackPerformance,
} from '../../lib/monitoring/performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
  });

  afterEach(() => {
    monitor.clearMetrics();
  });

  describe('recordMetric', () => {
    it('should record a performance metric', async () => {
      const metric: PerformanceMetric = {
        endpoint: '/api/contacts',
        method: 'GET',
        duration: 150,
        statusCode: 200,
        tenantId: 'tenant-1',
        userId: 'user-1',
        timestamp: new Date().toISOString(),
      };

      await monitor.recordMetric(metric);

      const stats = await monitor.getStats('/api/contacts');
      expect(stats.requestCount).toBe(1);
      expect(stats.avgDuration).toBe(150);
    });

    it('should record multiple metrics', async () => {
      const metrics: PerformanceMetric[] = [
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 100,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 200,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 300,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric(metric);
      }

      const stats = await monitor.getStats('/api/contacts');
      expect(stats.requestCount).toBe(3);
      expect(stats.avgDuration).toBe(200);
    });

    it('should track database query time', async () => {
      const metric: PerformanceMetric = {
        endpoint: '/api/contacts',
        method: 'GET',
        duration: 250,
        statusCode: 200,
        tenantId: 'tenant-1',
        timestamp: new Date().toISOString(),
        dbQueryTime: 150,
      };

      await monitor.recordMetric(metric);

      const slowQueries = await monitor.getSlowQueries(100);
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].dbQueryTime).toBe(150);
    });

    it('should track cache hits and misses', async () => {
      const metrics: PerformanceMetric[] = [
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 50,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          cacheHit: true,
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 200,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          cacheHit: false,
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 45,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          cacheHit: true,
        },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric(metric);
      }

      const stats = await monitor.getStats('/api/contacts');
      expect(stats.cacheHitRate).toBeCloseTo(66.67, 1);
    });

    it('should track errors', async () => {
      const metrics: PerformanceMetric[] = [
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 100,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 150,
          statusCode: 500,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          errorMessage: 'Internal server error',
        },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric(metric);
      }

      const stats = await monitor.getStats('/api/contacts');
      expect(stats.errorRate).toBe(50);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Record test metrics
      const durations = [100, 150, 200, 250, 300, 350, 400, 450, 500, 1000];
      for (const duration of durations) {
        await monitor.recordMetric({
          endpoint: '/api/test',
          method: 'GET',
          duration,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        });
      }
    });

    it('should calculate average duration', async () => {
      const stats = await monitor.getStats('/api/test');
      expect(stats.avgDuration).toBe(370);
    });

    it('should calculate p50 (median)', async () => {
      const stats = await monitor.getStats('/api/test');
      expect(stats.p50Duration).toBe(300);
    });

    it('should calculate p95', async () => {
      const stats = await monitor.getStats('/api/test');
      expect(stats.p95Duration).toBe(1000);
    });

    it('should calculate p99', async () => {
      const stats = await monitor.getStats('/api/test');
      expect(stats.p99Duration).toBe(1000);
    });

    it('should return zero stats for non-existent endpoint', async () => {
      const stats = await monitor.getStats('/api/nonexistent');
      expect(stats.requestCount).toBe(0);
      expect(stats.avgDuration).toBe(0);
      expect(stats.errorRate).toBe(0);
    });

    it('should filter by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const stats = await monitor.getStats('/api/test', {
        start: oneHourAgo,
        end: now,
      });

      expect(stats.requestCount).toBe(10);
    });
  });

  describe('getSlowQueries', () => {
    it('should return queries exceeding threshold', async () => {
      const metrics: PerformanceMetric[] = [
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 250,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          dbQueryTime: 50,
        },
        {
          endpoint: '/api/messages',
          method: 'GET',
          duration: 500,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          dbQueryTime: 150,
        },
        {
          endpoint: '/api/broadcasts',
          method: 'GET',
          duration: 800,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          dbQueryTime: 300,
        },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric(metric);
      }

      const slowQueries = await monitor.getSlowQueries(100);
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].dbQueryTime).toBe(300);
      expect(slowQueries[1].dbQueryTime).toBe(150);
    });

    it('should return empty array when no slow queries', async () => {
      const metric: PerformanceMetric = {
        endpoint: '/api/contacts',
        method: 'GET',
        duration: 100,
        statusCode: 200,
        tenantId: 'tenant-1',
        timestamp: new Date().toISOString(),
        dbQueryTime: 50,
      };

      await monitor.recordMetric(metric);

      const slowQueries = await monitor.getSlowQueries(100);
      expect(slowQueries).toHaveLength(0);
    });

    it('should use default threshold of 100ms', async () => {
      const metric: PerformanceMetric = {
        endpoint: '/api/contacts',
        method: 'GET',
        duration: 250,
        statusCode: 200,
        tenantId: 'tenant-1',
        timestamp: new Date().toISOString(),
        dbQueryTime: 150,
      };

      await monitor.recordMetric(metric);

      const slowQueries = await monitor.getSlowQueries();
      expect(slowQueries).toHaveLength(1);
    });
  });

  describe('alertOnThreshold', () => {
    it('should not alert for normal response times', async () => {
      const metric: PerformanceMetric = {
        endpoint: '/api/contacts',
        method: 'GET',
        duration: 500,
        statusCode: 200,
        tenantId: 'tenant-1',
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      await expect(monitor.alertOnThreshold(metric)).resolves.toBeUndefined();
    });

    it('should handle warning threshold', async () => {
      const metric: PerformanceMetric = {
        endpoint: '/api/contacts',
        method: 'GET',
        duration: 1500,
        statusCode: 200,
        tenantId: 'tenant-1',
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      await expect(monitor.alertOnThreshold(metric)).resolves.toBeUndefined();
    });

    it('should handle critical threshold', async () => {
      const metric: PerformanceMetric = {
        endpoint: '/api/contacts',
        method: 'GET',
        duration: 3500,
        statusCode: 200,
        tenantId: 'tenant-1',
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      await expect(monitor.alertOnThreshold(metric)).resolves.toBeUndefined();
    });
  });

  describe('getSystemMetrics', () => {
    it('should return current system metrics', () => {
      const metrics = monitor.getSystemMetrics();

      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics.memoryUsage).toHaveProperty('heapUsed');
      expect(metrics.memoryUsage).toHaveProperty('heapTotal');
      expect(metrics.memoryUsage).toHaveProperty('external');
      expect(metrics.memoryUsage).toHaveProperty('rss');

      expect(metrics).toHaveProperty('cpuUsage');
      expect(metrics.cpuUsage).toHaveProperty('user');
      expect(metrics.cpuUsage).toHaveProperty('system');

      expect(metrics).toHaveProperty('concurrentRequests');
      expect(metrics).toHaveProperty('timestamp');
    });

    it('should track concurrent requests', () => {
      monitor.incrementConcurrentRequests();
      monitor.incrementConcurrentRequests();

      const metrics = monitor.getSystemMetrics();
      expect(metrics.concurrentRequests).toBe(2);

      monitor.decrementConcurrentRequests();
      const metrics2 = monitor.getSystemMetrics();
      expect(metrics2.concurrentRequests).toBe(1);
    });

    it('should not go below zero concurrent requests', () => {
      monitor.decrementConcurrentRequests();
      monitor.decrementConcurrentRequests();

      const metrics = monitor.getSystemMetrics();
      expect(metrics.concurrentRequests).toBe(0);
    });
  });

  describe('getTenantMetrics', () => {
    beforeEach(async () => {
      const metrics: PerformanceMetric[] = [
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 100,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        },
        {
          endpoint: '/api/messages',
          method: 'GET',
          duration: 200,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 150,
          statusCode: 200,
          tenantId: 'tenant-2',
          timestamp: new Date().toISOString(),
        },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric(metric);
      }
    });

    it('should return metrics for specific tenant', () => {
      const tenant1Metrics = monitor.getTenantMetrics('tenant-1');
      expect(tenant1Metrics).toHaveLength(2);
      expect(tenant1Metrics.every((m) => m.tenantId === 'tenant-1')).toBe(true);
    });

    it('should filter by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const metrics = monitor.getTenantMetrics('tenant-1', {
        start: oneHourAgo,
        end: now,
      });

      expect(metrics).toHaveLength(2);
    });
  });

  describe('getCacheStats', () => {
    beforeEach(async () => {
      const metrics: PerformanceMetric[] = [
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 50,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          cacheHit: true,
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 200,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          cacheHit: false,
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 45,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          cacheHit: true,
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 180,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          cacheHit: false,
        },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric(metric);
      }
    });

    it('should calculate cache hit rate', () => {
      const stats = monitor.getCacheStats();
      expect(stats.hitRate).toBe(50);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.totalRequests).toBe(4);
    });

    it('should return zero stats when no cache data', () => {
      monitor.clearMetrics();
      const stats = monitor.getCacheStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('getErrorStats', () => {
    beforeEach(async () => {
      const metrics: PerformanceMetric[] = [
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 100,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        },
        {
          endpoint: '/api/contacts',
          method: 'POST',
          duration: 150,
          statusCode: 400,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          errorMessage: 'Bad request',
        },
        {
          endpoint: '/api/messages',
          method: 'GET',
          duration: 200,
          statusCode: 500,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          errorMessage: 'Internal error',
        },
        {
          endpoint: '/api/contacts',
          method: 'GET',
          duration: 120,
          statusCode: 200,
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
        },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric(metric);
      }
    });

    it('should calculate error rate', () => {
      const stats = monitor.getErrorStats();
      expect(stats.errorRate).toBe(50);
      expect(stats.errors).toBe(2);
      expect(stats.totalRequests).toBe(4);
    });

    it('should group errors by endpoint', () => {
      const stats = monitor.getErrorStats();
      expect(stats.errorsByEndpoint['/api/contacts']).toBe(1);
      expect(stats.errorsByEndpoint['/api/messages']).toBe(1);
    });

    it('should return zero stats when no errors', () => {
      monitor.clearMetrics();
      const stats = monitor.getErrorStats();
      expect(stats.errorRate).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('trackPerformance helper', () => {
    it('should track successful request', async () => {
      const result = await trackPerformance(
        '/api/test',
        'GET',
        'tenant-1',
        'user-1',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'success';
        }
      );

      expect(result).toBe('success');

      const stats = await monitor.getStats('/api/test');
      expect(stats.requestCount).toBe(1);
      // Allow 10ms variance for setTimeout
      expect(stats.p95Duration).toBeGreaterThanOrEqual(90);
    });

    it('should track failed request', async () => {
      await expect(
        trackPerformance(
          '/api/test',
          'GET',
          'tenant-1',
          'user-1',
          async () => {
            throw new Error('Test error');
          }
        )
      ).rejects.toThrow('Test error');

      const stats = await monitor.getStats('/api/test');
      expect(stats.requestCount).toBe(1);
      expect(stats.errorRate).toBe(100);
    });

    it('should track concurrent requests', async () => {
      const promises = [
        trackPerformance('/api/test', 'GET', 'tenant-1', 'user-1', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }),
        trackPerformance('/api/test', 'GET', 'tenant-1', 'user-1', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }),
      ];

      // Check concurrent requests during execution
      await new Promise((resolve) => setTimeout(resolve, 50));
      const metrics = monitor.getSystemMetrics();
      expect(metrics.concurrentRequests).toBeGreaterThan(0);

      await Promise.all(promises);

      // Should be back to 0 after completion
      const finalMetrics = monitor.getSystemMetrics();
      expect(finalMetrics.concurrentRequests).toBe(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
