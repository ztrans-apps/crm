/**
 * WhatsApp Service
 * Communicates with the separate WhatsApp service (port 3001)
 */
export class WhatsAppService {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
  }

  /**
   * Get all sessions for a tenant
   */
  async getSessions(tenantId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.serviceUrl}/api/sessions?tenantId=${tenantId}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      
      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  /**
   * Create a new WhatsApp session
   */
  async createSession(tenantId: string, config: any): Promise<any> {
    try {
      const response = await fetch(`${this.serviceUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...config }),
      });
      
      if (!response.ok) throw new Error('Failed to create session');
      
      return await response.json();
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    tenantId: string,
    sessionId: string,
    to: string,
    message: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.serviceUrl}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, sessionId, to, message }),
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
    // Cleanup logic if needed
    console.log('WhatsApp service cleanup');
  }
}
