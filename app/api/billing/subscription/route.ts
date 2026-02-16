import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/core/billing';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/billing/subscription
 * Get subscription for current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      const tenant = await getCurrentTenant();
      if (!tenant) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const subscription = await BillingService.getSubscription(tenantId!);

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/billing/subscription
 * Update subscription plan
 */
export async function PATCH(req: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body;

    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    await BillingService.updatePlan(tenant.id, plan);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/billing/subscription
 * Cancel subscription
 */
export async function DELETE(req: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const immediate = searchParams.get('immediate') === 'true';

    await BillingService.cancelSubscription(tenant.id, immediate);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
