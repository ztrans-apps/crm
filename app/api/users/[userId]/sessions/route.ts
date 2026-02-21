/**
 * User WhatsApp Sessions API
 * Manage WhatsApp session assignments for users
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Check if user has specific permission
 */
async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    // Try to use the database function
    const { data, error } = await supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_permission_key: permissionKey
    })
    
    if (error) {
      console.error('[Permission Check] RPC error:', error)
      // Fallback: Check if user is admin
      return await isUserAdminFallback(userId)
    }
    
    return data === true
  } catch (error) {
    console.error('[Permission Check] Error:', error)
    // Fallback: Check if user is admin
    return await isUserAdminFallback(userId)
  }
}

/**
 * Fallback: Check if user is admin (for backward compatibility)
 */
async function isUserAdminFallback(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)
  
  const adminRoles = ['Super Admin', 'Admin', 'Manager', 'Owner', 'Supervisor']
  return userRoles?.some((ur: any) =>
    adminRoles.includes(ur.roles?.role_name)
  ) || false
}

// GET: Get user's assigned sessions
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's assigned sessions
    const { data: assignments, error } = await supabase
      .from('user_whatsapp_sessions')
      .select(`
        id,
        session_id,
        assigned_at,
        is_active,
        whatsapp_sessions (
          id,
          session_name,
          phone_number,
          status,
          qr_code,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('[User Sessions API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format response
    const sessions = assignments?.map(a => ({
      assignment_id: a.id,
      session_id: a.session_id,
      assigned_at: a.assigned_at,
      ...a.whatsapp_sessions
    })) || []

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error('[User Sessions API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Assign sessions to user
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    const body = await request.json()
    const { session_ids } = body

    if (!session_ids || !Array.isArray(session_ids)) {
      return NextResponse.json(
        { error: 'session_ids array is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user has sessions.assign permission
    const hasPermission = await userHasPermission(user.id, 'sessions.assign')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. You need sessions.assign permission.' },
        { status: 403 }
      )
    }

    // Get tenant_id from user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single()

    const tenantId = profile?.tenant_id || process.env.DEFAULT_TENANT_ID

    // Prepare assignments
    const assignments = session_ids.map(sessionId => ({
      user_id: userId,
      session_id: sessionId,
      tenant_id: tenantId,
      assigned_by: user.id,
      is_active: true
    }))

    // Insert assignments (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('user_whatsapp_sessions')
      .upsert(assignments, {
        onConflict: 'user_id,session_id,tenant_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('[User Sessions API] Error assigning sessions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Assigned ${session_ids.length} session(s) to user`,
      assignments: data
    })
  } catch (error: any) {
    console.error('[User Sessions API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Remove session assignment
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user has sessions.assign permission
    const hasPermission = await userHasPermission(user.id, 'sessions.assign')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. You need sessions.assign permission.' },
        { status: 403 }
      )
    }

    // Delete assignment
    const { error } = await supabase
      .from('user_whatsapp_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId)

    if (error) {
      console.error('[User Sessions API] Error removing assignment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Session assignment removed'
    })
  } catch (error: any) {
    console.error('[User Sessions API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
