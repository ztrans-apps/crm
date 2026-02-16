/**
 * Queue Metrics Service
 * Tracks queue performance and health metrics
 */

import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from '../config';

interface QueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
  processingRate: number; // jobs per minute
  failureRate: number; // percentage
  avgProcessingTime: number; // milliseconds
  lastUpdated: string;
}

class QueueMetricsService {
  private metrics: Map<string, QueueMetrics> = new Map();
  private processingTimes: Map<string, number[]> = new Map(); // Store last 100 processing times
  private readonly MAX_PROCESSING_TIMES = 100;

  /**
   * Collect metrics for a queue
   */
  async collectMetrics(queue: Queue): Promise<QueueMetrics> {
    const queueName = queue.name;
    
    // Get job counts
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const failureRate = total > 0 ? (counts.failed / total) * 100 : 0;

    // Calculate processing rate (jobs completed in last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentCompleted = await queue.getJobs(['completed'], 0, 1000);
    const completedLastMinute = recentCompleted.filter(
      job => job.finishedOn && job.finishedOn > oneMinuteAgo
    ).length;

    // Calculate average processing time
    const processingTimes = this.processingTimes.get(queueName) || [];
    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const metrics: QueueMetrics = {
      queueName,
      ...counts,
      total,
      processingRate: completedLastMinute,
      failureRate: parseFloat(failureRate.toFixed(2)),
      avgProcessingTime: Math.round(avgProcessingTime),
      lastUpdated: new Date().toISOString(),
    };

    this.metrics.set(queueName, metrics);
    return metrics;
  }

  /**
   * Record job processing time
   */
  recordProcessingTime(queueName: string, duration: number): void {
    let times = this.processingTimes.get(queueName) || [];
    times.push(duration);

    // Keep only last N processing times
    if (times.length > this.MAX_PROCESSING_TIMES) {
      times = times.slice(-this.MAX_PROCESSING_TIMES);
    }

    this.processingTimes.set(queueName, times);
  }

  /**
   * Get metrics for a specific queue
   */
  getMetrics(queueName: string): QueueMetrics | undefined {
    return this.metrics.get(queueName);
  }

  /**
   * Get metrics for all queues
   */
  getAllMetrics(): QueueMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get queue health status
   */
  getHealthStatus(queueName: string): 'healthy' | 'warning' | 'critical' {
    const metrics = this.metrics.get(queueName);
    
    if (!metrics) return 'warning';

    // Critical if failure rate > 50% or too many waiting jobs
    if (metrics.failureRate > 50 || metrics.waiting > 1000) {
      return 'critical';
    }

    // Warning if failure rate > 20% or many waiting jobs
    if (metrics.failureRate > 20 || metrics.waiting > 500) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Get summary of all queues
   */
  getSummary() {
    const allMetrics = this.getAllMetrics();
    
    return {
      totalQueues: allMetrics.length,
      totalJobs: allMetrics.reduce((sum, m) => sum + m.total, 0),
      totalWaiting: allMetrics.reduce((sum, m) => sum + m.waiting, 0),
      totalActive: allMetrics.reduce((sum, m) => sum + m.active, 0),
      totalCompleted: allMetrics.reduce((sum, m) => sum + m.completed, 0),
      totalFailed: allMetrics.reduce((sum, m) => sum + m.failed, 0),
      avgFailureRate: allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.failureRate, 0) / allMetrics.length
        : 0,
      healthyQueues: allMetrics.filter(m => this.getHealthStatus(m.queueName) === 'healthy').length,
      warningQueues: allMetrics.filter(m => this.getHealthStatus(m.queueName) === 'warning').length,
      criticalQueues: allMetrics.filter(m => this.getHealthStatus(m.queueName) === 'critical').length,
    };
  }

  /**
   * Start collecting metrics periodically
   */
  startCollecting(queues: Queue[], intervalMs = 30000): NodeJS.Timeout {
    const collect = async () => {
      for (const queue of queues) {
        try {
          await this.collectMetrics(queue);
        } catch (error) {
          console.error(`Failed to collect metrics for ${queue.name}:`, error);
        }
      }
    };

    // Initial collection
    collect();

    // Periodic collection
    return setInterval(collect, intervalMs);
  }
}

// Singleton instance
export const queueMetrics = new QueueMetricsService();
