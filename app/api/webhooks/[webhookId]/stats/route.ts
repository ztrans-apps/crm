import { NextRequest, NextResponse } from 'next/server'
import { webhookRouter } from '@/lib/services/webhook-router.service'
import { withAuth } from '@/lib/rbac/with-auth'

/**
 * GET /api/webhooks/:webhookId/stats
 * Permission: settings.manage (enforced by middleware)
 */
export const GET = withAuth(async (request, ctx, params) => {
  const { webhookId } = await params

  // Get stats using tenant context
  const stats = await webhookRouter.getWebhookStats(ctx.tenantId, webhookId)

  return NextResponse.json({ stats })
})

