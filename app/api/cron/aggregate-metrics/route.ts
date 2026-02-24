// app/api/cron/aggregate-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { aggregateHourlyMetrics, aggregateDailyMetrics, aggregateWeeklyMetrics } from '@/lib/workers/dashboard-aggregation.worker'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for metrics aggregation
 * 
 * Usage:
 * - Hourly: GET /api/cron/aggregate-metrics?type=hourly
 * - Daily: GET /api/cron/aggregate-metrics?type=daily
 * - Weekly: GET /api/cron/aggregate-metrics?type=weekly
 * 
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/aggregate-metrics?type=hourly",
 *       "schedule": "0 * * * *"
 *     },
 *     {
 *       "path": "/api/cron/aggregate-metrics?type=daily",
 *       "schedule": "0 0 * * *"
 *     },
 *     {
 *       "path": "/api/cron/aggregate-metrics?type=weekly",
 *       "schedule": "0 0 * * 0"
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'hourly'

    console.log(`🔄 Running ${type} metrics aggregation...`)

    switch (type) {
      case 'hourly':
        await aggregateHourlyMetrics()
        break
      case 'daily':
        await aggregateDailyMetrics()
        break
      case 'weekly':
        await aggregateWeeklyMetrics()
        break
      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: hourly, daily, or weekly' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      type,
      timestamp: new Date().toISOString(),
      message: `${type} metrics aggregation completed successfully`,
    })
  } catch (error) {
    console.error('Error in metrics aggregation cron:', error)
    return NextResponse.json(
      {
        error: 'Metrics aggregation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
