/**
 * Retry Failed Jobs API
 * Endpoint to manually retry failed jobs in queues
 */

import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '@/lib/queue/config';

export async function POST(request: Request) {
  try {
    const { queueName } = await request.json();

    // Validate queue name
    const validQueues = Object.values(QUEUE_NAMES);
    if (queueName && !validQueues.includes(queueName)) {
      return NextResponse.json(
        { error: 'Invalid queue name' },
        { status: 400 }
      );
    }

    const results: Record<string, any> = {};

    // If specific queue provided, retry only that queue
    // Otherwise retry all queues
    const queuesToProcess = queueName 
      ? [queueName] 
      : [
          QUEUE_NAMES.WHATSAPP_SEND,
          QUEUE_NAMES.WHATSAPP_RECEIVE,
          QUEUE_NAMES.BROADCAST_SEND,
          QUEUE_NAMES.WEBHOOK_DELIVER,
        ];

    for (const name of queuesToProcess) {
      const queue = new Queue(name, { connection: redisConnection });

      try {
        // Get all failed jobs
        const failedJobs = await queue.getFailed();

        if (failedJobs.length === 0) {
          results[name] = {
            success: true,
            retriedCount: 0,
            message: 'No failed jobs found',
          };
          continue;
        }

        let retriedCount = 0;
        const errors: string[] = [];

        // Retry each failed job
        for (const job of failedJobs) {
          try {
            await job.retry();
            retriedCount++;
          } catch (error: any) {
            errors.push(`Job ${job.id}: ${error.message}`);
          }
        }

        results[name] = {
          success: true,
          retriedCount,
          totalFailed: failedJobs.length,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error: any) {
        results[name] = {
          success: false,
          error: error.message,
        };
      } finally {
        await queue.close();
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('[Retry Failed Jobs] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retry jobs' },
      { status: 500 }
    );
  }
}
