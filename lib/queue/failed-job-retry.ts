/**
 * Failed Job Auto-Retry
 * Automatically retry failed jobs after a delay
 */

import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from './config';

interface RetryConfig {
  maxRetries: number; // Max times to retry a failed job
  retryDelay: number; // Delay in ms before retry (default: 5 minutes)
  checkInterval: number; // How often to check for failed jobs (default: 1 minute)
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3, // Retry failed jobs 3 more times
  retryDelay: 5 * 60 * 1000, // 5 minutes
  checkInterval: 60 * 1000, // 1 minute
};

export class FailedJobRetryManager {
  private queues: Map<string, Queue>;
  private config: RetryConfig;
  private intervalId?: NodeJS.Timeout;
  private retryCount: Map<string, number>; // Track retry count per job

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queues = new Map();
    this.retryCount = new Map();

    // Initialize queues
    Object.values(QUEUE_NAMES).forEach((queueName) => {
      this.queues.set(queueName, new Queue(queueName, { connection: redisConnection }));
    });
  }

  /**
   * Start auto-retry process
   */
  start() {
    console.log('🔄 Starting failed job auto-retry manager');
    console.log(`📋 Config: maxRetries=${this.config.maxRetries}, retryDelay=${this.config.retryDelay}ms, checkInterval=${this.config.checkInterval}ms`);

    // Initial check
    this.checkAndRetryFailedJobs();

    // Periodic check
    this.intervalId = setInterval(() => {
      this.checkAndRetryFailedJobs();
    }, this.config.checkInterval);
  }

  /**
   * Stop auto-retry process
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('🛑 Stopped failed job auto-retry manager');
    }
  }

  /**
   * Check and retry failed jobs
   */
  private async checkAndRetryFailedJobs() {
    for (const [queueName, queue] of this.queues.entries()) {
      try {
        const failedJobs = await queue.getFailed(0, 100); // Get first 100 failed jobs

        if (failedJobs.length === 0) continue;

        console.log(`🔍 Found ${failedJobs.length} failed jobs in queue: ${queueName}`);

        for (const job of failedJobs) {
          await this.retryJobIfEligible(queue, job, queueName);
        }
      } catch (error: any) {
        console.error(`❌ Error checking failed jobs in ${queueName}:`, error.message);
      }
    }
  }

  /**
   * Retry a job if eligible
   */
  private async retryJobIfEligible(queue: Queue, job: any, queueName: string) {
    try {
      const jobId = job.id;
      const retryKey = `${queueName}:${jobId}`;

      // Check if job has been retried too many times
      const currentRetries = this.retryCount.get(retryKey) || 0;
      if (currentRetries >= this.config.maxRetries) {
        console.log(`⏭️  Job ${jobId} exceeded max retries (${this.config.maxRetries}), skipping`);
        return;
      }

      // Check if enough time has passed since failure
      const failedAt = job.finishedOn || job.processedOn || Date.now();
      const timeSinceFailure = Date.now() - failedAt;

      if (timeSinceFailure < this.config.retryDelay) {
        // Not enough time has passed
        return;
      }

      // Retry the job
      console.log(`🔄 Retrying failed job ${jobId} in queue ${queueName} (attempt ${currentRetries + 1}/${this.config.maxRetries})`);

      // Add job back to queue with same data
      await queue.add(job.name || 'retry', job.data, {
        attempts: 3, // Give it 3 more attempts
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      // Increment retry count
      this.retryCount.set(retryKey, currentRetries + 1);

      // Remove old failed job
      await job.remove();

      console.log(`✅ Job ${jobId} re-queued successfully`);
    } catch (error: any) {
      console.error(`❌ Error retrying job ${job.id}:`, error.message);
    }
  }

  /**
   * Get retry statistics
   */
  async getStats() {
    const stats: Record<string, any> = {};

    for (const [queueName, queue] of this.queues.entries()) {
      const failedCount = await queue.getFailedCount();
      const waitingCount = await queue.getWaitingCount();
      const activeCount = await queue.getActiveCount();
      const completedCount = await queue.getCompletedCount();

      stats[queueName] = {
        failed: failedCount,
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
      };
    }

    return stats;
  }

  /**
   * Manually retry all failed jobs in a queue
   */
  async retryAllFailed(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failedJobs = await queue.getFailed(0, 1000);
    console.log(`🔄 Manually retrying ${failedJobs.length} failed jobs in ${queueName}`);

    let retried = 0;
    for (const job of failedJobs) {
      try {
        await queue.add(job.name || 'retry', job.data, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
        await job.remove();
        retried++;
      } catch (error: any) {
        console.error(`❌ Error retrying job ${job.id}:`, error.message);
      }
    }

    console.log(`✅ Retried ${retried}/${failedJobs.length} jobs`);
    return { total: failedJobs.length, retried };
  }

  /**
   * Clear retry count for a job (useful for testing)
   */
  clearRetryCount(queueName: string, jobId: string) {
    const retryKey = `${queueName}:${jobId}`;
    this.retryCount.delete(retryKey);
  }

  /**
   * Get retry count for a job
   */
  getRetryCount(queueName: string, jobId: string): number {
    const retryKey = `${queueName}:${jobId}`;
    return this.retryCount.get(retryKey) || 0;
  }
}

// Singleton instance
let retryManager: FailedJobRetryManager | null = null;

/**
 * Get or create retry manager instance
 */
export function getRetryManager(config?: Partial<RetryConfig>): FailedJobRetryManager {
  if (!retryManager) {
    retryManager = new FailedJobRetryManager(config);
  }
  return retryManager;
}

/**
 * Start auto-retry (convenience function)
 */
export function startAutoRetry(config?: Partial<RetryConfig>) {
  const manager = getRetryManager(config);
  manager.start();
  return manager;
}

/**
 * Stop auto-retry (convenience function)
 */
export function stopAutoRetry() {
  if (retryManager) {
    retryManager.stop();
  }
}
