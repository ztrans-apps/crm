import type { NextRequest } from 'next/server';

export interface ModuleContext {
  tenantId?: string;
  userId?: string;
  config: Record<string, any>;
}

export interface RouteDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: (req: NextRequest) => Promise<Response>;
  middleware?: Array<(req: NextRequest) => Promise<NextRequest | Response>>;
}

export interface ComponentRegistry {
  [key: string]: React.ComponentType<any>;
}

export interface Module {
  // Metadata
  name: string;
  version: string;
  description?: string;
  dependencies: string[];

  // Lifecycle hooks
  initialize(context: ModuleContext): Promise<void>;
  destroy(): Promise<void>;

  // Feature flags
  isEnabled(tenantId: string): Promise<boolean>;

  // API routes
  getRoutes(): RouteDefinition[];

  // UI components
  getComponents(): ComponentRegistry;

  // Configuration
  getConfig?(): Record<string, any>;
  updateConfig?(config: Record<string, any>): Promise<void>;
}

export interface ModuleMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies: string[];
  requiredFeatures?: string[];
  icon?: string;
  category?: 'communication' | 'crm' | 'automation' | 'analytics' | 'integration';
}
