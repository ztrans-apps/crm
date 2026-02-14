/**
 * Core Tenant Helpers
 * Utility functions for tenant operations
 */

import { headers } from 'next/headers';

/**
 * Get tenant ID from request headers (server component)
 */
export async function getTenantId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('X-Tenant-ID');
}

/**
 * Get tenant ID from headers (API route)
 */
export function getTenantIdFromHeaders(headers: Headers): string | null {
  return headers.get('X-Tenant-ID');
}

/**
 * Require tenant ID or throw error
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId();
  
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }
  
  return tenantId;
}

/**
 * Require tenant ID from headers or use default
 */
export function requireTenantIdFromHeaders(headers: Headers): string {
  const tenantId = getTenantIdFromHeaders(headers);
  
  if (!tenantId) {
    // Use default tenant ID if not provided
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
    console.log('[Tenant] No tenant ID in headers, using default:', defaultTenantId);
    return defaultTenantId;
  }
  
  return tenantId;
}
