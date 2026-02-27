import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { deliveryStatusService } from '@/lib/services/delivery-status.service'

/**
 * Get delivery statistics
 * GET /api/delivery/stats?timeRange=day
 */
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const timeRange = (searchParams.get('timeRange') || 'day') as 'hour' | 'day' | 'week' | 'month'

  const stats = await deliveryStatusService.getDeliveryStats(ctx.tenantId, timeRange)

  return NextResponse.json({ stats })
})

