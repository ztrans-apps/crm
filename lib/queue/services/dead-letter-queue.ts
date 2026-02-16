/**
 * Dead Letter Queue (DLQ) Service
 * Handles permanently failed jobs for manual review and retry
 */

import { Queue, Job } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../config';

interface DLQJob {
  originalQueue: string;
  originalJobId: string;
  originalJobName: string;
  originalData: any;
  failureReason: string;
  failedAt: string;
  attemptsMade: number;
  lastError: string;
}

class DeadLetterQueueService {
  private dlq: Queue;

  constructor() {
    this.dlq = new Queue(QUEUE_NAMES.DEAD_LETTER, {
      connection: redisConnection,
    });
  }

  /**
   * Move failed job to DLQ
   */
  async moveToDeadLetter(
    originalQueue: string,
    job: Job,
    error: Error
  ): Promise<void> {
    const dlqData: DLQJob = {
      originalQueue,
      originalJobId: job.id!,
      originalJobName: job.name,
      originalData: job.data,
      failureReason: error.message,
      failedAt: new Date().toISOString(),
      attemptsMade: job.attemptsMade,
      lastError: error.stack || error.message,
    };

    await this.dlq.add('failed-job', dlqData, {
      removeOnComplete: false, // Keep DLQ jobs indefinitely
      removeOnFail: false,
    });

    console.log(`📮 Moved job ${job.id} from ${originalQueue} to DLQ`);
  }

  /**
   * Retry job from DLQ
   */
  async retryFromDeadLetter(
    dlqJobId: string,
    targetQueue: Queue
  ): Promise<boolean> {
    try {
      const dlqJob = await this.dlq.getJob(dlqJobId);
      
      if (!dlqJob) {
        console.error(`DLQ job ${dlqJobId} not found`);
        return false;
      }

      const dlqData = dlqJob.data as DLQJob;

      // Re-add to original queue
      await targetQueue.add(
        dlqData.originalJobName,
        dlqData.originalData,
        {
          attempts: 1, // Give it one more chance
        }
      );

      // Remove from DLQ
      await dlqJob.remove();

      console.log(`🔄 Retried job ${dlqJobId} from DLQ to ${dlqData.originalQueue}`);
      return true;
    } catch (error) {
      console.error(`Failed to retry job from DLQ:`, error);
      return false;
    }
  }

  /**
   * Get all DLQ jobs
   */
  async getDeadLetterJobs(
    start = 0,
    end = 99
  ): Promise<Job[]> {
    return await this.dlq.getJobs(['waiting', 'active', 'completed', 'failed'], start, end);
  }

  /**
   * Get DLQ statistics
   */
  async getStats() {
    const counts = await this.dlq.getJobCounts('waiting', 'active', 'completed', 'failed');
    
    return {
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      ...counts,
    };
  }

  /**
   * Clear old DLQ jobs (older than specified days)
   */
  async cleanup(olderThanDays = 30): Promise<number> {
    const jobs = await this.getDeadLetterJobs(0, 1000);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleaned = 0;
    for (const job of jobs) {
      const dlqData = job.data as DLQJob;
      const failedAt = new Date(dlqData.failedAt);

      if (failedAt < cutoffDate) {
        await job.remove();
        cleaned++;
      }
    }

    console.log(`🧹 Cleaned ${cleaned} old DLQ jobs (older than ${olderThanDays} days)`);
    return cleaned;
  }

  /**
   * Get queue instance
   */
  getQueue(): Queue {
    return this.dlq;
  }
}

// Singleton instance
export const deadLetterQueue = new DeadLetterQueueService();
