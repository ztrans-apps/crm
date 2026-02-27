import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

/**
 * GET /api/webhooks/:webhookId/logs
 * Permission: settings.manage (enforced by middleware)
 */
export const GET = withAuth(async (request, ctx, params) => {
  const { webhookId } = await params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data: logs, error, count } = await ctx.supabase
    .from('webhook_logs')
    .select('*', { count: 'exact' })
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to get webhook logs' }, { status: 500 })
  }

  return NextResponse.json({ logs, total: count })
})

