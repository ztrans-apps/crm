/**
 * WhatsApp Send Worker
 * Processes outgoing WhatsApp messages using Baileys
 */

import { Worker, Job } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../config';
import { deadLetterQueue } from '../services/dead-letter-queue';
import { queueMetrics } from '../services/queue-metrics';

interface SendMessageJob {
  tenantId: string;
  sessionId: string;
  to: string;
  message: string;
  type: 'text' | 'media' | 'location';
  mediaBuffer?: Buffer;
  mimetype?: string;
  caption?: string;
  filename?: string;
  latitude?: number;
  longitude?: number;
  quotedMessageId?: string;
  metadata?: Record<string, any>;
  conversationId?: string;
  messageDbId?: string; // Database message ID to update after sending
}

async function processSendMessage(job: Job<SendMessageJob>) {
  const { 
    tenantId, 
    sessionId, 
    to, 
    message, 
    type, 
    mediaBuffer,
    mimetype,
    caption,
    filename,
    latitude, 
    longitude,
    quotedMessageId,
    metadata,
    conversationId,
    messageDbId
  } = job.data;

  console.log(`[WhatsApp:Send] Processing ${type} message for tenant ${tenantId}`);

  try {
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
    
    await job.updateProgress(25);

    let result;

    switch (type) {
      case 'text': {
        // Call WhatsApp service API
        const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            to,
            message,
            quotedMessageId,
            tenantId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send message');
        }

        result = await response.json();
        break;
      }

      case 'media': {
        if (!mediaBuffer || !mimetype) {
          throw new Error('Media buffer and mimetype required for media messages');
        }

        // Convert buffer to base64 for JSON transport
        const mediaBase64 = mediaBuffer.toString('base64');

        const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send-media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            to,
            mediaBase64,
            mimetype,
            caption,
            filename,
            tenantId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send media');
        }

        result = await response.json();
        break;
      }

      case 'location': {
        if (latitude === undefined || longitude === undefined) {
          throw new Error('Latitude and longitude required for location messages');
        }

        const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send-location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            to,
            latitude,
            longitude,
            metadata,
            tenantId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send location');
        }

        result = await response.json();
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    await job.updateProgress(75);

    // Update database with whatsapp_message_id if messageDbId provided
    if (messageDbId && result.messageId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase
          .from('messages')
          .update({
            whatsapp_message_id: result.messageId,
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', messageDbId);

        console.log(`[WhatsApp:Send] Updated message ${messageDbId} with whatsapp_message_id: ${result.messageId}`);
      } catch (dbError) {
        console.error(`[WhatsApp:Send] Failed to update database:`, dbError);
        // Don't fail the job if database update fails
      }
    }

    await job.updateProgress(100);

    console.log(`[WhatsApp:Send] Message sent successfully:`, result.messageId);

    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error(`[WhatsApp:Send] Error:`, error.message);
    throw error;
  }
}

// Create worker
export const whatsappSendWorker = new Worker(
  QUEUE_NAMES.WHATSAPP_SEND,
  processSendMessage,
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 messages concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second (rate limiting)
    },
  }
);

whatsappSendWorker.on('completed', (job) => {
  console.log(`[WhatsApp:Send] Job ${job.id} completed`);
  
  // Record processing time for metrics
  if (job.finishedOn && job.processedOn) {
    const duration = job.finishedOn - job.processedOn;
    queueMetrics.recordProcessingTime(QUEUE_NAMES.WHATSAPP_SEND, duration);
  }
});

whatsappSendWorker.on('failed', async (job, err) => {
  console.error(`[WhatsApp:Send] Job ${job?.id} failed:`, err.message);
  
  // Move to DLQ if all attempts exhausted
  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    console.log(`[WhatsApp:Send] Job ${job.id} exhausted all attempts, moving to DLQ`);
    await deadLetterQueue.moveToDeadLetter(QUEUE_NAMES.WHATSAPP_SEND, job, err);
  }
});
