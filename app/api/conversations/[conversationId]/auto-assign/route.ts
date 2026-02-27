// API Route: Auto-assign conversation
// POST /api/conversations/[conversationId]/auto-assign

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const POST = withAuth(async (req, ctx, params) => {
  const { conversationId } = await params

  // Get auto-assignment settings
  const { data: settingsData } = await ctx.supabase
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
  const { data: agentId, error: agentError } = await ctx.supabase
    .rpc('get_next_agent_round_robin')

  if (agentError || !agentId) {
    return NextResponse.json(
      { error: 'No agent available for assignment' },
      { status: 400 }
    )
  }

  // Assign conversation
  const { error: assignError } = await ctx.supabase
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
  const { data: agent } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', agentId)
    .single()

  return NextResponse.json({
    success: true,
    assigned_to: agent
  })
})
