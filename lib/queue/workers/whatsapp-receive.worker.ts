/**
 * WhatsApp Receive Worker
 * Processes incoming WhatsApp messages
 */

import { Worker, Job } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../config';

interface ReceiveMessageJob {
  tenantId: string;
  sessionId: string;
  from: string;
  message: string;
  type: 'text' | 'media' | 'location';
  mediaUrl?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

async function processReceiveMessage(job: Job<ReceiveMessageJob>) {
  const { tenantId, sessionId, from, message, type, metadata } = job.data;

  console.log(`[WhatsApp:Receive] Processing message from ${from} for tenant ${tenantId}`);

  try {
    // TODO: Implement message processing logic
    // 1. Save to database
    // 2. Check for chatbot triggers
    // 3. Notify agents
    // 4. Update conversation status

    await job.updateProgress(25);

    // Simulate database save
    console.log(`[WhatsApp:Receive] Saving message to database`);
    await new Promise(resolve => setTimeout(resolve, 50));

    await job.updateProgress(50);

    // Check chatbot triggers
    console.log(`[WhatsApp:Receive] Checking chatbot triggers`);
    await new Promise(resolve => setTimeout(resolve, 50));

    await job.updateProgress(75);

    // Notify agents
    console.log(`[WhatsApp:Receive] Notifying agents`);
    await new Promise(resolve => setTimeout(resolve, 50));

    await job.updateProgress(100);

    return {
      success: true,
      conversationId: `conv_${Date.now()}`,
      messageId: `msg_${Date.now()}`,
    };
  } catch (error) {
    console.error(`[WhatsApp:Receive] Error:`, error);
    throw error;
  }
}

// Create worker
export const whatsappReceiveWorker = new Worker(
  QUEUE_NAMES.WHATSAPP_RECEIVE,
  processReceiveMessage,
  {
    connection: redisConnection,
    concurrency: 10, // Process 10 messages concurrently
  }
);

whatsappReceiveWorker.on('completed', (job) => {
  console.log(`[WhatsApp:Receive] Job ${job.id} completed`);
});

whatsappReceiveWorker.on('failed', (job, err) => {
  console.error(`[WhatsApp:Receive] Job ${job?.id} failed:`, err);
});
