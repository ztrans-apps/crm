import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

/**
 * GET /api/webhooks/:webhookId
 * Permission: settings.manage (enforced by middleware)
 */
export const GET = withAuth(async (request, ctx, params) => {
  const { webhookId } = await params

  const { data: webhook, error } = await ctx.supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error || !webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  return NextResponse.json({ webhook })
})

/**
 * PATCH /api/webhooks/:webhookId
 * Permission: settings.manage
 */
export const PATCH = withAuth(async (request, ctx, params) => {
  const { webhookId } = await params
  const body = await request.json()

  const { data: webhook, error } = await ctx.supabase
    .from('webhooks')
    .update(body)
    .eq('id', webhookId)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to update webhook' }, { status: 500 })
  }

  return NextResponse.json({ webhook })
})

/**
 * DELETE /api/webhooks/:webhookId
 * Permission: settings.manage
 */
export const DELETE = withAuth(async (request, ctx, params) => {
  const { webhookId } = await params

  const { error } = await ctx.supabase
    .from('webhooks')
    .delete()
    .eq('id', webhookId)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete webhook' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})

