import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { BroadcastService } from '@/lib/services/broadcast-service'
import { CreateBroadcastSchema } from '@/lib/validation/schemas'

/**
 * List broadcast campaigns
 * GET /api/broadcasts
 * 
 * Query parameters:
 * - status: Filter by broadcast status (draft, scheduled, sending, completed, failed, cancelled)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50, max: 100)
 * 
 * Requirements: 4.7, 9.1, 9.2
 */
export const GET = withAuth(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50', 10), 100)

    // Initialize service with authenticated context
    const broadcastService = new BroadcastService(ctx.supabase, ctx.tenantId)

    // List broadcasts with pagination and filtering
    const result = await broadcastService.listBroadcasts({
      status,
      page,
      pageSize,
    })

    return NextResponse.json({
      broadcasts: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        hasMore: result.hasMore,
      },
    })
  },
  {
    rateLimit: {
      maxRequests: 100,
      windowSeconds: 60,
      keyPrefix: 'broadcasts:list',
    },
  }
)

/**
 * Create broadcast campaign
 * POST /api/broadcasts
 * 
 * Requirements: 4.7, 9.1, 9.2
 */
export const POST = withAuth(
  async (req, ctx) => {
    // Initialize service with authenticated context
    const broadcastService = new BroadcastService(ctx.supabase, ctx.tenantId)

    // Create broadcast using validated input
    const broadcast = await broadcastService.createBroadcast(
      ctx.validatedBody,
      ctx.user.id
    )

    return NextResponse.json({ broadcast }, { status: 201 })
  },
  {
    permission: 'broadcast.create',
    validation: {
      body: CreateBroadcastSchema,
    },
    rateLimit: {
      maxRequests: 50,
      windowSeconds: 60,
      keyPrefix: 'broadcasts:create',
    },
  }
)

