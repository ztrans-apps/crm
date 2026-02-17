/**
 * Production Logger
 * Centralized logging for queue workers
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Helper functions
export const logBroadcastStart = (campaignId: string, recipientCount: number) => {
  logger.info({
    event: 'broadcast_start',
    campaignId,
    recipientCount
  }, `Starting broadcast campaign ${campaignId} with ${recipientCount} recipients`);
};

export const logBroadcastComplete = (campaignId: string, stats: any) => {
  logger.info({
    event: 'broadcast_complete',
    campaignId,
    ...stats
  }, `Broadcast campaign ${campaignId} completed`);
};

export const logBroadcastError = (campaignId: string, error: Error) => {
  logger.error({
    event: 'broadcast_error',
    campaignId,
    error: error.message,
    stack: error.stack
  }, `Broadcast campaign ${campaignId} failed`);
};
