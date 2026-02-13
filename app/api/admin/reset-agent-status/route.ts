// app/api/admin/reset-agent-status/route.ts
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
        { error: 'Only owners can reset agent status' },
        { status: 403 }
      )
    }

    // Reset all agents to offline
    const { error } = await supabase
      .from('profiles')
      // @ts-ignore - Supabase type inference issue
      .update({ 
        agent_status: 'offline',
        updated_at: new Date().toISOString()
      })
      .eq('role', 'agent')

    if (error) {
      console.error('Error resetting agent status:', error)
      return NextResponse.json(
        { error: 'Failed to reset agent status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'All agent statuses reset to offline'
    })
  } catch (error) {
    console.error('Error in reset-agent-status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
