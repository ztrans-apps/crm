import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { BillingService } from '@/core/billing/service';

/**
 * GET /api/billing/features/[feature]
 * Check if tenant has access to a feature
 */
export const GET = withAuth(async (req, ctx, params) => {
  const { feature } = await params;

  const hasAccess = await BillingService.hasFeature(ctx.tenantId, feature);

  return NextResponse.json({ hasAccess });
}, { permission: 'settings.manage' });
