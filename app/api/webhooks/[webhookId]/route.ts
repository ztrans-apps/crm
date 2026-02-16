import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get webhook
 * GET /api/webhooks/:webhookId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const supabase = await createClient()

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', params.webhookId)
      .single()

    if (error) throw error

    return NextResponse.json({ webhook })
  } catch (error: any) {
    console.error('[API] Error getting webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get webhook' },
      { status: 500 }
    )
  }
}

/**
 * Update webhook
 * PATCH /api/webhooks/:webhookId
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(body)
      .eq('id', params.webhookId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ webhook })
  } catch (error: any) {
    console.error('[API] Error updating webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update webhook' },
      { status: 500 }
    )
  }
}

/**
 * Delete webhook
 * DELETE /api/webhooks/:webhookId
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', params.webhookId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error deleting webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}

