import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/core/billing/service';
import { getCurrentTenant } from '@/core/tenant';
import type { PlanLimits } from '@/core/billing';

/**
 * GET /api/billing/usage
 * Get usage limits for a metric
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const metric = searchParams.get('metric') as keyof PlanLimits;

    if (!tenantId || !metric) {
      return NextResponse.json(
        { error: 'tenantId and metric are required' },
        { status: 400 }
      );
    }

    const usage = await BillingService.checkLimit(tenantId, metric);

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/usage
 * Record usage
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { metric, quantity = 1, metadata } = body;

    if (!metric) {
      return NextResponse.json({ error: 'Metric is required' }, { status: 400 });
    }

    await BillingService.recordUsage(tenant.id, metric, quantity, metadata);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording usage:', error);
    return NextResponse.json(
      { error: 'Failed to record usage' },
      { status: 500 }
    );
  }
}
