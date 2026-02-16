/**
 * Check Queue Status Script
 * Display detailed queue information
 */

import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../lib/queue/config';

async function checkQueue(queueName: string) {
  const queue = new Queue(queueName, { connection: redisConnection });

  try {
    console.log(`\n📋 Queue: ${queueName}`);
    console.log('─'.repeat(60));

    // Get counts
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    console.log(`   Waiting:   ${waiting.toString().padStart(6)} jobs`);
    console.log(`   Active:    ${active.toString().padStart(6)} jobs`);
    console.log(`   Completed: ${completed.toString().padStart(6)} jobs`);
    console.log(`   Failed:    ${failed.toString().padStart(6)} jobs`);
    console.log(`   Delayed:   ${delayed.toString().padStart(6)} jobs`);
    console.log(`   ─────────────────────────`);
    console.log(`   Total:     ${(waiting + active + completed + failed + delayed).toString().padStart(6)} jobs`);

    // Show recent failed jobs if any
    if (failed > 0) {
      console.log(`\n   ❌ Recent Failed Jobs:`);
      const failedJobs = await queue.getFailed(0, 2); // Last 3
      
      for (const job of failedJobs) {
        console.log(`      • Job ${job.id}`);
        console.log(`        Reason: ${job.failedReason}`);
        console.log(`        Attempts: ${job.attemptsMade}/${job.opts.attempts || 3}`);
        console.log(`        Data: ${JSON.stringify(job.data).substring(0, 100)}...`);
      }
    }

    // Show recent completed jobs
    if (completed > 0) {
      console.log(`\n   ✅ Recent Completed Jobs:`);
      const completedJobs = await queue.getCompleted(0, 2); // Last 3
      
      for (const job of completedJobs) {
        const duration = job.finishedOn && job.processedOn 
          ? job.finishedOn - job.processedOn 
          : 0;
        console.log(`      • Job ${job.id} (${duration}ms)`);
      }
    }

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
  } finally {
    await queue.close();
  }
}

async function main() {
  console.log('\n🚀 Checking Queue Status...');
  console.log('═'.repeat(60));

  const queues = [
    QUEUE_NAMES.WHATSAPP_SEND,
    QUEUE_NAMES.WHATSAPP_RECEIVE,
    QUEUE_NAMES.BROADCAST_SEND,
    QUEUE_NAMES.WEBHOOK_DELIVER,
  ];

  for (const queueName of queues) {
    await checkQueue(queueName);
  }

  console.log('\n═'.repeat(60));
  console.log('✅ Done\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
