import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { BroadcastService } from '@/lib/services/broadcast-service'

/**
 * Start campaign
 * POST /api/broadcasts/:campaignId/start
 * 
 * Requirements: 4.7, 9.1, 9.2
 */
export const POST = withAuth(
  async (req, ctx, params) => {
    const { campaignId } = await params

    // Initialize service with authenticated context
    const broadcastService = new BroadcastService(ctx.supabase, ctx.tenantId)

    // Send broadcast immediately
    await broadcastService.sendBroadcast(campaignId)

    return NextResponse.json({
      success: true,
      message: 'Campaign started successfully',
    })
  },
  {
    permission: 'broadcast.manage',
    rateLimit: {
      maxRequests: 50,
      windowSeconds: 60,
      keyPrefix: 'broadcasts:start',
    },
  }
)

