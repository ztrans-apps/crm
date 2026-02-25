/**
 * WhatsApp Send Worker
 * Processes outgoing WhatsApp messages using Meta Cloud API (Official)
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
  mediaUrl?: string;
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

/**
 * Call Meta Cloud API to send WhatsApp messages
 */
async function callMetaApi(phoneNumberId: string, apiToken: string, body: any): Promise<any> {
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Meta Cloud API error: ${errorMsg}`);
  }

  return data;
}

async function processSendMessage(job: Job<SendMessageJob>) {
  const { 
    tenantId, 
    sessionId, 
    to, 
    message, 
    type, 
    mediaBuffer,
    mediaUrl,
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
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const apiToken = process.env.WHATSAPP_API_TOKEN || '';

    if (!phoneNumberId || !apiToken) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_API_TOKEN environment variables are required');
    }

    const formattedTo = to.replace(/\D/g, '');
    
    await job.updateProgress(25);

    let result: any;

    switch (type) {
      case 'text': {
        const data = await callMetaApi(phoneNumberId, apiToken, {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'text',
          text: {
            preview_url: true,
            body: message,
          },
        });

        result = { messageId: data.messages?.[0]?.id };
        break;
      }

      case 'media': {
        // Determine media type from mimetype
        let mediaType = 'document';
        if (mimetype?.startsWith('image/')) mediaType = 'image';
        else if (mimetype?.startsWith('video/')) mediaType = 'video';
        else if (mimetype?.startsWith('audio/')) mediaType = 'audio';

        const mediaPayload: any = {};
        
        if (mediaUrl) {
          mediaPayload.link = mediaUrl;
        } else if (mediaBuffer) {
          // Upload media first
          const uploadUrl = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0'}/${phoneNumberId}/media`;
          const formData = new FormData();
          formData.append('messaging_product', 'whatsapp');
          formData.append('file', new Blob([mediaBuffer], { type: mimetype }), filename || `upload_${Date.now()}`);

          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiToken}` },
            body: formData,
          });

          const uploadData = await uploadResponse.json() as any;
          if (!uploadResponse.ok) {
            throw new Error(`Media upload failed: ${uploadData?.error?.message || 'Unknown error'}`);
          }
          mediaPayload.id = uploadData.id;
        } else {
          throw new Error('Media buffer or URL required for media messages');
        }

        if (caption) mediaPayload.caption = caption;
        if (mediaType === 'document' && filename) mediaPayload.filename = filename;

        const body: any = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: mediaType,
        };
        body[mediaType] = mediaPayload;

        const data = await callMetaApi(phoneNumberId, apiToken, body);
        result = { messageId: data.messages?.[0]?.id };
        break;
      }

      case 'location': {
        if (latitude === undefined || longitude === undefined) {
          throw new Error('Latitude and longitude required for location messages');
        }

        const data = await callMetaApi(phoneNumberId, apiToken, {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'location',
          location: {
            latitude,
            longitude,
            name: metadata?.name || '',
            address: metadata?.address || '',
          },
        });

        result = { messageId: data.messages?.[0]?.id };
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

        const updateResponse = await fetch(`${appUrl}/api/messages/${messageDbId}/update-metadata`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            whatsapp_message_id: result.messageId,
            raw_message: {
              key: { id: result.messageId, fromMe: true, remoteJid: to },
              messageTimestamp: Math.floor(Date.now() / 1000),
              message: type === 'text' ? { conversation: message } : undefined,
            },
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
