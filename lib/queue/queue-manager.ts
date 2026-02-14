/**
 * Queue Manager
 * Centralized queue management with BullMQ
 */

import { Queue, QueueEvents } from 'bullmq';
import { redisConnection, queueConfig, QUEUE_NAMES } from './config';

class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  /**
   * Get or create queue
   */
  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: redisConnection,
        defaultJobOptions: queueConfig.defaultJobOptions,
      });
      this.queues.set(name, queue);

      // Setup queue events
      const events = new QueueEvents(name, { connection: redisConnection });
      this.queueEvents.set(name, events);

      // Log events
      events.on('completed', ({ jobId }) => {
        console.log(`[Queue:${name}] Job ${jobId} completed`);
      });

      events.on('failed', ({ jobId, failedReason }) => {
        console.error(`[Queue:${name}] Job ${jobId} failed:`, failedReason);
      });
    }

    return this.queues.get(name)!;
  }

  /**
   * Add job to queue
   */
  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    }
  ) {
    const queue = this.getQueue(queueName);
    return await queue.add(jobName, data, options);
  }

  /**
   * Close all queues
   */
  async closeAll() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const events of this.queueEvents.values()) {
      await events.close();
    }
    this.queues.clear();
    this.queueEvents.clear();
  }
}

// Singleton instance
export const queueManager = new QueueManager();

// Export queue names for convenience
export { QUEUE_NAMES };
