// app/api/agent-status/heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const POST = withAuth(async (req, ctx) => {
  // Update last_activity timestamp
  const { error } = await ctx.supabase
    .from('profiles')
    // @ts-ignore - Supabase type inference issue
    .update({
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', ctx.user.id)

  if (error) {
    console.error('Error updating heartbeat:', error)
    return NextResponse.json(
      { error: 'Failed to update heartbeat' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString()
  })
})
