import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * List webhooks
 * GET /api/webhooks
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

    // Get webhooks
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ webhooks })
  } catch (error: any) {
    console.error('[API] Error getting webhooks:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get webhooks' },
      { status: 500 }
    )
  }
}

/**
 * Create webhook
 * POST /api/webhooks
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
    const { name, url, secret, events, retry_count, timeout_ms } = body

    // Validate
    if (!name || !url || !events || events.length === 0) {
      return NextResponse.json(
        { error: 'Name, URL, and events are required' },
        { status: 400 }
      )
    }

    // Create webhook
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        tenant_id: profile.tenant_id,
        name,
        url,
        secret,
        events,
        retry_count: retry_count || 3,
        timeout_ms: timeout_ms || 5000,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error: any) {
    console.error('[API] Error creating webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create webhook' },
      { status: 500 }
    )
  }
}

