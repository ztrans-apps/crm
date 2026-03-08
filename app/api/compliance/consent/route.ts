import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ConsentManager, GrantConsentInput, RevokeConsentInput } from '@/lib/compliance/consent-manager'
import { AuditLogger } from '@/lib/security/audit-logger'

/**
 * GET /api/compliance/consent
 * 
 * Get all consents for the authenticated user
 * 
 * **Requirements: 38.3, 38.4**
 * 
 * Authentication: Required
 * 
 * Response:
 * - 200: Array of consent records
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
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

    // Get consents
    const consentManager = new ConsentManager(supabase)
    const consents = await consentManager.getUserConsents(user.id, tenantId)

    return NextResponse.json({ consents }, { status: 200 })
  } catch (error) {
    console.error('Get consents error:', error)
    return NextResponse.json(
      { error: 'Failed to get consents' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/compliance/consent
 * 
 * Grant consent for a specific purpose
 * 
 * **Requirements: 38.3, 38.4**
 * 
 * Authentication: Required
 * 
 * Request Body:
 * - consent_type: 'privacy_policy' | 'terms_of_service' | 'marketing' | 'analytics' | 'data_processing'
 * - purpose: string (description of what the consent is for)
 * - version: string (version of the policy/terms)
 * 
 * Response:
 * - 200: Consent granted
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
    const input: GrantConsentInput = {
      consent_type: body.consent_type,
      purpose: body.purpose,
      version: body.version,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    }

    // Validate input
    if (!input.consent_type || !input.purpose || !input.version) {
      return NextResponse.json(
        { error: 'Missing required fields: consent_type, purpose, version' },
        { status: 400 }
      )
    }

    // Grant consent
    const consentManager = new ConsentManager(supabase)
    const consent = await consentManager.grantConsent(user.id, tenantId, input)

    // Log consent action
    const auditLogger = new AuditLogger(supabase)
    await auditLogger.logAction({
      tenant_id: tenantId,
      user_id: user.id,
      action: 'consent.grant',
      resource_type: 'consent',
      resource_id: consent.id,
      changes: {
        consent_type: { old: null, new: input.consent_type },
        granted: { old: false, new: true },
      },
      ip_address: input.ip_address || null,
      user_agent: input.user_agent || null,
    })

    return NextResponse.json({ consent }, { status: 200 })
  } catch (error) {
    console.error('Grant consent error:', error)
    return NextResponse.json(
      { error: 'Failed to grant consent' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/compliance/consent
 * 
 * Revoke consent for a specific purpose
 * 
 * **Requirements: 38.3, 38.4**
 * 
 * Authentication: Required
 * 
 * Request Body:
 * - consent_type: 'privacy_policy' | 'terms_of_service' | 'marketing' | 'analytics' | 'data_processing'
 * 
 * Response:
 * - 200: Consent revoked
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function DELETE(request: NextRequest) {
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
    const input: RevokeConsentInput = {
      consent_type: body.consent_type,
    }

    // Validate input
    if (!input.consent_type) {
      return NextResponse.json(
        { error: 'Missing required field: consent_type' },
        { status: 400 }
      )
    }

    // Revoke consent
    const consentManager = new ConsentManager(supabase)
    const consent = await consentManager.revokeConsent(user.id, tenantId, input)

    // Log consent action
    const auditLogger = new AuditLogger(supabase)
    await auditLogger.logAction({
      tenant_id: tenantId,
      user_id: user.id,
      action: 'consent.revoke',
      resource_type: 'consent',
      resource_id: consent.id,
      changes: {
        granted: { old: true, new: false },
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
    })

    return NextResponse.json({ consent }, { status: 200 })
  } catch (error) {
    console.error('Revoke consent error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke consent' },
      { status: 500 }
    )
  }
}
