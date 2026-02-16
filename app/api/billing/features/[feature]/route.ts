import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/core/billing';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/billing/features/[feature]
 * Check if tenant has access to a feature
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { feature: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await BillingService.hasFeature(tenant.id, params.feature);

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Error checking feature access:', error);
    return NextResponse.json(
      { error: 'Failed to check feature access' },
      { status: 500 }
    );
  }
}
