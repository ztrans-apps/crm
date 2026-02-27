/**
 * API Route: Get Current Tenant
 * Returns tenant information for the current context
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { TenantService } from '@core/tenant/service';

export const GET = withAuth(async (req, ctx) => {
  const tenantService = new TenantService();
  const tenant = await tenantService.getTenant(ctx.tenantId);

  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }

  // Get organizations for this tenant
  const organizations = await tenantService.getOrganizations(ctx.tenantId);

  return NextResponse.json({
    tenant,
    organization: organizations[0] || null,
    workspace: null, // TODO: Implement workspace selection
  });
})
