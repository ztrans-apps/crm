/**
 * WhatsApp Session Manager
 * Multi-tenant session isolation and management
 * 
 * NOTE: This file is deprecated. We now use WhatsApp Business Cloud API.
 * See: lib/whatsapp/providers/meta-cloud-api.ts
 */

// Deprecated - using WhatsApp Business Cloud API instead
// import { Client, LocalAuth } from 'whatsapp-web.js';
import { createClient } from '@/lib/supabase/server';

interface SessionConfig {
  tenantId: string;
  sessionId: string;
  phoneNumber: string;
}

interface SessionInfo {
  client: Client;
  config: SessionConfig;
  status: 'initializing' | 'ready' | 'disconnected' | 'error';
  lastActivity: Date;
}

class WhatsAppSessionManager {
  private sessions: Map<string, SessionInfo> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;

  /**
   * Get session key (tenant + session)
   */
  private getSessionKey(tenantId: string, sessionId: string): string {
    return `${tenantId}:${sessionId}`;
  }

  /**
   * Initialize WhatsApp session
   */
  async initializeSession(config: SessionConfig): Promise<Client> {
    const sessionKey = this.getSessionKey(config.tenantId, config.sessionId);

    // Check if session already exists
    if (this.sessions.has(sessionKey)) {
      const existing = this.sessions.get(sessionKey)!;
      if (existing.status === 'ready') {
        console.log(`[Session] Using existing session: ${sessionKey}`);
        return existing.client;
      }
    }

    console.log(`[Session] Initializing new session: ${sessionKey}`);

    // Create WhatsApp client with tenant-specific auth
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionKey,
        dataPath: `./.wwebjs_auth/session-${config.sessionId}`,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    // Setup event handlers
    this.setupEventHandlers(client, config);

    // Store session info
    this.sessions.set(sessionKey, {
      client,
      config,
      status: 'initializing',
      lastActivity: new Date(),
    });

    // Initialize client
    await client.initialize();

    return client;
  }

  /**
   * Setup event handlers for client
   */
  private setupEventHandlers(client: Client, config: SessionConfig) {
    const sessionKey = this.getSessionKey(config.tenantId, config.sessionId);

    client.on('qr', (qr) => {
      console.log(`[Session:${sessionKey}] QR Code received`);
      // TODO: Send QR to frontend via WebSocket
      this.updateSessionStatus(sessionKey, 'initializing');
    });

    client.on('ready', async () => {
      console.log(`[Session:${sessionKey}] Client is ready`);
      this.updateSessionStatus(sessionKey, 'ready');
      this.reconnectAttempts.delete(sessionKey);
      
      // Update database
      await this.updateSessionInDatabase(config, 'active');
    });

    client.on('authenticated', () => {
      console.log(`[Session:${sessionKey}] Authenticated`);
    });

    client.on('auth_failure', (msg) => {
      console.error(`[Session:${sessionKey}] Auth failure:`, msg);
      this.updateSessionStatus(sessionKey, 'error');
    });

    client.on('disconnected', async (reason) => {
      console.log(`[Session:${sessionKey}] Disconnected:`, reason);
      this.updateSessionStatus(sessionKey, 'disconnected');
      
      // Attempt auto-reconnect
      await this.attemptReconnect(config);
    });

    client.on('message', async (message) => {
      // Update last activity
      this.updateLastActivity(sessionKey);
      
      // TODO: Queue message for processing
      console.log(`[Session:${sessionKey}] Message received from ${message.from}`);
    });
  }

  /**
   * Update session status
   */
  private updateSessionStatus(
    sessionKey: string,
    status: SessionInfo['status']
  ) {
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.status = status;
      session.lastActivity = new Date();
    }
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(sessionKey: string) {
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Attempt to reconnect session
   */
  private async attemptReconnect(config: SessionConfig) {
    const sessionKey = this.getSessionKey(config.tenantId, config.sessionId);
    const attempts = this.reconnectAttempts.get(sessionKey) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[Session:${sessionKey}] Max reconnect attempts reached`);
      await this.updateSessionInDatabase(config, 'disconnected');
      return;
    }

    console.log(`[Session:${sessionKey}] Reconnect attempt ${attempts + 1}/${this.maxReconnectAttempts}`);
    this.reconnectAttempts.set(sessionKey, attempts + 1);

    // Wait before reconnecting (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.initializeSession(config);
    } catch (error) {
      console.error(`[Session:${sessionKey}] Reconnect failed:`, error);
    }
  }

  /**
   * Update session in database
   */
  private async updateSessionInDatabase(
    config: SessionConfig,
    status: string
  ) {
    try {
      const supabase = await createClient();
      await supabase
        .from('whatsapp_sessions')
        .update({
          status,
          last_activity: new Date().toISOString(),
        })
        .eq('id', config.sessionId)
        .eq('tenant_id', config.tenantId);
    } catch (error) {
      console.error('[Session] Failed to update database:', error);
    }
  }

  /**
   * Get session
   */
  getSession(tenantId: string, sessionId: string): Client | null {
    const sessionKey = this.getSessionKey(tenantId, sessionId);
    const session = this.sessions.get(sessionKey);
    return session?.status === 'ready' ? session.client : null;
  }

  /**
   * Disconnect session
   */
  async disconnectSession(tenantId: string, sessionId: string) {
    const sessionKey = this.getSessionKey(tenantId, sessionId);
    const session = this.sessions.get(sessionKey);

    if (session) {
      console.log(`[Session] Disconnecting: ${sessionKey}`);
      await session.client.destroy();
      this.sessions.delete(sessionKey);
      this.reconnectAttempts.delete(sessionKey);
      
      await this.updateSessionInDatabase(session.config, 'disconnected');
    }
  }

  /**
   * Get all sessions for tenant
   */
  getTenantSessions(tenantId: string): SessionInfo[] {
    const sessions: SessionInfo[] = [];
    for (const [key, session] of this.sessions.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Get session status
   */
  getSessionStatus(tenantId: string, sessionId: string): SessionInfo['status'] | null {
    const sessionKey = this.getSessionKey(tenantId, sessionId);
    return this.sessions.get(sessionKey)?.status || null;
  }
}

// Singleton instance
export const sessionManager = new WhatsAppSessionManager();
