// API Route: Auto-assign conversation
// POST /api/conversations/[conversationId]/auto-assign

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient()
    const { conversationId } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get auto-assignment settings
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'auto_assignment')
      .single()

    const settings = (settingsData as any)?.setting_value

    if (!settings || !settings.enabled) {
      return NextResponse.json(
        { error: 'Auto-assignment is not enabled' },
        { status: 400 }
      )
    }

    // Get next agent using round-robin
    const { data: agentId, error: agentError } = await supabase
      .rpc('get_next_agent_round_robin')

    if (agentError || !agentId) {
      return NextResponse.json(
        { error: 'No agent available for assignment' },
        { status: 400 }
      )
    }

    // Assign conversation
    const { error: assignError } = await supabase
      .from('conversations')
      // @ts-ignore - Supabase type inference issue
      .update({
        assigned_to: agentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    if (assignError) {
      console.error('Error assigning conversation:', assignError)
      return NextResponse.json(
        { error: 'Failed to assign conversation' },
        { status: 500 }
      )
    }

    // Get agent info
    const { data: agent } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', agentId)
      .single()

    return NextResponse.json({
      success: true,
      assigned_to: agent
    })
  } catch (error) {
    console.error('Error in auto-assign API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
