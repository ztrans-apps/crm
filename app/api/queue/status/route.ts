/**
 * Queue Status API
 * Get detailed status of all queues
 */

import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '@/lib/queue/config';

export async function GET() {
  try {
    const queues = [
      QUEUE_NAMES.WHATSAPP_SEND,
      QUEUE_NAMES.WHATSAPP_RECEIVE,
      QUEUE_NAMES.BROADCAST_SEND,
      QUEUE_NAMES.WEBHOOK_DELIVER,
    ];

    const results: Record<string, any> = {};

    for (const queueName of queues) {
      const queue = new Queue(queueName, { connection: redisConnection });

      try {
        // Get counts
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        // Get recent jobs
        const [recentCompleted, recentFailed] = await Promise.all([
          queue.getCompleted(0, 4), // Last 5 completed
          queue.getFailed(0, 4), // Last 5 failed
        ]);

        results[queueName] = {
          counts: {
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed,
          },
          recentCompleted: recentCompleted.map(job => ({
            id: job.id,
            name: job.name,
            timestamp: job.finishedOn,
            processedOn: job.processedOn,
            data: job.data,
          })),
          recentFailed: recentFailed.map(job => ({
            id: job.id,
            name: job.name,
            timestamp: job.finishedOn,
            failedReason: job.failedReason,
            attemptsMade: job.attemptsMade,
            data: job.data,
          })),
        };
      } catch (error: any) {
        results[queueName] = {
          error: error.message,
        };
      } finally {
        await queue.close();
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      queues: results,
    });
  } catch (error: any) {
    console.error('[Queue Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get queue status' },
      { status: 500 }
    );
  }
}
