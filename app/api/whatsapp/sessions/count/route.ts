/**
 * WhatsApp Sessions Count API
 * Get count of active WhatsApp sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
  // Count active sessions
  const { count, error } = await ctx.supabase
    .from('whatsapp_sessions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['connected', 'connecting'])

  if (error) {
    console.error('[Sessions Count API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sessionCount = count || 0
  const isSingleSession = sessionCount === 1
  const autoAccessEnabled = isSingleSession

  return NextResponse.json({
    count: sessionCount,
    isSingleSession,
    autoAccessEnabled,
    message: autoAccessEnabled 
      ? 'Auto-access enabled: All users can access all conversations'
      : `${sessionCount} sessions available`
  })
})
