import { NextRequest, NextResponse } from 'next/server'
import { webhookRouter } from '@/lib/services/webhook-router.service'

/**
 * Emit webhook event
 * POST /api/webhooks/emit
 * 
 * Called by WhatsApp service to route events to registered webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
  } catch (error: any) {
    console.error('[API] Error emitting webhook event:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to emit webhook event' },
      { status: 500 }
    )
  }
}

