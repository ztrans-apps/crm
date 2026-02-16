/**
 * Core Tenant Middleware
 * Tenant isolation & context injection
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantService } from './service';

/**
 * Extract tenant from request
 * Can be from:
 * 1. Subdomain (tenant.app.com)
 * 2. Header (X-Tenant-ID)
 * 3. Query param (?tenant=xxx)
 */
export async function extractTenantId(request: NextRequest): Promise<string | null> {
  // 1. Check header
  const headerTenantId = request.headers.get('X-Tenant-ID');
  if (headerTenantId) return headerTenantId;

  // 2. Check subdomain
  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];
  
  if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
    const tenantService = new TenantService();
    const tenant = await tenantService.getTenantBySlug(subdomain);
    if (tenant) return tenant.id;
  }

  // 3. Check query param
  const url = new URL(request.url);
  const queryTenantId = url.searchParams.get('tenant');
  if (queryTenantId) return queryTenantId;

  // Default tenant for development
  return process.env.DEFAULT_TENANT_ID || null;
}

/**
 * Tenant middleware
 * Injects tenant context into request
 */
export async function tenantMiddleware(request: NextRequest) {
  const tenantId = await extractTenantId(request);

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 400 }
    );
  }

  // Clone request and add tenant header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Tenant-ID', tenantId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Get tenant ID from headers (server-side)
 */
export function getTenantIdFromHeaders(headers: Headers): string | null {
  return headers.get('X-Tenant-ID');
}
