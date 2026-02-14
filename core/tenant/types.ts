/**
 * Core Tenant Types
 * Multi-tenancy system type definitions
 */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'inactive';
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  whatsapp?: {
    max_sessions?: number;
    rate_limit?: number;
  };
  features?: {
    chatbot?: boolean;
    broadcast?: boolean;
    analytics?: boolean;
  };
  branding?: {
    logo?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

export interface Organization {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TenantContext {
  tenant: Tenant | null;
  organization: Organization | null;
  workspace: Workspace | null;
  isLoading: boolean;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  settings?: Partial<TenantSettings>;
}

export interface UpdateTenantInput {
  name?: string;
  status?: Tenant['status'];
  settings?: Partial<TenantSettings>;
}
