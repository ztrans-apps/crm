#!/usr/bin/env tsx
/**
 * Start Queue Workers
 * Run: npx tsx scripts/start-workers.ts
 */

import { startAllWorkers, stopAllWorkers } from '../lib/queue/workers';

console.log('🚀 Starting queue workers...');
console.log('📋 Workers:');
console.log('  - whatsapp:send (outgoing messages)');
console.log('  - whatsapp:receive (incoming messages)');
console.log('  - webhook:delivery (webhook deliveries)');
console.log('  - broadcast:send (broadcast campaigns)');
console.log('');

try {
  startAllWorkers();
  console.log('✅ All workers started successfully');
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
