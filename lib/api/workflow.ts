// API functions for agent workflow management
import { createClient } from '@/lib/supabase/client'
import type { WorkflowStatus, ConversationStatusHistory, AgentWorkflowAnalytics } from '@/lib/types/chat'

/**
 * Update conversation workflow status
 */
export async function updateWorkflowStatus(
  conversationId: string,
  status: WorkflowStatus,
  notes?: string
): Promise<void> {
  const supabase = createClient()

  console.log('updateWorkflowStatus called:', { conversationId, status, notes })

  // First, check if conversation exists and user has access
  // @ts-ignore - Supabase type issue
  const { data: conversation, error: fetchError } = await supabase
    .from('conversations')
    .select('id, workflow_status, assigned_to')
    .eq('id', conversationId)
    .single()

  if (fetchError) {
    console.error('Error fetching conversation:', fetchError)
    throw new Error(`Cannot access conversation: ${fetchError.message}`)
  }

  if (!conversation) {
    console.error('Conversation not found:', conversationId)
    throw new Error('Conversation not found')
  }

  console.log('Current conversation:', conversation)

  // Prevent changing status if already done
  // @ts-ignore - Supabase type issue
  if (conversation.workflow_status === 'done') {
    throw new Error('Chat sudah selesai dan tidak bisa diubah lagi')
  }

  // Prepare update data
  const updateData: any = {
    workflow_status: status,
    updated_at: new Date().toISOString(),
  }

  // If status is 'done', also close the conversation
  if (status === 'done') {
    const { data: { user } } = await supabase.auth.getUser()
    updateData.status = 'closed'
    updateData.closed_at = new Date().toISOString()
    updateData.closed_by = user?.id || null
    updateData.workflow_completed_at = new Date().toISOString()
  }

  // If status is 'in_progress' and workflow_started_at is null, set it
  // @ts-ignore - Supabase type issue
  if (status === 'in_progress' && !conversation.workflow_status) {
    updateData.workflow_started_at = new Date().toISOString()
  }

  // Update the workflow status
  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update(updateData)
    .eq('id', conversationId)
    .select()

  if (error) {
    console.error('Error updating workflow status:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to update workflow status: ${error.message}`)
  }

  console.log('Workflow status updated successfully:', data)

  // Optionally add notes to the status history
  if (notes) {
    await addStatusHistoryNote(conversationId, notes)
  }
}

/**
 * Get conversation status history
 */
export async function getStatusHistory(
  conversationId: string
): Promise<ConversationStatusHistory[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversation_status_history')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('Error fetching status history:', error)
    throw new Error(error.message)
  }

  return (data as ConversationStatusHistory[]) || []
}

/**
 * Add note to status history
 */
export async function addStatusHistoryNote(
  conversationId: string,
  notes: string
): Promise<void> {
  const supabase = createClient()

  // Get the latest status history entry
  // @ts-ignore - Supabase type issue
  const { data: latestEntry } = await supabase
    .from('conversation_status_history')
    .select('id')
    .eq('conversation_id', conversationId)
    .order('changed_at', { ascending: false })
    .limit(1)
    .single()

  if (latestEntry) {
    // @ts-ignore - Supabase type issue
    const { error } = await supabase
      .from('conversation_status_history')
      // @ts-ignore - Supabase type issue
      .update({ notes })
      // @ts-ignore - Supabase type issue
      .eq('id', latestEntry.id)

    if (error) {
      console.error('Error adding status history note:', error)
      throw new Error(error.message)
    }
  }
}

/**
 * Get agent workflow analytics
 */
