import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { BroadcastService } from '@/lib/services/broadcast-service'
import { z } from 'zod'

/**
 * Update broadcast schema for PATCH requests
 */
const UpdateBroadcastSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  message_template: z.string().min(1).max(4096).optional(),
  scheduled_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * GET /api/broadcasts/:campaignId
 * Permission: broadcast.view (enforced by middleware)
 * 
 * Requirements: 4.7, 9.1, 9.2
 */
export const GET = withAuth(
  async (request, ctx, params) => {
    const { campaignId } = await params

    // Initialize service with authenticated context
    const broadcastService = new BroadcastService(ctx.supabase, ctx.tenantId)

    // Get broadcast by ID
    const broadcast = await broadcastService.getBroadcast(campaignId)

    return NextResponse.json({ broadcast })
  },
  {
    rateLimit: {
      maxRequests: 200,
      windowSeconds: 60,
      keyPrefix: 'broadcasts:get',
    },
  }
)

/**
 * PATCH /api/broadcasts/:campaignId
 * Permission: broadcast.manage
 * 
 * Requirements: 4.7, 9.1, 9.2
 */
export const PATCH = withAuth(
  async (request, ctx, params) => {
    const { campaignId } = await params

    // Initialize service with authenticated context
    const broadcastService = new BroadcastService(ctx.supabase, ctx.tenantId)

    // Update broadcast using validated input
    const broadcast = await broadcastService.updateBroadcast(
      campaignId,
      ctx.validatedBody,
      ctx.user.id
    )

    return NextResponse.json({ broadcast })
  },
  {
    permission: 'broadcast.manage',
    validation: {
      body: UpdateBroadcastSchema,
    },
    rateLimit: {
      maxRequests: 100,
      windowSeconds: 60,
      keyPrefix: 'broadcasts:update',
    },
  }
)

/**
 * DELETE /api/broadcasts/:campaignId
 * Permission: broadcast.manage
 * 
 * Requirements: 4.7, 9.1, 9.2
 */
export const DELETE = withAuth(
  async (request, ctx, params) => {
    const { campaignId } = await params

    // Initialize service with authenticated context
    const broadcastService = new BroadcastService(ctx.supabase, ctx.tenantId)

    // Delete broadcast
    await broadcastService.deleteBroadcast(campaignId, ctx.user.id)

    return NextResponse.json({ success: true })
  },
  {
    permission: 'broadcast.manage',
    rateLimit: {
      maxRequests: 50,
      windowSeconds: 60,
      keyPrefix: 'broadcasts:delete',
    },
  }
)

