// API Route: Get User Permissions
// GET /api/rbac/permissions - Get current user's permissions

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user permissions
    const { data: permissions, error: permError } = await supabase
      // @ts-ignore - Supabase RPC type inference issue
      .rpc('get_user_permissions', { p_user_id: user.id })

    if (permError) {
      console.error('Error fetching permissions:', permError)
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      )
    }

    // Get user roles
    const { data: roles, error: roleError } = await supabase
      // @ts-ignore - Supabase RPC type inference issue
      .rpc('get_user_roles', { p_user_id: user.id })

    if (roleError) {
      console.error('Error fetching roles:', roleError)
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      permissions: permissions || [],
      roles: roles || [],
    })
  } catch (error) {
    console.error('Error in permissions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
