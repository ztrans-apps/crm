/**
 * WhatsApp Sessions Stats API
 * Get session statistics from Supabase (Meta Cloud API)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ stats: { total: 0, active: 0, inactive: 0 } })
    }

    const { data: sessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('id, status, phone_number, created_at, updated_at')
      .eq('tenant_id', profile.tenant_id)

    if (error) throw error

    const allSessions = sessions || []
    const active = allSessions.filter(s => s.status === 'connected').length
    const inactive = allSessions.filter(s => s.status !== 'connected').length

    return NextResponse.json({
      stats: {
        total: allSessions.length,
        active,
        inactive,
        sessions: allSessions.map(s => ({
          id: s.id,
          phone_number: s.phone_number,
          status: s.status,
          created_at: s.created_at,
          updated_at: s.updated_at,
        })),
      },
    })
  } catch (error: any) {
    console.error('[Sessions Stats API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

