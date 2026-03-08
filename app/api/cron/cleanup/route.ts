import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DataRetentionService } from '@/lib/compliance/data-retention'
import { DataDeletionService } from '@/lib/compliance/data-deletion'

/**
 * GET /api/cron/cleanup
 * 
 * Automated cleanup job for data retention policies
 * 
 * **Requirement 38.6**: Automated cleanup of expired data
 * 
 * This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 * to run daily cleanup tasks.
 * 
 * Authentication: Requires cron secret token
 * 
 * Response:
 * - 200: Cleanup completed
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Supabase service role client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Run data retention cleanup
    const retentionService = new DataRetentionService(supabase)
    const retentionResults = await retentionService.runAllCleanupJobs()

    // Run soft-deleted data cleanup
    const deletionService = new DataDeletionService(supabase)
    const deletedUsers = await deletionService.cleanupExpiredData()

    // Calculate totals
    const totalItemsDeleted = retentionResults.reduce(
      (sum, result) => sum + result.itemsDeleted,
      0
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        retention: retentionResults,
        softDeleted: {
          usersDeleted: deletedUsers,
        },
        totals: {
          itemsDeleted: totalItemsDeleted,
          usersDeleted: deletedUsers,
        },
      },
    }, { status: 200 })
  } catch (error) {
    console.error('Cleanup job error:', error)
    return NextResponse.json(
      { error: 'Cleanup job failed' },
      { status: 500 }
    )
  }
}