export async function getAgentWorkflowAnalytics(
  agentId?: string,
  startDate?: string,
  endDate?: string
): Promise<AgentWorkflowAnalytics[]> {
  const supabase = createClient()

  let query = supabase
    .from('agent_workflow_analytics')
    .select('*')

  if (agentId) {
    query = query.eq('agent_id', agentId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching agent analytics:', error)
    throw new Error(error.message)
  }

  return (data as AgentWorkflowAnalytics[]) || []
}

/**
 * Get workflow statistics for a specific agent
 */
export async function getAgentWorkflowStats(
  agentId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  total: number
  incoming: number
  waiting: number
  in_progress: number
  done: number
  avg_handling_time: number | null
  avg_first_response_time: number | null
}> {
  const supabase = createClient()

  let query = supabase
    .from('conversations')
    .select('workflow_status, workflow_started_at, workflow_completed_at, created_at')
    .eq('assigned_to', agentId)

  if (startDate) {
    query = query.gte('created_at', startDate)
  }

  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  // @ts-ignore - Supabase type issue
  const { data, error } = await query

  if (error) {
    console.error('Error fetching agent workflow stats:', error)
    throw new Error(error.message)
  }

  const conversations = data || []

  // Calculate statistics
  // @ts-ignore - Supabase type issue
  const stats = {
    total: conversations.length,
    // @ts-ignore - Supabase type issue
    incoming: conversations.filter(c => c.workflow_status === 'incoming').length,
    // @ts-ignore - Supabase type issue
    waiting: conversations.filter(c => c.workflow_status === 'waiting').length,
    // @ts-ignore - Supabase type issue
    in_progress: conversations.filter(c => c.workflow_status === 'in_progress').length,
    // @ts-ignore - Supabase type issue
    done: conversations.filter(c => c.workflow_status === 'done').length,
    avg_handling_time: null as number | null,
    avg_first_response_time: null as number | null,
  }

  // Calculate average handling time (time from in_progress to done)
  // @ts-ignore - Supabase type issue
  const completedConversations = conversations.filter(
    // @ts-ignore - Supabase type issue
    c => c.workflow_completed_at && c.workflow_started_at
  )

  if (completedConversations.length > 0) {
    // @ts-ignore - Supabase type issue
    const totalHandlingTime = completedConversations.reduce((sum, c) => {
      // @ts-ignore - Supabase type issue
      const started = new Date(c.workflow_started_at!).getTime()
      // @ts-ignore - Supabase type issue
      const completed = new Date(c.workflow_completed_at!).getTime()
      return sum + (completed - started)
    }, 0)

    stats.avg_handling_time = Math.round(totalHandlingTime / completedConversations.length / 1000) // in seconds
  }

  // Calculate average first response time (time from created to in_progress)
  // @ts-ignore - Supabase type issue
  const startedConversations = conversations.filter(c => c.workflow_started_at)

  if (startedConversations.length > 0) {
    // @ts-ignore - Supabase type issue
    const totalFirstResponseTime = startedConversations.reduce((sum, c) => {
      // @ts-ignore - Supabase type issue
      const created = new Date(c.created_at).getTime()
      // @ts-ignore - Supabase type issue
      const started = new Date(c.workflow_started_at!).getTime()
      return sum + (started - created)
    }, 0)

    stats.avg_first_response_time = Math.round(totalFirstResponseTime / startedConversations.length / 1000) // in seconds
  }

  return stats
}

/**
 * Get workflow status distribution for all agents
 */
export async function getAllAgentsWorkflowStats(
  startDate?: string,
  endDate?: string
): Promise<{
  agent_id: string
  agent_name: string | null
  agent_email: string
  total: number
  incoming: number
  waiting: number
  in_progress: number
  done: number
  avg_handling_time: number | null
  avg_first_response_time: number | null
}[]> {
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

  // Get all active agents
  // @ts-ignore - Supabase type issue
  const { data: agents, error: agentsError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', agentIds.length > 0 ? agentIds : ['__none__'])
    .eq('is_active', true)

  if (agentsError) {
    console.error('Error fetching agents:', agentsError)
    throw new Error(agentsError.message)
  }

  // Get stats for each agent
  // @ts-ignore - Supabase type issue
  const statsPromises = (agents || []).map(async (agent) => {
    // @ts-ignore - Supabase type issue
    const stats = await getAgentWorkflowStats(agent.id, startDate, endDate)
    return {
      // @ts-ignore - Supabase type issue
      agent_id: agent.id,
      // @ts-ignore - Supabase type issue
      agent_name: agent.full_name,
      // @ts-ignore - Supabase type issue
      agent_email: agent.email,
      ...stats,
    }
  })

  return Promise.all(statsPromises)
}

/**
 * Get workflow status timeline for a conversation
 */
export async function getConversationWorkflowTimeline(
  conversationId: string
): Promise<{
  status: WorkflowStatus
  timestamp: string
  duration_seconds: number | null
  changed_by: string | null
}[]> {
  const supabase = createClient()

  // @ts-ignore - Supabase type issue
  const { data, error } = await supabase
    .from('conversation_status_history')
    .select('to_status, changed_at, duration_seconds, changed_by')
    .eq('conversation_id', conversationId)
    .order('changed_at', { ascending: true })

  if (error) {
    console.error('Error fetching workflow timeline:', error)
    throw new Error(error.message)
  }

  // @ts-ignore - Supabase type issue
  return (data || []).map(item => ({
    // @ts-ignore - Supabase type issue
    status: item.to_status as WorkflowStatus,
    // @ts-ignore - Supabase type issue
    timestamp: item.changed_at,
    // @ts-ignore - Supabase type issue
    duration_seconds: item.duration_seconds,
    // @ts-ignore - Supabase type issue
    changed_by: item.changed_by,
  }))
}

/**
 * Bulk update workflow status for multiple conversations
 */
export async function bulkUpdateWorkflowStatus(
  conversationIds: string[],
  status: WorkflowStatus
): Promise<void> {
  const supabase = createClient()

  // @ts-ignore - Supabase type issue
  const { error } = await supabase
    .from('conversations')
    // @ts-ignore - Supabase type issue
    .update({
      workflow_status: status,
      updated_at: new Date().toISOString(),
    })
    .in('id', conversationIds)

  if (error) {
    console.error('Error bulk updating workflow status:', error)
    throw new Error(error.message)
  }
}

/**
 * Auto-transition workflow status based on conversation state
 * - When assigned: incoming -> waiting
 * - When first message sent by agent: waiting -> in_progress
 * - When conversation closed: * -> done
 */
export async function autoTransitionWorkflowStatus(
  conversationId: string,
  trigger: 'assigned' | 'agent_replied' | 'closed'
): Promise<void> {
  const supabase = createClient()

  // Get current conversation state
  // @ts-ignore - Supabase type issue
  const { data: conversation } = await supabase
    .from('conversations')
    .select('workflow_status, status')
    .eq('id', conversationId)
    .single()

  if (!conversation) return

  let newStatus: WorkflowStatus | null = null

  switch (trigger) {
    case 'assigned':
      // @ts-ignore - Supabase type issue
      if (conversation.workflow_status === 'incoming') {
        newStatus = 'waiting'
      }
      break

    case 'agent_replied':
      // @ts-ignore - Supabase type issue
      if (conversation.workflow_status === 'waiting' || conversation.workflow_status === 'incoming') {
        newStatus = 'in_progress'
      }
      break

    case 'closed':
      // @ts-ignore - Supabase type issue
      if (conversation.workflow_status !== 'done') {
        newStatus = 'done'
      }
      break
  }

  if (newStatus) {
    await updateWorkflowStatus(conversationId, newStatus)
  }
}
