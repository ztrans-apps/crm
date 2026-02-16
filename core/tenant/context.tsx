/**
 * Core Tenant Context
 * React context for tenant data
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { TenantContext, Tenant, Organization, Workspace } from './types';

const TenantContextInstance = createContext<TenantContext>({
  tenant: null,
  organization: null,
  workspace: null,
  isLoading: true,
});

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant?: Tenant | null;
  initialOrganization?: Organization | null;
  initialWorkspace?: Workspace | null;
}

export function TenantProvider({
  children,
  initialTenant = null,
  initialOrganization = null,
  initialWorkspace = null,
}: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant);
  const [organization, setOrganization] = useState<Organization | null>(initialOrganization);
  const [workspace, setWorkspace] = useState<Workspace | null>(initialWorkspace);
  const [isLoading, setIsLoading] = useState(!initialTenant);

  useEffect(() => {
    // Fetch tenant data if not provided
    if (!initialTenant) {
      fetchTenantData();
    }
  }, [initialTenant]);

  async function fetchTenantData() {
    try {
      setIsLoading(true);
      
      // Fetch from API
      const response = await fetch('/api/tenant/current');
      if (!response.ok) throw new Error('Failed to fetch tenant');
      
      const data = await response.json();
      setTenant(data.tenant);
      setOrganization(data.organization);
      setWorkspace(data.workspace);
    } catch (error) {
      console.error('Error fetching tenant:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TenantContextInstance.Provider
      value={{
        tenant,
        organization,
        workspace,
        isLoading,
      }}
    >
      {children}
    </TenantContextInstance.Provider>
  );
}

/**
 * Hook to access tenant context
 */
export function useTenant() {
  const context = useContext(TenantContextInstance);
  
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }

  return context;
}

/**
 * Hook to get tenant ID
 */
export function useTenantId(): string | null {
  const { tenant } = useTenant();
  return tenant?.id || null;
}
