import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deliveryStatusService } from '@/lib/services/delivery-status.service'

/**
 * Get failed messages
 * GET /api/delivery/failed?limit=50
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const messages = await deliveryStatusService.getFailedMessages(profile.tenant_id, limit)

    return NextResponse.json({ messages, total: messages.length })
  } catch (error: any) {
    console.error('[API] Error getting failed messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get failed messages' },
      { status: 500 }
    )
  }
}

