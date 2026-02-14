import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get webhook logs
 * GET /api/webhooks/:webhookId/logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: logs, error, count } = await supabase
      .from('webhook_logs')
      .select('*', { count: 'exact' })
      .eq('webhook_id', params.webhookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ logs, total: count })
  } catch (error: any) {
    console.error('[API] Error getting webhook logs:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get webhook logs' },
      { status: 500 }
    )
  }
}

