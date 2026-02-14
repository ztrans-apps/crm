/**
 * WhatsApp Send Worker
 * Processes outgoing WhatsApp messages using Baileys
 */

import { Worker, Job } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../config';

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
    metadata 
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
});

whatsappSendWorker.on('failed', (job, err) => {
  console.error(`[WhatsApp:Send] Job ${job?.id} failed:`, err.message);
});
