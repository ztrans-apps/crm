/**
 * API Route: Get Current Tenant
 * Returns tenant information for the current context
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantService } from '@core/tenant/service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const tenantService = new TenantService();
    const tenant = await tenantService.getTenant(tenantId);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get organizations for this tenant
    const organizations = await tenantService.getOrganizations(tenantId);

    return NextResponse.json({
      tenant,
      organization: organizations[0] || null,
      workspace: null, // TODO: Implement workspace selection
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
