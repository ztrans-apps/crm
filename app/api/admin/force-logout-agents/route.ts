// app/api/admin/force-logout-agents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user to verify they're owner
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as any)?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can force logout agents' },
        { status: 403 }
      )
    }

    // Get all agent user IDs
    const { data: agents, error: agentsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'agent')

    if (agentsError) {
      console.error('Error fetching agents:', agentsError)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }

    // Sign out all agents by invalidating their sessions
    // Note: This requires admin privileges in Supabase
    const adminSupabase = await createClient()
    
    let loggedOutCount = 0
    const agentsList = (agents || []) as Array<{ id: string }>
    for (const agent of agentsList) {
      try {
        // Sign out user (requires service role key)
        await adminSupabase.auth.admin.signOut(agent.id)
        loggedOutCount++
      } catch (error) {
        console.error(`Failed to logout agent ${agent.id}:`, error)
      }
    }

    // Also reset all agent statuses to offline
    await supabase
      .from('profiles')
      // @ts-ignore - Supabase type inference issue
      .update({ 
        agent_status: 'offline',
        updated_at: new Date().toISOString()
      })
      .eq('role', 'agent')

    return NextResponse.json({ 
      success: true,
      message: `Force logged out ${loggedOutCount} agents and reset statuses`,
      loggedOutCount
    })
  } catch (error) {
    console.error('Error in force-logout-agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
