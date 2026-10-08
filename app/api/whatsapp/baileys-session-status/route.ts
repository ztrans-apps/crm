import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED = new Set(['connected', 'connecting', 'disconnected', 'reconnecting'])

/**
 * Baileys connection status from VPS (no local Supabase on the WhatsApp host).
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
    const { sessionId, status, phoneNumber, reason } = body || {}
    if (!sessionId || !status || !ALLOWED.has(String(status))) {
      return NextResponse.json({ error: 'Missing sessionId or status' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const patch: Record<string, unknown> = {
      status: status === 'reconnecting' ? 'connecting' : status,
      updated_at: new Date().toISOString(),
    }

    if (typeof phoneNumber === 'string' && phoneNumber.trim()) {
      const digits = phoneNumber.replace(/\D/g, '')
      if (/^62\d{8,13}$/.test(digits)) {
        patch.phone_number = `+${digits}`
      }
    }

    if (reason) {
      patch.provider_metadata = { lastDisconnectReason: String(reason) }
    }

    const { error } = await supabase.from('whatsapp_sessions').update(patch).eq('id', sessionId)
    if (error) {
      console.error('[baileys-session-status]', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: patch.status })
  } catch (error) {
    console.error('[baileys-session-status]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
