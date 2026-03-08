import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DataExportService } from '@/lib/compliance/data-export'
import { AuditLogger } from '@/lib/security/audit-logger'

/**
 * POST /api/compliance/export
 * 
 * Export user data in JSON format (GDPR Article 20 - Right to Data Portability)
 * 
 * **Requirement 38.1**: Users can export all their data
 * 
 * Authentication: Required
 * Authorization: User can only export their own data
 * 
 * Request Body:
 * - format: 'json' (default) or 'file'
 * 
 * Response:
 * - 200: JSON data or file download
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
    const format = body.format || 'json'

    // Create export service
    const exportService = new DataExportService(supabase)

    // Export data
    if (format === 'file') {
      // Export as downloadable file
      const fileBuffer = await exportService.exportUserDataAsFile(user.id, tenantId)

      // Log export action
      const auditLogger = new AuditLogger(supabase)
      await auditLogger.logAction({
        tenant_id: tenantId,
        user_id: user.id,
        action: 'data.export',
        resource_type: 'user_data',
        resource_id: user.id,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
      })

      // Return file download
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user-data-export-${user.id}-${Date.now()}.json"`,
        },
      })
    } else {
      // Export as JSON response
      const data = await exportService.exportUserData(user.id, tenantId)

      // Log export action
      const auditLogger = new AuditLogger(supabase)
      await auditLogger.logAction({
        tenant_id: tenantId,
        user_id: user.id,
        action: 'data.export',
        resource_type: 'user_data',
        resource_id: user.id,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
      })

      return NextResponse.json(data, { status: 200 })
    }
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
