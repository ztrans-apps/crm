import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { BillingService } from '@/core/billing/service';
import type { PlanLimits } from '@/core/billing';

/**
 * GET /api/billing/usage
 * Get usage limits for a metric
 */
export const GET = withAuth(async (req, ctx) => {
  const searchParams = req.nextUrl.searchParams;
  const metric = searchParams.get('metric') as keyof PlanLimits;

  if (!metric) {
    return NextResponse.json(
      { error: 'metric is required' },
      { status: 400 }
    );
  }

  const usage = await BillingService.checkLimit(ctx.tenantId, metric);

  return NextResponse.json(usage);
}, { permission: 'settings.manage' });

/**
 * POST /api/billing/usage
 * Record usage
 */
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { metric, quantity = 1, metadata } = body;

  if (!metric) {
    return NextResponse.json({ error: 'Metric is required' }, { status: 400 });
  }

  await BillingService.recordUsage(ctx.tenantId, metric, quantity, metadata);

  return NextResponse.json({ success: true });
}, { permission: 'settings.manage' });
