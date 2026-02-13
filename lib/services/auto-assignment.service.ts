// Auto Assignment Service
// Service untuk handle auto-assignment conversations ke agents

import { createClient } from '@/lib/supabase/client'

export interface AutoAssignmentSettings {
  enabled: boolean
  strategy: 'round_robin' | 'least_busy' | 'random'
  assign_to_roles: string[]
  only_active_agents: boolean
  max_conversations_per_agent: number | null
}

/**
 * Get auto-assignment settings
 */
export async function getAutoAssignmentSettings(): Promise<AutoAssignmentSettings | null> {
  const supabase = createClient()
  
  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'auto_assignment')
    .single()

  if (error) {
    console.error('Error fetching auto-assignment settings:', error)
    return null
  }

  // @ts-ignore - Supabase type issue
  return data?.setting_value as AutoAssignmentSettings
}

/**
 * Get next agent using round-robin strategy
 */
export async function getNextAgentRoundRobin(): Promise<string | null> {
  const supabase = createClient()
  
  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase.rpc('get_next_agent_round_robin')

  if (error) {
    console.error('Error getting next agent:', error)
    return null
  }

  return data
}

/**
 * Get next agent using least-busy strategy
 */
export async function getNextAgentLeastBusy(): Promise<string | null> {
  const supabase = createClient()
  const settings = await getAutoAssignmentSettings()
  
  if (!settings) return null

  // Get agents with their conversation counts
  // @ts-ignore - Supabase type issue
  const { data: agents, error } = await supabase
    // @ts-ignore - Supabase type issue
    .rpc('get_agents_with_conversation_counts', {
      p_roles: settings.assign_to_roles,
      p_only_active: settings.only_active_agents,
      p_max_conversations: settings.max_conversations_per_agent
    })

  if (error) {
    console.error('Error getting least busy agent:', error)
    return null
  }

  // Return agent with least conversations
  // @ts-ignore - Supabase type issue
  if (agents && agents.length > 0) {
    // @ts-ignore - Supabase type issue
    return agents[0].agent_id
  }

  return null
}

/**
 * Get next agent using random strategy
 */
export async function getNextAgentRandom(): Promise<string | null> {
  const supabase = createClient()
  const settings = await getAutoAssignmentSettings()
  
  if (!settings) return null

  // Get eligible agents
  // @ts-ignore - Supabase type issue
  const { data: agents, error } = await supabase
    .from('profiles')
    .select(`
      id,
      user_roles!inner (
        role:roles!inner (
          role_name
        )
      )
    `)
    .eq('is_active', settings.only_active_agents)
    .in('user_roles.role.role_name', settings.assign_to_roles)

  if (error) {
    console.error('Error getting random agent:', error)
    return null
  }

  // @ts-ignore - Supabase type issue
  if (!agents || agents.length === 0) return null

  // Return random agent
  // @ts-ignore - Supabase type issue
  const randomIndex = Math.floor(Math.random() * agents.length)
  // @ts-ignore - Supabase type issue
  return agents[randomIndex].id
}

/**
 * Auto-assign conversation to agent based on settings
 */
export async function autoAssignConversation(conversationId: string): Promise<boolean> {
  const supabase = createClient()
  const settings = await getAutoAssignmentSettings()

  // Check if auto-assignment is enabled
  if (!settings || !settings.enabled) {
    return false
  }

  // Get next agent based on strategy
  let agentId: string | null = null

  switch (settings.strategy) {
    case 'round_robin':
      agentId = await getNextAgentRoundRobin()
      break
    case 'least_busy':
      agentId = await getNextAgentLeastBusy()
      break
    case 'random':
      agentId = await getNextAgentRandom()
      break
  }

  if (!agentId) {
    console.warn('No agent available for auto-assignment')
    return false
  }

  // Assign conversation to agent
  // @ts-ignore - Supabase type issue
  const { error } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update({
      assigned_to: agentId,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error auto-assigning conversation:', error)
    return false
  }

  console.log(`Auto-assigned conversation ${conversationId} to agent ${agentId}`)
  return true
}

/**
 * Check if agent can receive more conversations
 */
export async function canAgentReceiveMore(agentId: string): Promise<boolean> {
  const supabase = createClient()
  const settings = await getAutoAssignmentSettings()

  if (!settings || !settings.max_conversations_per_agent) {
    return true // No limit
  }

  // Count active conversations for agent
  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', agentId)
    .eq('status', 'open')

  if (error) {
    console.error('Error checking agent capacity:', error)
    return false
  }

  return (count || 0) < settings.max_conversations_per_agent
}
