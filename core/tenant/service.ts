/**
 * Core Tenant Service
 * Multi-tenancy operations
 */

import { createClient } from '@/lib/supabase/server';
import type { 
  Tenant, 
  Organization, 
  Workspace,
  CreateTenantInput,
  UpdateTenantInput 
} from './types';

export class TenantService {
  /**
   * Get tenant by ID
   */
  async getTenant(id: string): Promise<Tenant | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tenant:', error);
      throw error;
    }
    return data;
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching tenant by slug:', error);
      throw error;
    }
    return data;
  }

  /**
   * Create new tenant
   */
  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        name: input.name,
        slug: input.slug,
        settings: input.settings || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update tenant
   */
  async updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tenants')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete tenant
   */
  async deleteTenant(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * List all tenants
   */
  async listTenants(): Promise<Tenant[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get organizations for tenant
   */
  async getOrganizations(tenantId: string): Promise<Organization[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error);
      // Return empty array if table doesn't exist yet
      return [];
    }
    return data || [];
  }

  /**
   * Get workspaces for organization
   */
  async getWorkspaces(organizationId: string): Promise<Workspace[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error);
      return [];
    }
    return data || [];
  }
}
