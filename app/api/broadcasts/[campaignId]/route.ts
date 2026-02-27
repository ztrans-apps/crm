import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

/**
 * GET /api/broadcasts/:campaignId
 * Permission: broadcast.view (enforced by middleware)
 */
export const GET = withAuth(async (request, ctx, params) => {
  const { campaignId } = await params

  const { data: campaign, error } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  return NextResponse.json({ campaign })
})

/**
 * PATCH /api/broadcasts/:campaignId
 * Permission: broadcast.manage
 */
export const PATCH = withAuth(async (request, ctx, params) => {
  const { campaignId } = await params
  const body = await request.json()

  const { data: campaign, error } = await ctx.supabase
    .from('broadcast_campaigns')
    .update(body)
    .eq('id', campaignId)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to update campaign' }, { status: 500 })
  }

  return NextResponse.json({ campaign })
}, { permission: 'broadcast.manage' })

/**
 * DELETE /api/broadcasts/:campaignId
 * Permission: broadcast.manage
 */
export const DELETE = withAuth(async (request, ctx, params) => {
  const { campaignId } = await params

  const { error } = await ctx.supabase
    .from('broadcast_campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete campaign' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}, { permission: 'broadcast.manage' })

