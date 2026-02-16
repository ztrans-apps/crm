import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get campaign
 * GET /api/broadcasts/:campaignId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const supabase = await createClient()

    const { data: campaign, error } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('id', params.campaignId)
      .single()

    if (error) throw error

    return NextResponse.json({ campaign })
  } catch (error: any) {
    console.error('[API] Error getting campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get campaign' },
      { status: 500 }
    )
  }
}

/**
 * Update campaign
 * PATCH /api/broadcasts/:campaignId
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: campaign, error } = await supabase
      .from('broadcast_campaigns')
      .update(body)
      .eq('id', params.campaignId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ campaign })
  } catch (error: any) {
    console.error('[API] Error updating campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

/**
 * Delete campaign
 * DELETE /api/broadcasts/:campaignId
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('broadcast_campaigns')
      .delete()
      .eq('id', params.campaignId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error deleting campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}

