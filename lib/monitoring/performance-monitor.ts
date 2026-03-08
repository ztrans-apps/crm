import { createLogger } from './logger';

const logger = createLogger('performance-monitor');

/**
 * Performance metric for a single API request
 * Validates: Requirements 11.1, 11.2, 11.4, 11.10
 */
export interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  tenantId: string;
  userId?: string;
  timestamp: string;
  dbQueryTime?: number;
  cacheHit?: boolean;
  errorMessage?: string;
}

/**
 * Aggregated performance statistics for an endpoint
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 */
export interface PerformanceStats {
  endpoint: string;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  requestCount: number;
  errorRate: number;
  cacheHitRate?: number;
}

/**
 * Slow query information
 * Validates: Requirement 11.2
 */
export interface SlowQuery {
  endpoint: string;
  method: string;
  duration: number;
  dbQueryTime: number;
  timestamp: string;
  tenantId: string;
}

/**
 * Time range for querying metrics
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * System resource metrics
 * Validates: Requirement 11.10
 */
export interface SystemMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  concurrentRequests: number;
  timestamp: string;
}

/**
 * Alert thresholds configuration
 * Validates: Requirements 11.6, 11.7
 */
interface AlertThresholds {
  responseTimeWarning: number; // ms
  responseTimeCritical: number; // ms
  errorRateWarning: number; // percentage
  errorRateCritical: number; // percentage
  cacheHitRateWarning: number; // percentage
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  responseTimeWarning: 1000,
  responseTimeCritical: 3000,
  errorRateWarning: 5,
  errorRateCritical: 10,
  cacheHitRateWarning: 70,
};

