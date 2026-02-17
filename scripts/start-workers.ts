#!/usr/bin/env tsx
/**
 * Start Queue Workers
 * Run: npx tsx scripts/start-workers.ts
 */

import '../lib/queue/workers/load-env'; // Load environment variables first
import { startAllWorkers, stopAllWorkers } from '../lib/queue/workers';
import { startAutoRetry, stopAutoRetry } from '../lib/queue/failed-job-retry';
import { startBroadcastScheduler } from '../lib/queue/jobs/broadcast-scheduler';

console.log('🚀 Starting queue workers...');
console.log('📋 Workers:');
console.log('  - whatsapp:send (outgoing messages)');
console.log('  - whatsapp:receive (incoming messages)');
console.log('  - webhook:delivery (webhook deliveries)');
console.log('  - broadcast:send (broadcast campaigns)');
console.log('');

let schedulerInterval: NodeJS.Timeout | null = null;

try {
  startAllWorkers();
  console.log('✅ All workers started successfully');
  console.log('');
  
  // Start auto-retry for failed jobs
  startAutoRetry({
    maxRetries: 3,           // Retry failed jobs 3 more times
    retryDelay: 5 * 60 * 1000, // Wait 5 minutes before retry
    checkInterval: 60 * 1000,  // Check every 1 minute
  });
  console.log('✅ Auto-retry for failed jobs started');
  console.log('');
  
  // Start broadcast scheduler
  schedulerInterval = startBroadcastScheduler();
  console.log('✅ Broadcast scheduler started');
  console.log('');
  
  console.log('Press Ctrl+C to stop workers');
} catch (error) {
  console.error('❌ Failed to start workers:', error);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Stopping workers...');
  try {
    stopAutoRetry();
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      console.log('✅ Broadcast scheduler stopped');
    }
    await stopAllWorkers();
    console.log('✅ All workers stopped');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error stopping workers:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping workers...');
  try {
    stopAutoRetry();
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      console.log('✅ Broadcast scheduler stopped');
    }
    await stopAllWorkers();
    console.log('✅ All workers stopped');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error stopping workers:', error);
    process.exit(1);
  }
});

// Keep process alive
process.stdin.resume();
