import { NextRequest, NextResponse } from 'next/server'
import { broadcastService } from '@/lib/services/broadcast.service'

/**
 * Start campaign
 * POST /api/broadcasts/:campaignId/start
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    await broadcastService.startCampaign(params.campaignId)

    return NextResponse.json({
      success: true,
      message: 'Campaign started successfully',
    })
  } catch (error: any) {
    console.error('[API] Error starting campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start campaign' },
      { status: 500 }
    )
  }
}

