import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { BillingService } from '@/core/billing/service';

/**
 * GET /api/billing/subscription
 * Get subscription for current tenant
 */
export const GET = withAuth(async (req, ctx) => {
  const subscription = await BillingService.getSubscription(ctx.tenantId);

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  return NextResponse.json(subscription);
}, { permission: 'settings.manage' });

/**
 * PATCH /api/billing/subscription
 * Update subscription plan
 */
export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { plan } = body;

  if (!plan) {
    return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
  }

  await BillingService.updatePlan(ctx.tenantId, plan);

  return NextResponse.json({ success: true });
}, { permission: 'settings.manage' });

/**
 * DELETE /api/billing/subscription
 * Cancel subscription
 */
export const DELETE = withAuth(async (req, ctx) => {
  const searchParams = req.nextUrl.searchParams;
  const immediate = searchParams.get('immediate') === 'true';

  await BillingService.cancelSubscription(ctx.tenantId, immediate);

  return NextResponse.json({ success: true });
}, { permission: 'settings.manage' });
