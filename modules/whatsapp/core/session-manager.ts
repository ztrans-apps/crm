/**
 * WhatsApp Session Manager (legacy stub)
 * In-process whatsapp-web.js sessions are no longer used.
 * Runtime sessions are handled by whatsapp-service (Baileys).
 */

interface SessionConfig {
  tenantId: string;
  sessionId: string;
  phoneNumber: string;
}

type SessionClient = {
  sendMessage: (chatId: string, message: string) => Promise<{ id: { id: string } }>;
};

interface SessionInfo {
  client: SessionClient;
  config: SessionConfig;
  status: 'initializing' | 'ready' | 'disconnected' | 'error';
  lastActivity: Date;
}

class WhatsAppSessionManager {
  private sessions: Map<string, SessionInfo> = new Map();

  private getSessionKey(tenantId: string, sessionId: string): string {
    return `${tenantId}:${sessionId}`;
  }

  async initializeSession(_config: SessionConfig): Promise<SessionClient> {
    throw new Error(
      'In-app WhatsApp sessions are disabled. Use Baileys whatsapp-service instead.'
    );
  }

  getSession(tenantId: string, sessionId: string): SessionClient | null {
    return this.sessions.get(this.getSessionKey(tenantId, sessionId))?.client ?? null;
  }

  getStatus(tenantId: string, sessionId: string): SessionInfo['status'] | null {
    return this.sessions.get(this.getSessionKey(tenantId, sessionId))?.status ?? null;
  }

  async disconnectSession(tenantId: string, sessionId: string): Promise<void> {
    this.sessions.delete(this.getSessionKey(tenantId, sessionId));
  }

  getAllSessions(tenantId?: string): SessionInfo[] {
    const all = Array.from(this.sessions.values());
    if (!tenantId) return all;
    return all.filter((s) => s.config.tenantId === tenantId);
  }
}

export const sessionManager = new WhatsAppSessionManager();
export { WhatsAppSessionManager as SessionManager };
