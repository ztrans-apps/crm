import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { broadcastService } from '@/lib/services/broadcast.service'

/**
 * List broadcast campaigns
 * GET /api/broadcasts
 */
export const GET = withAuth(async (req, ctx) => {
  const { data: campaigns, error } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return NextResponse.json({ campaigns })
})

/**
 * Create broadcast campaign
 * POST /api/broadcasts
 */
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()

  // Validate
  if (!body.name || !body.message_template) {
    return NextResponse.json(
      { error: 'Name and message template are required' },
      { status: 400 }
    )
  }

  // Create campaign
  const campaign = await broadcastService.createCampaign(
    ctx.tenantId,
    body,
    ctx.user.id
  )

  return NextResponse.json({ campaign }, { status: 201 })
})