/**
 * PerformanceMonitor - Singleton class for tracking API performance
 * 
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.10
 * 
 * Features:
 * - Tracks response times per endpoint
 * - Tracks database query execution times
 * - Tracks cache hit/miss rates
 * - Tracks error rates per endpoint
 * - Monitors system resources (memory, CPU)
 * - Provides statistical analysis (avg, p50, p95, p99)
 * - Threshold-based alerting
 * - Sliding window (1 hour) in-memory storage
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private concurrentRequests: number = 0;
  private readonly maxMetricsAge = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly cleanupInterval = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;
  private thresholds: AlertThresholds;
  private lastCpuUsage = process.cpuUsage();

  private constructor(thresholds?: Partial<AlertThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.startCleanup();
    this.startSystemMetricsCollection();
    logger.info('PerformanceMonitor initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(thresholds?: Partial<AlertThresholds>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(thresholds);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record a performance metric
   * Validates: Requirements 11.1, 11.2, 11.4, 11.5
   */
  public async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // Store metric
      this.metrics.push(metric);

      // Log for debugging
      logger.debug({
        message: 'Metric recorded',
        endpoint: metric.endpoint,
        method: metric.method,
        duration: metric.duration,
        statusCode: metric.statusCode,
        tenantId: metric.tenantId,
      });

      // Check thresholds and alert if needed
      await this.alertOnThreshold(metric);
    } catch (error) {
      logger.error({
        message: 'Failed to record metric',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get performance statistics for an endpoint
   * Validates: Requirements 11.1, 11.2, 11.3, 11.4
   */
  public async getStats(
    endpoint: string,
    timeRange?: TimeRange
  ): Promise<PerformanceStats> {
    const filteredMetrics = this.filterMetrics(endpoint, timeRange);

    if (filteredMetrics.length === 0) {
      return {
        endpoint,
        avgDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        requestCount: 0,
        errorRate: 0,
        cacheHitRate: 0,
      };
    }

    // Calculate durations
    const durations = filteredMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);

    const avgDuration =
      durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p50Duration = this.calculatePercentile(durations, 50);
    const p95Duration = this.calculatePercentile(durations, 95);
    const p99Duration = this.calculatePercentile(durations, 99);

    // Calculate error rate
    const errorCount = filteredMetrics.filter(
      (m) => m.statusCode >= 400
    ).length;
    const errorRate = (errorCount / filteredMetrics.length) * 100;

    // Calculate cache hit rate
    const metricsWithCache = filteredMetrics.filter(
      (m) => m.cacheHit !== undefined
    );
    const cacheHitRate =
      metricsWithCache.length > 0
        ? (metricsWithCache.filter((m) => m.cacheHit).length /
            metricsWithCache.length) *
          100
        : undefined;

    return {
      endpoint,
      avgDuration,
      p50Duration,
      p95Duration,
      p99Duration,
      requestCount: filteredMetrics.length,
      errorRate,
      cacheHitRate,
    };
  }

  /**
   * Get slow queries (database queries exceeding threshold)
   * Validates: Requirement 11.2
   */
  public async getSlowQueries(threshold: number = 100): Promise<SlowQuery[]> {
    const now = Date.now();
    const cutoff = now - this.maxMetricsAge;

    return this.metrics
      .filter((m) => {
        const timestamp = new Date(m.timestamp).getTime();
        return (
          timestamp >= cutoff &&
          m.dbQueryTime !== undefined &&
          m.dbQueryTime > threshold
        );
      })
      .map((m) => ({
        endpoint: m.endpoint,
        method: m.method,
        duration: m.duration,
        dbQueryTime: m.dbQueryTime!,
        timestamp: m.timestamp,
        tenantId: m.tenantId,
      }))
      .sort((a, b) => b.dbQueryTime - a.dbQueryTime);
  }

  /**
   * Check metric against thresholds and alert if exceeded
   * Validates: Requirements 11.6, 11.7
   */
  public async alertOnThreshold(metric: PerformanceMetric): Promise<void> {
    try {
      // Check response time thresholds
      if (metric.duration >= this.thresholds.responseTimeCritical) {
        logger.error({
          message: 'CRITICAL: Response time threshold exceeded',
          endpoint: metric.endpoint,
          duration: metric.duration,
          threshold: this.thresholds.responseTimeCritical,
          tenantId: metric.tenantId,
        });
      } else if (metric.duration >= this.thresholds.responseTimeWarning) {
        logger.warn({
          message: 'WARNING: Response time threshold exceeded',
          endpoint: metric.endpoint,
          duration: metric.duration,
          threshold: this.thresholds.responseTimeWarning,
          tenantId: metric.tenantId,
        });
      }

      // Check error rate for this endpoint (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const stats = await this.getStats(metric.endpoint, {
        start: fiveMinutesAgo,
        end: new Date(),
      });

      if (stats.errorRate >= this.thresholds.errorRateCritical) {
        logger.error({
          message: 'CRITICAL: Error rate threshold exceeded',
          endpoint: metric.endpoint,
          errorRate: stats.errorRate,
          threshold: this.thresholds.errorRateCritical,
          tenantId: metric.tenantId,
        });
      } else if (stats.errorRate >= this.thresholds.errorRateWarning) {
        logger.warn({
          message: 'WARNING: Error rate threshold exceeded',
          endpoint: metric.endpoint,
          errorRate: stats.errorRate,
          threshold: this.thresholds.errorRateWarning,
          tenantId: metric.tenantId,
        });
      }

      // Check cache hit rate
      if (
        stats.cacheHitRate !== undefined &&
        stats.cacheHitRate < this.thresholds.cacheHitRateWarning
      ) {
        logger.warn({
          message: 'WARNING: Cache hit rate below threshold',
          endpoint: metric.endpoint,
          cacheHitRate: stats.cacheHitRate,
          threshold: this.thresholds.cacheHitRateWarning,
          tenantId: metric.tenantId,
        });
      }
    } catch (error) {
      logger.error({
        message: 'Failed to check alert thresholds',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get current system metrics
   * Validates: Requirement 11.10
   */
  public getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    return {
      memoryUsage: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      concurrentRequests: this.concurrentRequests,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Increment concurrent request counter
   */
  public incrementConcurrentRequests(): void {
    this.concurrentRequests++;
  }

  /**
   * Decrement concurrent request counter
   */
  public decrementConcurrentRequests(): void {
    this.concurrentRequests = Math.max(0, this.concurrentRequests - 1);
  }

  /**
   * Get all metrics for a specific tenant
   * Validates: Requirement 11.10
   */
  public getTenantMetrics(
    tenantId: string,
    timeRange?: TimeRange
  ): PerformanceMetric[] {
    return this.filterMetricsByTenant(tenantId, timeRange);
  }

  /**
   * Get cache statistics
   * Validates: Requirement 11.3
   */
  public getCacheStats(timeRange?: TimeRange): {
    hitRate: number;
    totalRequests: number;
    hits: number;
    misses: number;
  } {
    const filteredMetrics = this.filterMetricsByTimeRange(timeRange);
    const metricsWithCache = filteredMetrics.filter(
      (m) => m.cacheHit !== undefined
    );

    if (metricsWithCache.length === 0) {
      return { hitRate: 0, totalRequests: 0, hits: 0, misses: 0 };
    }

    const hits = metricsWithCache.filter((m) => m.cacheHit).length;
    const misses = metricsWithCache.length - hits;
    const hitRate = (hits / metricsWithCache.length) * 100;

    return {
      hitRate,
      totalRequests: metricsWithCache.length,
      hits,
      misses,
    };
  }

  /**
   * Get error rate statistics
   * Validates: Requirement 11.4
   */
  public getErrorStats(timeRange?: TimeRange): {
    errorRate: number;
    totalRequests: number;
    errors: number;
    errorsByEndpoint: Record<string, number>;
  } {
    const filteredMetrics = this.filterMetricsByTimeRange(timeRange);

    if (filteredMetrics.length === 0) {
      return {
        errorRate: 0,
        totalRequests: 0,
        errors: 0,
        errorsByEndpoint: {},
      };
    }

    const errors = filteredMetrics.filter((m) => m.statusCode >= 400);
    const errorRate = (errors.length / filteredMetrics.length) * 100;

    const errorsByEndpoint: Record<string, number> = {};
    errors.forEach((m) => {
      errorsByEndpoint[m.endpoint] = (errorsByEndpoint[m.endpoint] || 0) + 1;
    });

    return {
      errorRate,
      totalRequests: filteredMetrics.length,
      errors: errors.length,
      errorsByEndpoint,
    };
  }

  /**
   * Clear all metrics (for testing)
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.systemMetrics = [];
    logger.info('All metrics cleared');
  }

  /**
   * Destroy the monitor and cleanup resources
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.metrics = [];
    this.systemMetrics = [];
    logger.info('PerformanceMonitor destroyed');
  }

  // Private helper methods

  private filterMetrics(
    endpoint: string,
    timeRange?: TimeRange
  ): PerformanceMetric[] {
    let filtered = this.metrics.filter((m) => m.endpoint === endpoint);

    if (timeRange) {
      const startTime = timeRange.start.getTime();
      const endTime = timeRange.end.getTime();
      filtered = filtered.filter((m) => {
        const timestamp = new Date(m.timestamp).getTime();
        return timestamp >= startTime && timestamp <= endTime;
      });
    }

    return filtered;
  }

  private filterMetricsByTenant(
    tenantId: string,
    timeRange?: TimeRange
  ): PerformanceMetric[] {
    let filtered = this.metrics.filter((m) => m.tenantId === tenantId);

    if (timeRange) {
      const startTime = timeRange.start.getTime();
      const endTime = timeRange.end.getTime();
      filtered = filtered.filter((m) => {
        const timestamp = new Date(m.timestamp).getTime();
        return timestamp >= startTime && timestamp <= endTime;
      });
    }

    return filtered;
  }

  private filterMetricsByTimeRange(timeRange?: TimeRange): PerformanceMetric[] {
    if (!timeRange) {
      return this.metrics;
    }

    const startTime = timeRange.start.getTime();
    const endTime = timeRange.end.getTime();

    return this.metrics.filter((m) => {
      const timestamp = new Date(m.timestamp).getTime();
      return timestamp >= startTime && timestamp <= endTime;
    });
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, this.cleanupInterval);
  }

  private cleanupOldMetrics(): void {
    const now = Date.now();
    const cutoff = now - this.maxMetricsAge;

    const beforeCount = this.metrics.length;
    this.metrics = this.metrics.filter((m) => {
      const timestamp = new Date(m.timestamp).getTime();
      return timestamp >= cutoff;
    });

    const removed = beforeCount - this.metrics.length;
    if (removed > 0) {
      logger.debug({
        message: 'Cleaned up old metrics',
        removed,
        remaining: this.metrics.length,
      });
    }

    // Cleanup old system metrics
    const beforeSystemCount = this.systemMetrics.length;
    this.systemMetrics = this.systemMetrics.filter((m) => {
      const timestamp = new Date(m.timestamp).getTime();
      return timestamp >= cutoff;
    });

    const removedSystem = beforeSystemCount - this.systemMetrics.length;
    if (removedSystem > 0) {
      logger.debug({
        message: 'Cleaned up old system metrics',
        removed: removedSystem,
        remaining: this.systemMetrics.length,
      });
    }
  }

  private startSystemMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const metrics = this.getSystemMetrics();
      this.systemMetrics.push(metrics);
    }, 30000);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Helper function to track request performance
 * Usage: await trackPerformance(req, async () => { ... })
 */
export async function trackPerformance<T>(
  endpoint: string,
  method: string,
  tenantId: string,
  userId: string | undefined,
  fn: () => Promise<T>,
  options?: {
    trackDbQuery?: boolean;
    trackCache?: boolean;
  }
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance();
  const startTime = Date.now();
  let dbQueryStart: number | undefined;
  let cacheHit: boolean | undefined;

  monitor.incrementConcurrentRequests();

  try {
    // Track database query time if requested
    if (options?.trackDbQuery) {
      dbQueryStart = Date.now();
    }

    const result = await fn();

    const duration = Date.now() - startTime;
    const dbQueryTime = dbQueryStart ? Date.now() - dbQueryStart : undefined;

    await monitor.recordMetric({
      endpoint,
      method,
      duration,
      statusCode: 200,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      dbQueryTime,
      cacheHit: options?.trackCache ? cacheHit : undefined,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const dbQueryTime = dbQueryStart ? Date.now() - dbQueryStart : undefined;

    await monitor.recordMetric({
      endpoint,
      method,
      duration,
      statusCode: 500,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      dbQueryTime,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw error;
  } finally {
    monitor.decrementConcurrentRequests();
  }
}
