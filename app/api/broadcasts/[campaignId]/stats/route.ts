import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { BroadcastService } from '@/lib/services/broadcast-service'

/**
 * Get campaign statistics
 * GET /api/broadcasts/:campaignId/stats
 * 
 * Requirements: 4.7, 9.1, 9.2
 */
export const GET = withAuth(
  async (req, ctx, params) => {
    const { campaignId } = await params

    // Initialize service with authenticated context
    const broadcastService = new BroadcastService(ctx.supabase, ctx.tenantId)

    // Get broadcast statistics
    const stats = await broadcastService.getBroadcastStats(campaignId)

    return NextResponse.json({ stats })
  },
  {
    rateLimit: {
      maxRequests: 200,
      windowSeconds: 60,
      keyPrefix: 'broadcasts:stats',
    },
  }
)

