// app/api/agent-status/offline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update agent status to offline
    const { error } = await supabase
      .from('profiles')
      // @ts-ignore - Supabase type inference issue
      .update({ 
        agent_status: 'offline',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .eq('role', 'agent') // Only update if user is an agent

    if (error) {
      console.error('Error updating agent status:', error)
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in agent-status/offline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
