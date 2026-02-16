import { BaseModule } from '@/core/modules';
import type { ModuleContext, RouteDefinition, ComponentRegistry } from '@/core/modules';

export class ChatbotModule extends BaseModule {
  name = 'chatbot';
  version = '1.0.0';
  description = 'AI Chatbot Automation Module';
  dependencies = ['core-auth', 'core-tenant', 'whatsapp'];
  
  protected requiredFeature = 'advanced_automation';

  async initialize(context: ModuleContext): Promise<void> {
    await super.initialize(context);
    console.log('✅ Chatbot module initialized');
  }

  getRoutes(): RouteDefinition[] {
    return [
      {
        path: '/api/chatbot/flows',
        method: 'GET',
        handler: async (req) => {
          const tenantId = req.headers.get('x-tenant-id');
          if (!tenantId) {
            return Response.json({ error: 'Tenant ID required' }, { status: 400 });
          }

          // TODO: Implement flow fetching
          return Response.json({ flows: [] });
        },
      },
      {
        path: '/api/chatbot/flows',
        method: 'POST',
        handler: async (req) => {
          const tenantId = req.headers.get('x-tenant-id');
          if (!tenantId) {
            return Response.json({ error: 'Tenant ID required' }, { status: 400 });
          }

          const body = await req.json();
          // TODO: Implement flow creation
          return Response.json({ flow: body });
        },
      },
    ];
  }

  getComponents(): ComponentRegistry {
    return {
      FlowBuilder: () => import('./components/FlowBuilder').then(m => m.FlowBuilder),
      FlowList: () => import('./components/FlowList').then(m => m.FlowList),
    };
  }
}
