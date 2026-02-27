/**
 * Cron Job: Cleanup Stuck Sessions
 * 
 * This endpoint should be called periodically by a cron service
 * 
 * For Vercel: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-sessions",
 *     "schedule": "every 5 minutes"
 *   }]
 * }
 * 
 * For other platforms: Use external cron to call this endpoint every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server'
import { cleanupStuckSessions } from '@/lib/jobs/cleanup-stuck-sessions'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (REQUIRED for security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cron] Running cleanup-sessions job...')
    
    const result = await cleanupStuckSessions()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Cleaned ${result.cleaned} stuck sessions`,
        cleaned: result.cleaned,
        sessions: result.sessions || [],
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[Cron] Cleanup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual trigger
export async function POST(request: NextRequest) {
  return GET(request)
}
