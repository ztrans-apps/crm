import { NextRequest, NextResponse } from 'next/server'
import { deliveryStatusService } from '@/lib/services/delivery-status.service'

/**
 * Get message delivery timeline
 * GET /api/delivery/:messageId/timeline
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const timeline = await deliveryStatusService.getDeliveryTimeline(params.messageId)

    if (!timeline) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ timeline })
  } catch (error: any) {
    console.error('[API] Error getting delivery timeline:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get delivery timeline' },
      { status: 500 }
    )
  }
}

