import { NextRequest, NextResponse } from 'next/server'
import { broadcastService } from '@/lib/services/broadcast.service'

/**
 * Get campaign statistics
 * GET /api/broadcasts/:campaignId/stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const stats = await broadcastService.getCampaignStats(params.campaignId)

    if (!stats) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('[API] Error getting campaign stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get campaign stats' },
      { status: 500 }
    )
  }
}

