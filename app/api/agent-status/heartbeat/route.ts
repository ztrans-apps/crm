// app/api/agent-status/heartbeat/route.ts
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
        { error: 'Only agents can send heartbeat' },
        { status: 403 }
      )
    }

    // Update last_activity timestamp
    const { error } = await supabase
      .from('profiles')
      // @ts-ignore - Supabase type inference issue
      .update({ 
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating heartbeat:', error)
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in heartbeat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
