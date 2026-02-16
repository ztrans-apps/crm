/**
 * WhatsApp Module
 * Platform-level exports
 */

export * from './types';
export { WhatsAppService } from './services/whatsapp.service';
export { WhatsAppModule } from './module';

// Legacy exports (for backward compatibility)
export { SessionManager } from './core/session-manager';
export { MessageQueue } from './core/message-queue';
export { WebhookRouter } from './core/webhook-router';
