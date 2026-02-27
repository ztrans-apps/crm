import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { webhookRouter } from '@/lib/services/webhook-router.service'

/**
 * Emit webhook event
 * POST /api/webhooks/emit
 * 
 * Called by WhatsApp service to route events to registered webhooks
 */
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { tenantId, eventType, data, timestamp } = body

  if (!tenantId || !eventType || !data) {
    return NextResponse.json(
      { error: 'tenantId, eventType, and data are required' },
      { status: 400 }
    )
  }

  // Route event to webhooks
  await webhookRouter.routeEvent({
    type: eventType,
    tenantId,
    sessionId: data.sessionId,
    data,
    timestamp: timestamp || new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}, { permission: 'admin.access' })

