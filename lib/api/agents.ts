// API functions for agents
import { createClient } from '@/lib/supabase/client'
import { getUserIdsWithPermission } from '@/lib/rbac/client-helpers'

export interface Agent {
  id: string
  full_name: string
  role?: string
  avatar_url: string | null
  is_active: boolean
  last_seen_at: string | null
}

/**
 * Fetch all active agents dynamically (users with chat.send permission)
 */
export async function fetchAgents(): Promise<Agent[]> {
  const supabase = createClient()

  // Dynamic: find users who have 'chat.send' permission
  const agentIds = await getUserIdsWithPermission('chat.send')
  if (agentIds.length === 0) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, is_active, last_seen_at')
    .eq('is_active', true)
    .in('id', agentIds)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching agents:', error)
    throw new Error(error.message)
  }

  return (data as Agent[]) || []
}

/**
 * Fetch agent by ID
 */
export async function fetchAgentById(agentId: string): Promise<Agent | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, is_active, last_seen_at')
    .eq('id', agentId)
    .single()

  if (error) {
    console.error('Error fetching agent:', error)
    return null
  }

  return data as Agent
}
