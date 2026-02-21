/**
 * WhatsApp Session Access Helper
 * Helper functions to check user access to WhatsApp sessions
 */

import { createClient } from '@/lib/supabase/server'
import { userHasFullAccess } from '@/lib/rbac/role-checker'

/**
 * Check if user has access to a specific session
 * Returns true if:
 * 1. User has full access role (Owner, Supervisor, Admin, Manager)
 * 2. Only 1 session exists (auto-access for all users)
 * 3. User is assigned to the session
 */
export async function userHasSessionAccess(
  userId: string,
  sessionId: string
): Promise<boolean> {
  // Check if user has full access role
  const hasFullAccess = await userHasFullAccess(userId)
  if (hasFullAccess) {
    return true
  }

  const supabase = await createClient()

  // Check total number of active sessions
  const { count } = await supabase
    .from('whatsapp_sessions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['connected', 'connecting'])

  // If only 1 session, all users have access
  if (count === 1) {
    return true
  }

  // Check if user is assigned to this session
  const { data: assignment } = await supabase
    .from('user_whatsapp_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .single()

  return !!assignment
}

/**
 * Get all sessions that user has access to
 * Returns:
 * - All sessions if user has full access role
 * - All sessions if only 1 session exists
 * - Assigned sessions otherwise
 */
export async function getUserAccessibleSessions(
  userId: string
): Promise<string[]> {
  const supabase = await createClient()

  // Check if user has full access role
  const hasFullAccess = await userHasFullAccess(userId)

  // Get all active sessions
  const { data: allSessions } = await supabase
    .from('whatsapp_sessions')
    .select('id')
    .in('status', ['connected', 'connecting'])

  const sessionIds = allSessions?.map(s => s.id) || []

  // Full access roles have access to all
  if (hasFullAccess) {
    return sessionIds
  }

  // If only 1 session, all users have access
  if (sessionIds.length === 1) {
    return sessionIds
  }

  // Get user's assigned sessions
  const { data: assignments } = await supabase
    .from('user_whatsapp_sessions')
    .select('session_id')
    .eq('user_id', userId)
    .eq('is_active', true)

  return assignments?.map(a => a.session_id) || []
}

/**
 * Check if auto-access is enabled (only 1 session exists)
 */
export async function isAutoAccessEnabled(): Promise<boolean> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('whatsapp_sessions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['connected', 'connecting'])

  return count === 1
}

/**
 * Get session access info for user
 */
export async function getSessionAccessInfo(userId: string): Promise<{
  hasFullAccess: boolean
  autoAccessEnabled: boolean
  sessionCount: number
  accessibleSessionIds: string[]
}> {
  const supabase = await createClient()

  // Check if user has full access role
  const hasFullAccess = await userHasFullAccess(userId)

  // Get session count
  const { count } = await supabase
    .from('whatsapp_sessions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['connected', 'connecting'])

  const sessionCount = count || 0
  const autoAccessEnabled = sessionCount === 1

  // Get accessible sessions
  const accessibleSessionIds = await getUserAccessibleSessions(userId)

  return {
    hasFullAccess,
    autoAccessEnabled,
    sessionCount,
    accessibleSessionIds
  }
}
