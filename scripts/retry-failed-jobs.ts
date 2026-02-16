/**
 * Retry Failed Jobs Script
 * Manually retry all failed jobs in a queue
 */

import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../lib/queue/config';

async function retryFailedJobs(queueName: string) {
  const queue = new Queue(queueName, { connection: redisConnection });

  try {
    console.log(`\n🔍 Checking failed jobs in queue: ${queueName}`);

    // Get all failed jobs
    const failedJobs = await queue.getFailed();

    if (failedJobs.length === 0) {
      console.log(`✅ No failed jobs found in ${queueName}`);
      return;
    }

    console.log(`📋 Found ${failedJobs.length} failed job(s)`);

    // Retry each failed job
    for (const job of failedJobs) {
      try {
        console.log(`🔄 Retrying job ${job.id}: ${job.name}`);
        await job.retry();
        console.log(`✅ Job ${job.id} queued for retry`);
      } catch (error: any) {
        console.error(`❌ Failed to retry job ${job.id}:`, error.message);
      }
    }

    console.log(`\n✅ Retry process completed for ${queueName}`);
  } catch (error: any) {
    console.error(`❌ Error processing queue ${queueName}:`, error.message);
  } finally {
    await queue.close();
  }
}

async function main() {
  console.log('🚀 Starting failed jobs retry process...\n');

  const queuesToCheck = [
    QUEUE_NAMES.WHATSAPP_SEND,
    QUEUE_NAMES.WHATSAPP_RECEIVE,
    QUEUE_NAMES.BROADCAST_SEND,
    QUEUE_NAMES.WEBHOOK_DELIVER,
  ];

  for (const queueName of queuesToCheck) {
    await retryFailedJobs(queueName);
  }

  console.log('\n✅ All queues processed');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
