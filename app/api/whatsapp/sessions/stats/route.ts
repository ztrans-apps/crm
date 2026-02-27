/**
 * WhatsApp Sessions Stats API
 * Get session statistics from Supabase (Meta Cloud API)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
  const { data: sessions, error } = await ctx.supabase
    .from('whatsapp_sessions')
    .select('id, status, phone_number, created_at, updated_at')
    .eq('tenant_id', ctx.tenantId)

  if (error) throw error

  const allSessions = sessions || []
  const active = allSessions.filter(s => s.status === 'connected').length
  const inactive = allSessions.filter(s => s.status !== 'connected').length

  return NextResponse.json({
    stats: {
      total: allSessions.length,
      active,
      inactive,
      sessions: allSessions.map(s => ({
        id: s.id,
        phone_number: s.phone_number,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
    },
  })
})

