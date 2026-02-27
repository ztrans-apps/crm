import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

/**
 * GET /api/webhooks
 * Permission: settings.manage (enforced by middleware)
 */
export const GET = withAuth(async (request, ctx) => {
  const { data: webhooks, error } = await ctx.supabase
    .from('webhooks')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to get webhooks' }, { status: 500 })
  }

  return NextResponse.json({ webhooks })
})

/**
 * POST /api/webhooks
 * Permission: settings.manage
 */
export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const { name, url, secret, events, retry_count, timeout_ms } = body

  if (!name || !url || !events || events.length === 0) {
    return NextResponse.json({ error: 'Name, URL, and events are required' }, { status: 400 })
  }

  const { data: webhook, error } = await ctx.supabase
    .from('webhooks')
    .insert({
      tenant_id: ctx.tenantId,
      name,
      url,
      secret,
      events,
      retry_count: retry_count || 3,
      timeout_ms: timeout_ms || 5000,
      created_by: ctx.user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to create webhook' }, { status: 500 })
  }

  return NextResponse.json({ webhook }, { status: 201 })
})

