import { NextRequest, NextResponse } from 'next/server'
import { webhookRouter } from '@/lib/services/webhook-router.service'
import { createClient } from '@/lib/supabase/server'

/**
 * Get webhook statistics
 * GET /api/webhooks/:webhookId/stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const supabase = await createClient()

    // Get webhook to verify tenant
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('tenant_id')
      .eq('id', params.webhookId)
      .single()

    if (error) throw error

    // Get stats
    const stats = await webhookRouter.getWebhookStats(webhook.tenant_id, params.webhookId)

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('[API] Error getting webhook stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get webhook stats' },
      { status: 500 }
    )
  }
}

