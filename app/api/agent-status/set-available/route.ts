// app/api/agent-status/set-available/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile to check if agent
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as any)?.role !== 'agent') {
      return NextResponse.json(
        { error: 'Only agents can set status' },
        { status: 403 }
      )
    }

    // Update status and last_activity
    const now = new Date().toISOString()
    const { data, error} = await supabase
      .from('profiles')
      // @ts-ignore - Supabase type inference issue
      .update({ 
        agent_status: 'available',
        last_activity: now,
        updated_at: now
      })
      .eq('id', user.id)
      .select()

    if (error) {
      console.error('Error setting available status:', error)
      return NextResponse.json(
        { error: 'Failed to set status', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      timestamp: now,
      data
    })
  } catch (error) {
    console.error('Error in set-available:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
