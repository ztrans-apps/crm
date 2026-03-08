import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DataDeletionService } from '@/lib/compliance/data-deletion'
import { AuditLogger } from '@/lib/security/audit-logger'

/**
 * POST /api/compliance/delete
 * 
 * Delete user data (GDPR Article 17 - Right to Erasure)
 * 
 * **Requirement 38.2**: Users can request deletion of all their data
 * 
 * Authentication: Required
 * Authorization: User can only delete their own data
 * 
 * Request Body:
 * - confirm: boolean (must be true)
 * - permanent: boolean (optional, default false - soft delete with 30-day retention)
 * 
 * Response:
 * - 200: Deletion successful
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Supabase client with user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant ID from user metadata
    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { confirm, permanent } = body

    // Validate confirmation
    if (confirm !== true) {
      return NextResponse.json(
        { error: 'Deletion must be confirmed by setting confirm=true' },
        { status: 400 }
      )
    }

    // Create deletion service
    const deletionService = new DataDeletionService(supabase)

    // Log deletion request before performing deletion
    const auditLogger = new AuditLogger(supabase)
    await auditLogger.logAction({
      tenant_id: tenantId,
      user_id: user.id,
      action: permanent ? 'data.delete_permanent' : 'data.delete_soft',
      resource_type: 'user_data',
      resource_id: user.id,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
    })

    // Perform deletion
    let result
    if (permanent) {
      // Permanent deletion (hard delete)
      result = await deletionService.hardDeleteUserData(user.id, tenantId)
    } else {
      // Soft delete with retention period
      result = await deletionService.softDeleteUserData(user.id, tenantId)
    }

    return NextResponse.json({
      success: true,
      message: permanent
        ? 'Your data has been permanently deleted'
        : `Your data has been marked for deletion and will be permanently removed on ${result.permanentDeletionScheduledFor}`,
      result,
    }, { status: 200 })
  } catch (error) {
    console.error('Data deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    )
  }
}
