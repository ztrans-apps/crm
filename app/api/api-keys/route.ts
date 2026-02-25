import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiKeyService } from '@/lib/services/api-key.service'

/**
 * List API keys
 * GET /api/api-keys
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get API keys
    const apiKeys = await apiKeyService.listKeys((profile as any).tenant_id)

    return NextResponse.json({ apiKeys })
  } catch (error: any) {
    console.error('[API] Error getting API keys:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get API keys' },
      { status: 500 }
    )
  }
}

/**
 * Create API key
 * POST /api/api-keys
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, scopes, expiresInDays } = body

    // Validate
    if (!name || !scopes || !Array.isArray(scopes)) {
      return NextResponse.json(
        { error: 'Name and scopes are required' },
        { status: 400 }
      )
    }

    // Create API key
    const { apiKey, key } = await apiKeyService.createApiKey(
      (profile as any).tenant_id,
      name,
      scopes,
      expiresInDays,
      user.id
    )

    return NextResponse.json(
      {
        apiKey,
        key, // Return the actual key only once
        warning: 'Save this key securely. It will not be shown again.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API] Error creating API key:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create API key' },
      { status: 500 }
    )
  }
}

