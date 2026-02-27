/**
 * API Route: Get Current Tenant
 * Returns tenant information for the current context
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx) => {
  // Use serviceClient to reliably read tenant data (bypasses RLS)
  const { data: tenant, error: tenantError } = await ctx.serviceClient
    .from('tenants')
    .select('*')
    .eq('id', ctx.tenantId)
    .single();

  if (tenantError || !tenant) {
    // If tenant table doesn't exist or no data, return a fallback
    return NextResponse.json({
      tenant: {
        id: ctx.tenantId,
        name: 'Default Tenant',
        slug: 'default',
        settings: {},
      },
      organization: null,
      workspace: null,
    });
  }

  // Get organizations for this tenant (may not exist yet)
  const { data: organizations } = await ctx.serviceClient
    .from('organizations')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    tenant,
    organization: organizations?.[0] || null,
    workspace: null, // TODO: Implement workspace selection
  });
})
