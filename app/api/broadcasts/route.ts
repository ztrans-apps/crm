import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { broadcastService } from '@/lib/services/broadcast.service'

/**
 * List broadcast campaigns
 * GET /api/broadcasts
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

    // Get campaigns
    const { data: campaigns, error } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ campaigns })
  } catch (error: any) {
    console.error('[API] Error getting campaigns:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get campaigns' },
      { status: 500 }
    )
  }
}

/**
 * Create broadcast campaign
 * POST /api/broadcasts
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

    // Validate
    if (!body.name || !body.message_template) {
      return NextResponse.json(
        { error: 'Name and message template are required' },
        { status: 400 }
      )
    }

    // Create campaign
    const campaign = await broadcastService.createCampaign(
      profile.tenant_id,
      body,
      user.id
    )

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error: any) {
    console.error('[API] Error creating campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    )
  }
}

