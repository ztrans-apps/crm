/**
 * WhatsApp Send Worker
 * Processes outgoing WhatsApp messages using Baileys
 */

import 'dotenv/config'; // Load environment variables
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
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`);
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
    const isValidMessageDbId = messageDbId && 
                                messageDbId !== 'undefined' && 
                                typeof messageDbId === 'string' &&
                                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageDbId);
    
    if (isValidMessageDbId && result.messageId) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        const rawMessage: any = {
          key: result.key || {
            id: result.messageId,
            fromMe: true,
            remoteJid: to
          },
          messageTimestamp: Math.floor(Date.now() / 1000)
        };

        if (type === 'text') {
          rawMessage.message = { conversation: message };
        } else if (type === 'media' && caption) {
          rawMessage.message = { 
            imageMessage: { caption },
            videoMessage: { caption }
          };
        }

        const updateResponse = await fetch(`${appUrl}/api/messages/${messageDbId}/update-metadata`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            whatsapp_message_id: result.messageId,
            raw_message: rawMessage
          })
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`[WhatsApp:Send] Failed to update metadata (HTTP ${updateResponse.status}):`, errorText);
        }
      } catch (dbError: any) {
        console.error(`[WhatsApp:Send] Exception updating database:`, dbError.message);
      }
    }

    await job.updateProgress(100);

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
  if (job.finishedOn && job.processedOn) {
    const duration = job.finishedOn - job.processedOn;
    queueMetrics.recordProcessingTime(QUEUE_NAMES.WHATSAPP_SEND, duration);
  }
});

whatsappSendWorker.on('failed', async (job, err) => {
  console.error(`[WhatsApp:Send] Job ${job?.id} failed:`, err.message);
  
  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    await deadLetterQueue.moveToDeadLetter(QUEUE_NAMES.WHATSAPP_SEND, job, err);
  }
});
