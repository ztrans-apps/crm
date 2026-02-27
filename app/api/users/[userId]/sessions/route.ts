/**
 * User WhatsApp Sessions API
 * Manage WhatsApp session assignments for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

// GET: Get user's assigned sessions
export const GET = withAuth(async (req, ctx, params) => {
  const { userId } = await params

  // Get user's assigned sessions
  const { data: assignments, error } = await ctx.supabase
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
})

// POST: Assign sessions to user
export const POST = withAuth(async (req, ctx, params) => {
  const { userId } = await params
  const body = await req.json()
  const { session_ids } = body

  if (!session_ids || !Array.isArray(session_ids)) {
    return NextResponse.json(
      { error: 'session_ids array is required' },
      { status: 400 }
    )
  }

  // Get tenant_id from target user's profile
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  const tenantId = profile?.tenant_id || ctx.tenantId

  // Prepare assignments
  const assignments = session_ids.map(sessionId => ({
    user_id: userId,
    session_id: sessionId,
    tenant_id: tenantId,
    assigned_by: ctx.user.id,
    is_active: true
  }))

  // Insert assignments (upsert to handle duplicates)
  const { data, error } = await ctx.supabase
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
}, { permission: 'sessions.assign' })

// DELETE: Remove session assignment
export const DELETE = withAuth(async (req, ctx, params) => {
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json(
      { error: 'session_id query parameter is required' },
      { status: 400 }
    )
  }

  // Delete assignment
  const { error } = await ctx.supabase
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
}, { permission: 'sessions.assign' })
