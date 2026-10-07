import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const STATUS_RANK: Record<string, number> = {
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: -1,
}

/**
 * Baileys message ack updates (sent → delivered → read) forwarded from VPS.
 */
export async function POST(request: NextRequest) {
  try {
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET
    if (bridgeSecret) {
      const provided = request.headers.get('x-bridge-secret')
      if (provided !== bridgeSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const body = await request.json()
    const { whatsappMessageId, status, sessionId } = body || {}

    if (!whatsappMessageId || !status) {
      return NextResponse.json(
        { error: 'Missing whatsappMessageId or status' },
        { status: 400 }
      )
    }

    const normalized = String(status).toLowerCase()
    if (!['sending', 'sent', 'delivered', 'read', 'failed'].includes(normalized)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existing } = await supabase
      .from('messages')
      .select('id, status, conversation_id')
      .eq('whatsapp_message_id', whatsappMessageId)
      .eq('is_from_me', true)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ success: true, updated: false, reason: 'message_not_found' })
    }

    const currentRank = STATUS_RANK[existing.status] ?? 0
    const newRank = STATUS_RANK[normalized] ?? 0
    if (normalized !== 'failed' && newRank <= currentRank) {
      return NextResponse.json({ success: true, updated: false, reason: 'no_upgrade' })
    }

    const { error } = await supabase
      .from('messages')
      .update({
        status: normalized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('[baileys-status] update failed', error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: true,
      messageId: existing.id,
      status: normalized,
      sessionId: sessionId || null,
    })
  } catch (error) {
    console.error('[baileys-status] error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
