import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { deliveryStatusService } from '@/lib/services/delivery-status.service'

/**
 * Get message delivery timeline
 * GET /api/delivery/:messageId/timeline
 */
export const GET = withAuth(async (req, ctx, params) => {
  const { messageId } = await params

  const timeline = await deliveryStatusService.getDeliveryTimeline(messageId)

  if (!timeline) {
    return NextResponse.json(
      { error: 'Message not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ timeline })
})

