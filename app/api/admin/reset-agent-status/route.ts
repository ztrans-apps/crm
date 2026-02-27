// app/api/admin/reset-agent-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

/**
 * POST /api/admin/reset-agent-status
 * Permission: admin.access (enforced by middleware)
 */
export const POST = withAuth(async (request, ctx) => {
  // @ts-ignore
  const { error } = await ctx.supabase
    .from('profiles')
    .update({ 
      agent_status: 'offline',
      updated_at: new Date().toISOString()
    })
    .eq('role', 'agent')

  if (error) {
    console.error('Error resetting agent status:', error)
    return NextResponse.json({ error: 'Failed to reset agent status' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true,
    message: 'All agent statuses reset to offline'
  })
}, { roles: ['owner'] })
