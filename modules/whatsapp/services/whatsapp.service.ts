/**
 * WhatsApp Service
 * Uses Meta WhatsApp Business Cloud API via internal API routes
 * Migrated from Baileys (localhost:3001) to Meta Cloud API
 */
export class WhatsAppService {
  /**
   * Get all sessions for a tenant via internal API
   */
  async getSessions(tenantId: string): Promise<any[]> {
    try {
      const response = await fetch('/api/whatsapp/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  /**
   * Register a new WhatsApp number (Meta Cloud API)
   */
  async createSession(tenantId: string, config: { phone_number: string; session_name: string; meta_phone_number_id?: string }): Promise<any> {
    try {
      const response = await fetch('/api/whatsapp/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to register number');
      return await response.json();
    } catch (error) {
      console.error('Error registering number:', error);
      throw error;
    }
  }

  /**
   * Send a message via internal API (uses Meta Cloud API)
   */
  async sendMessage(
    tenantId: string,
    sessionId: string,
    to: string,
    message: string
  ): Promise<any> {
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, to, message }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No persistent connection to clean up with Meta Cloud API
  }
}
