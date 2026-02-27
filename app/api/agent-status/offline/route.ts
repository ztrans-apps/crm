// app/api/agent-status/offline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

/**
 * POST /api/agent-status/offline
 * Sets the current authenticated user offline
 */
export const POST = withAuth(async (request, ctx) => {
  // @ts-ignore
  const { error } = await ctx.supabase
    .from('profiles')
    .update({ 
      agent_status: 'offline',
      updated_at: new Date().toISOString()
    })
    .eq('id', ctx.user.id)

  if (error) {
    console.error('Error updating agent status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
