/**
 * WhatsApp Module Types
 * Platform-level type definitions
 */

export interface WhatsAppSession {
  id: string;
  tenant_id: string;
  phone_number: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr';
  qr_code: string | null;
  last_seen: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SendMessageInput {
  to: string;
  message?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  reply_to?: string;
}

export interface IncomingMessage {
  id: string;
  from: string;
  to: string;
  message?: string;
  media_url?: string;
  media_type?: string;
  timestamp: string;
  is_group: boolean;
  group_id?: string;
}

export interface WebhookEvent {
  type: 'message' | 'status' | 'connection';
  tenant_id: string;
  session_id: string;
  data: any;
  timestamp: string;
}

export interface RateLimitConfig {
  max_messages_per_minute: number;
  max_messages_per_hour: number;
  max_messages_per_day: number;
}

export interface SessionHealth {
  session_id: string;
  is_healthy: boolean;
  last_activity: string;
  message_queue_size: number;
  error_count: number;
  uptime: number;
}
