import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp/sessions
 * Get all WhatsApp sessions for current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    // Get all sessions for tenant
    const { data: sessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/whatsapp/sessions
 * Create new WhatsApp session with Meta config
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const body = await request.json()
    const {
      phone_number,
      session_name,
      meta_phone_number_id,
      meta_api_token,
      meta_api_version = 'v21.0',
      meta_business_account_id,
      meta_webhook_verify_token,
      meta_app_id,
      meta_app_secret,
      is_active = true
    } = body

    // Validate required fields
    if (!phone_number || !session_name) {
      return NextResponse.json(
        { error: 'Phone number and session name are required' },
        { status: 400 }
      )
    }

    // Create session
    const { data: session, error } = await supabase
      .from('whatsapp_sessions')
      .insert({
        tenant_id: profile.tenant_id,
        phone_number,
        session_name,
        meta_phone_number_id,
        meta_api_token,
        meta_api_version,
        meta_business_account_id,
        meta_webhook_verify_token,
        meta_app_id,
        meta_app_secret,
        is_active,
        status: 'connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    if (!session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json(session, { status: 201 })
  } catch (error: any) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    )
  }
}
