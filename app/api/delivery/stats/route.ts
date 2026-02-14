import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deliveryStatusService } from '@/lib/services/delivery-status.service'

/**
 * Get delivery statistics
 * GET /api/delivery/stats?timeRange=day
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
    const timeRange = (searchParams.get('timeRange') || 'day') as 'hour' | 'day' | 'week' | 'month'

    const stats = await deliveryStatusService.getDeliveryStats(profile.tenant_id, timeRange)

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('[API] Error getting delivery stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get delivery stats' },
      { status: 500 }
    )
  }
}

