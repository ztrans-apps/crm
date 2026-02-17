/**
 * Tenant utilities
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getCurrentTenant() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Get user's tenant from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      // Fallback: get default tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .limit(1)
        .single();
      
      return tenant;
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single();

    if (tenantError) {
      return null;
    }

    return tenant;
  } catch (error) {
    console.error('Error getting current tenant:', error);
    return null;
  }
}

export async function getTenantId(): Promise<string | null> {
  const tenant = await getCurrentTenant();
  return tenant?.id || null;
}
