// app/api/agent-status/set-available/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const POST = withAuth(async (req, ctx) => {
  // Update status and last_activity
  const now = new Date().toISOString()
  const { data, error } = await ctx.supabase
    .from('profiles')
    // @ts-ignore - Supabase type inference issue
    .update({
      agent_status: 'available',
      last_activity: now,
      updated_at: now
    })
    .eq('id', ctx.user.id)
    .select()

  if (error) {
    console.error('Error setting available status:', error)
    return NextResponse.json(
      { error: 'Failed to set status' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    timestamp: now,
    data
  })
})
