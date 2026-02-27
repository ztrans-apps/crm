// API functions for agent routing and assignment
import { createClient } from '@/lib/supabase/client'

export type RoutingMethod = 'manual' | 'round_robin' | 'tag_based' | 'load_balanced'
export type Department = 'sales' | 'cs' | 'support' | 'general'
export type AgentStatus = 'available' | 'busy' | 'offline'

/**
 * Agent picks a conversation manually (self-assign)
 */
export async function pickConversation(
  conversationId: string,
  agentId: string
): Promise<void> {
  const supabase = createClient()

  console.log('pickConversation:', { conversationId, agentId })

  const { error } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update({
      assigned_to: agentId,
      assignment_method: 'manual',
      picked_at: new Date().toISOString(),
      workflow_status: 'waiting',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .is('assigned_to', null) // Only pick if unassigned

  if (error) {
    console.error('Error picking conversation:', error)
    throw new Error(error.message)
  }

  console.log('Conversation picked successfully')
}

/**
 * Auto-assign conversation using round-robin
 */
export async function autoAssignRoundRobin(
  conversationId: string,
  department?: Department
): Promise<string | null> {
  const supabase = createClient()

  console.log('autoAssignRoundRobin:', { conversationId, department })

  // Call database function to get next agent
  // @ts-ignore - Bypass Supabase type checking for RPC
  const { data, error } = await supabase.rpc('get_next_round_robin_agent', {
    dept: department || null,
  })

  if (error) {
    console.error('Error getting next agent:', error)
    throw new Error(error.message)
  }

  const agentId = data as string | null

  if (!agentId) {
    console.log('No available agent found')
    return null
  }

  // Assign conversation to agent
  const { error: assignError } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update({
      assigned_to: agentId,
      assignment_method: 'auto',
      auto_assigned_at: new Date().toISOString(),
      workflow_status: 'waiting',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (assignError) {
    console.error('Error assigning conversation:', assignError)
    throw new Error(assignError.message)
  }

  console.log('Conversation auto-assigned to:', agentId)
  return agentId
}

/**
 * Auto-assign conversation based on tags/department
 */
export async function autoAssignByTags(
  conversationId: string,
  requiredDepartment?: Department,
  requiredSkills?: string[]
): Promise<string | null> {
  const supabase = createClient()

  console.log('autoAssignByTags:', { conversationId, requiredDepartment, requiredSkills })

  // Call database function to get matching agent
  // @ts-ignore - Bypass Supabase type checking for RPC
  const { data, error } = await supabase.rpc('get_agent_by_tags', {
    required_dept: requiredDepartment || null,
    required_skills_arr: requiredSkills || [],
  })

  if (error) {
    console.error('Error getting agent by tags:', error)
    throw new Error(error.message)
  }

  const agentId = data as string | null

  if (!agentId) {
    console.log('No matching agent found')
    return null
  }

  // Assign conversation to agent
  // @ts-ignore - Supabase type issue
  const { error: assignError } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update({
      assigned_to: agentId,
      assignment_method: 'tag_based',
      required_department: requiredDepartment || null,
      required_skills: requiredSkills || [],
      auto_assigned_at: new Date().toISOString(),
      workflow_status: 'waiting',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (assignError) {
    console.error('Error assigning conversation:', assignError)
    throw new Error(assignError.message)
  }

  console.log('Conversation assigned by tags to:', agentId)
  return agentId
}

/**
 * Auto-assign to agent with least load
 */
export async function autoAssignLeastLoaded(
  conversationId: string,
  department?: Department
): Promise<string | null> {
  const supabase = createClient()

  console.log('autoAssignLeastLoaded:', { conversationId, department })

  // Call database function to get least loaded agent
  // @ts-ignore - Bypass Supabase type checking for RPC
  const { data, error } = await supabase.rpc('get_least_loaded_agent', {
    dept: department || null,
  })

  if (error) {
    console.error('Error getting least loaded agent:', error)
    throw new Error(error.message)
  }

  const agentId = data as string | null

  if (!agentId) {
    console.log('No available agent found')
    return null
  }

  // Assign conversation to agent
  const { error: assignError } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update({
      assigned_to: agentId,
      assignment_method: 'auto',
      auto_assigned_at: new Date().toISOString(),
      workflow_status: 'waiting',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (assignError) {
    console.error('Error assigning conversation:', assignError)
    throw new Error(assignError.message)
  }

  console.log('Conversation assigned to least loaded agent:', agentId)
  return agentId
}

/**
 * Get unassigned conversations (for manual pick pool)
 */
export async function getUnassignedConversations(department?: Department) {
  const supabase = createClient()

  let query = supabase
    .from('conversations')
    .select(`
      *,
      contact:contacts(*)
    `)
    .is('assigned_to', null)
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  if (department) {
    query = query.or(`required_department.eq.${department},required_department.is.null`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching unassigned conversations:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Update agent status
 */
export async function updateAgentStatus(
  agentId: string,
  status: AgentStatus
): Promise<void> {
  const supabase = createClient()

  // @ts-ignore - Supabase type issue
  const { error } = await supabase
    .from('profiles')
    // @ts-ignore - Supabase type issue
    .update({
      agent_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)

  if (error) {
    console.error('Error updating agent status:', error)
    throw new Error(error.message)
  }
}

/**
 * Update agent department
 */
export async function updateAgentDepartment(
  agentId: string,
  department: Department
): Promise<void> {
  const supabase = createClient()

  // @ts-ignore - Supabase type issue
  const { error } = await supabase
    .from('profiles')
    // @ts-ignore - Supabase type issue
    .update({
      department,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)

  if (error) {
    console.error('Error updating agent department:', error)
    throw new Error(error.message)
  }
}

/**
 * Update agent skills
 */
export async function updateAgentSkills(
  agentId: string,
  skills: string[]
): Promise<void> {
  const supabase = createClient()

  // @ts-ignore - Supabase type issue
  const { error } = await supabase
    .from('profiles')
    // @ts-ignore - Supabase type issue
    .update({
      skills,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)

  if (error) {
    console.error('Error updating agent skills:', error)
    throw new Error(error.message)
  }
}

/**
 * Get active routing configuration
 */
export async function getActiveRoutingConfig() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('routing_config')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching routing config:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Set active routing method
 */
export async function setActiveRoutingMethod(
  routingMethod: RoutingMethod
): Promise<void> {
  const supabase = createClient()

  // Deactivate all
  // @ts-ignore - Supabase type issue
  await supabase
    .from('routing_config')
    // @ts-ignore - Supabase type issue
    .update({ is_active: false })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

  // Activate selected
  // @ts-ignore - Supabase type issue
  const { error } = await supabase
    .from('routing_config')
    // @ts-ignore - Supabase type issue
    .update({ is_active: true })
    .eq('routing_method', routingMethod)

  if (error) {
    console.error('Error setting routing method:', error)
    throw new Error(error.message)
  }
}

/**
 * Get agent statistics
 */
export async function getAgentStats(agentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('active_chats_count, max_concurrent_chats, agent_status, department')
    .eq('id', agentId)
    .single()

  if (error) {
    console.error('Error fetching agent stats:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Get all available agents
 */
export async function getAvailableAgents(department?: Department) {
  const supabase = createClient()

  // Dynamic: find agent user IDs via user_roles → permissions
  const { data: roleUsers } = await supabase
    .from('user_roles')
    .select(`
      user_id,
      roles!inner (
        role_permissions!inner (
          permissions!inner (
            permission_key
          )
        )
      )
    `)
  const agentIds: string[] = []
  for (const ur of (roleUsers || [])) {
    const role = (ur as any).roles
    if (!role?.role_permissions) continue
    for (const rp of role.role_permissions) {
      if (rp.permissions?.permission_key === 'chat.send') {
        agentIds.push((ur as any).user_id)
        break
      }
    }
  }

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, department, skills, agent_status, active_chats_count, max_concurrent_chats')
    .in('id', agentIds.length > 0 ? agentIds : ['__none__'])
    .eq('is_active', true)
    .eq('agent_status', 'available')
    .order('active_chats_count', { ascending: true })

  if (department) {
    query = query.eq('department', department)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching available agents:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Handover conversation to another agent
 */
export async function handoverConversation(
  conversationId: string,
  fromAgentId: string,
  toAgentId: string,
  reason?: string
): Promise<void> {
  const supabase = createClient()

  console.log('handoverConversation:', { conversationId, fromAgentId, toAgentId, reason })

  // Update conversation assignment
  // @ts-ignore - Supabase type issue
  const { error } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update({
      assigned_to: toAgentId,
      assignment_method: 'handover',
      handover_from: fromAgentId,
      handover_reason: reason || null,
      handover_at: new Date().toISOString(),
      workflow_status: 'waiting', // Reset to waiting for new agent
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('assigned_to', fromAgentId) // Only if currently assigned to fromAgent

  if (error) {
    console.error('Error handing over conversation:', error)
    throw new Error(error.message)
  }

  // Log handover in status history
  // @ts-ignore - Supabase type issue
  await supabase
    .from('conversation_status_history')
    // @ts-ignore - Supabase type issue
    .insert({
      conversation_id: conversationId,
      from_status: 'in_progress',
      to_status: 'waiting',
      changed_by: fromAgentId,
      notes: `Handover to agent ${toAgentId}${reason ? ': ' + reason : ''}`,
    })

  console.log('Conversation handed over successfully')
}

/**
 * Assign conversation to a specific agent (owner action)
 */
export async function assignConversation(
  conversationId: string,
  agentId: string
): Promise<void> {
  const supabase = createClient()

  console.log('assignConversation:', { conversationId, agentId })

  // @ts-ignore - Supabase type issue
  const { error } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update({
      assigned_to: agentId,
      assignment_method: 'manual',
      assigned_at: new Date().toISOString(),
      workflow_status: 'waiting',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error assigning conversation:', error)
    throw new Error(error.message)
  }

  console.log('Conversation assigned successfully')
}
