import { BaseModule } from '@/core/modules';
import type { ModuleContext, RouteDefinition, ComponentRegistry } from '@/core/modules';
import { WhatsAppService } from './services/whatsapp.service';

export class WhatsAppModule extends BaseModule {
  name = 'whatsapp';
  version = '1.0.0';
  description = 'WhatsApp Business Integration Module';
  dependencies = ['core-auth', 'core-tenant'];
  
  protected requiredFeature = 'whatsapp';

  private service?: WhatsAppService;

  async initialize(context: ModuleContext): Promise<void> {
    await super.initialize(context);
    
    // Initialize WhatsApp service
    this.service = new WhatsAppService();
    
    console.log('✅ WhatsApp module initialized');
  }

  async destroy(): Promise<void> {
    // Cleanup WhatsApp connections
    if (this.service) {
      await this.service.cleanup();
    }
    
    await super.destroy();
  }

  getRoutes(): RouteDefinition[] {
    return [
      {
        path: '/api/whatsapp/sessions',
        method: 'GET',
        handler: async (req) => {
          const tenantId = req.headers.get('x-tenant-id');
          if (!tenantId) {
            return Response.json({ error: 'Tenant ID required' }, { status: 400 });
          }

          const sessions = await this.service?.getSessions(tenantId);
          return Response.json({ sessions });
        },
      },
      {
        path: '/api/whatsapp/sessions',
        method: 'POST',
        handler: async (req) => {
          const tenantId = req.headers.get('x-tenant-id');
          if (!tenantId) {
            return Response.json({ error: 'Tenant ID required' }, { status: 400 });
          }

          const body = await req.json();
          const session = await this.service?.createSession(tenantId, body);
          return Response.json({ session });
        },
      },
      {
        path: '/api/whatsapp/send',
        method: 'POST',
        handler: async (req) => {
          const tenantId = req.headers.get('x-tenant-id');
          if (!tenantId) {
            return Response.json({ error: 'Tenant ID required' }, { status: 400 });
          }

          const body = await req.json();
          const result = await this.service?.sendMessage(
            tenantId,
            body.sessionId,
            body.to,
            body.message
          );
          return Response.json({ result });
        },
      },
    ];
  }

  getComponents(): ComponentRegistry {
    return {
      WhatsAppSessionList: () => import('./components/SessionList').then(m => m.SessionList),
      WhatsAppSessionMonitor: () => import('./components/SessionMonitor').then(m => m.SessionMonitor),
    };
  }

  getConfig(): Record<string, any> {
    return {
      // Meta Cloud API configuration
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
      maxNumbers: 10,
    };
  }
}
