import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { broadcastService } from '@/lib/services/broadcast.service'

/**
 * Get campaign statistics
 * GET /api/broadcasts/:campaignId/stats
 */
export const GET = withAuth(async (req, ctx, params) => {
  const { campaignId } = await params

  const stats = await broadcastService.getCampaignStats(campaignId)

  if (!stats) {
    return NextResponse.json(
      { error: 'Campaign not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ stats })
})

