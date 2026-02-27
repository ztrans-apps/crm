import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { broadcastService } from '@/lib/services/broadcast.service'

/**
 * Start campaign
 * POST /api/broadcasts/:campaignId/start
 */
export const POST = withAuth(async (req, ctx, params) => {
  const { campaignId } = await params

  await broadcastService.startCampaign(campaignId)

  return NextResponse.json({
    success: true,
    message: 'Campaign started successfully',
  })
}, { permission: 'broadcast.manage' })

