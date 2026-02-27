import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { cleanupStuckSessions } from '@/lib/jobs/cleanup-stuck-sessions'

export const POST = withAuth(async (req, ctx) => {
  console.log('[Cleanup API] Starting cleanup...')

  const result = await cleanupStuckSessions()

  console.log('[Cleanup API] Result:', result)

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: result.cleaned > 0
        ? `Cleaned ${result.cleaned} stuck sessions`
        : 'No stuck sessions found',
      cleaned: result.cleaned,
      sessions: result.sessions || []
    })
  } else {
    console.error('[Cleanup API] Cleanup failed:', result.error)
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        cleaned: 0
      },
      { status: 500 }
    )
  }
}, { permission: 'whatsapp.session.manage' })
