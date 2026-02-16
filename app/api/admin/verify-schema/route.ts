// app/api/admin/verify-schema/route.ts
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

    // Try to query profiles with last_activity
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, agent_status, last_activity, updated_at')
      .eq('role', 'agent')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: error.hint,
        details: error.details,
        message: 'Column last_activity might not exist in profiles table'
      }, { status: 500 })
    }

    // Try to update a test record
    if (data && data.length > 0) {
      const testAgent = data[0] as { id: string }
      const { error: updateError } = await supabase
        .from('profiles')
        // @ts-ignore - Supabase type inference issue
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('id', testAgent.id)

      if (updateError) {
        return NextResponse.json({
          success: false,
          error: updateError.message,
          hint: updateError.hint,
          details: updateError.details,
          message: 'Failed to update last_activity column'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Schema verification passed',
      sampleData: data,
      columnsFound: data && data.length > 0 ? Object.keys(data[0]) : []
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
