import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp/sessions/[sessionId]
 * Get specific session details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const { data: session, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) throw error
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error: any) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/whatsapp/sessions/[sessionId]
 * Update session configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      session_name,
      phone_number,
      meta_phone_number_id,
      meta_api_token,
      meta_api_version,
      meta_business_account_id,
      meta_webhook_verify_token,
      meta_app_id,
      meta_app_secret,
      is_active,
      status
    } = body

    // Build update object (only include provided fields)
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (session_name !== undefined) updates.session_name = session_name
    if (phone_number !== undefined) updates.phone_number = phone_number
    if (meta_phone_number_id !== undefined) updates.meta_phone_number_id = meta_phone_number_id
    if (meta_api_token !== undefined) updates.meta_api_token = meta_api_token
    if (meta_api_version !== undefined) updates.meta_api_version = meta_api_version
    if (meta_business_account_id !== undefined) updates.meta_business_account_id = meta_business_account_id
    if (meta_webhook_verify_token !== undefined) updates.meta_webhook_verify_token = meta_webhook_verify_token
    if (meta_app_id !== undefined) updates.meta_app_id = meta_app_id
    if (meta_app_secret !== undefined) updates.meta_app_secret = meta_app_secret
    if (is_active !== undefined) updates.is_active = is_active
    if (status !== undefined) updates.status = status

    const { data: session, error } = await supabase
      .from('whatsapp_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) throw error
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error: any) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update session' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/whatsapp/sessions/[sessionId]
 * Delete session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const { error } = await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete session' },
      { status: 500 }
    )
  }
}
