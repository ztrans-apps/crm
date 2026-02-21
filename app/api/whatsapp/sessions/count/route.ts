/**
 * WhatsApp Sessions Count API
 * Get count of active WhatsApp sessions
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Count active sessions
    const { count, error } = await supabase
      .from('whatsapp_sessions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['connected', 'connecting'])

    if (error) {
      console.error('[Sessions Count API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sessionCount = count || 0
    const isSingleSession = sessionCount === 1
    const autoAccessEnabled = isSingleSession

    return NextResponse.json({
      count: sessionCount,
      isSingleSession,
      autoAccessEnabled,
      message: autoAccessEnabled 
        ? 'Auto-access enabled: All users can access all conversations'
        : `${sessionCount} sessions available`
    })
  } catch (error: any) {
    console.error('[Sessions Count API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
