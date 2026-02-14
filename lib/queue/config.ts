/**
 * Queue Configuration
 * Redis + BullMQ setup for async processing
 */

import { ConnectionOptions } from 'bullmq';

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // 24 hours
    },
  },
};

export const QUEUE_NAMES = {
  WHATSAPP_SEND: 'whatsapp-send',
  WHATSAPP_RECEIVE: 'whatsapp-receive',
  CHATBOT_EXECUTE: 'chatbot-execute',
  BROADCAST_SEND: 'broadcast-send',
  WEBHOOK_DELIVER: 'webhook-deliver',
  AUDIT_LOG: 'audit-log',
} as const;
