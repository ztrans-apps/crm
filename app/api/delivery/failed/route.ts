import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { deliveryStatusService } from '@/lib/services/delivery-status.service'

/**
 * Get failed messages
 * GET /api/delivery/failed?limit=50
 */
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')

  const messages = await deliveryStatusService.getFailedMessages(ctx.tenantId, limit)

  return NextResponse.json({ messages, total: messages.length })
})

