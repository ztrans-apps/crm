// app/api/admin/debug-agent-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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
        { error: 'Only owners can debug agent status' },
        { status: 403 }
      )
    }

    // Get all agents with their status
    const { data: agents, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, agent_status, updated_at')
      .eq('role', 'agent')
      .order('email')

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      agents,
      count: agents?.length || 0
    })
  } catch (error) {
    console.error('Error in debug-agent-status:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { agentId, status } = body

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
        { error: 'Only owners can update agent status' },
        { status: 403 }
      )
    }

    if (!agentId || !status) {
      return NextResponse.json(
        { error: 'agentId and status are required' },
        { status: 400 }
      )
    }

    // Update specific agent status
    const { data, error } = await supabase
      .from('profiles')
      // @ts-ignore - Supabase type inference issue
      .update({ 
        agent_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .eq('role', 'agent')
      .select()

    if (error) {
      console.error('Error updating agent status:', error)
      return NextResponse.json(
        { error: 'Failed to update agent status', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Agent status updated',
      data
    })
  } catch (error) {
    console.error('Error in debug-agent-status POST:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
