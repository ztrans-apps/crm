// Assignment service - handles agent assignment logic (Dynamic RBAC)
import { BaseService } from './base.service'

export type AssignmentMethod = 'manual' | 'round_robin' | 'least_active' | 'random'

/**
 * Helper: Get IDs of users who have agent-capable roles
 * Looks up users who have the 'chat.send' permission via dynamic RBAC
 */
async function getAgentUserIds(supabase: any): Promise<string[]> {
  const { data } = await supabase
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

  if (!data) return []

  const agentIds = new Set<string>()
  for (const ur of data) {
    const role = (ur as any).roles
    if (!role?.role_permissions) continue
    for (const rp of role.role_permissions) {
      if (rp.permissions?.permission_key === 'chat.send') {
        agentIds.add((ur as any).user_id)
      }
    }
  }

  return Array.from(agentIds)
}

export class AssignmentService extends BaseService {
  /**
   * Get next agent using round-robin method
   */
  async getNextAgentRoundRobin(): Promise<string | null> {
    try {
      this.log('AssignmentService', 'Getting next agent (round-robin)')

      // Get all active agents (dynamic: via user_roles permissions)
      const agentIds = await getAgentUserIds(this.supabase)
      if (agentIds.length === 0) {
        console.warn('No agents with chat.send permission found')
        return null
      }

      const { data: agents, error: agentsError } = await this.supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', agentIds)
        .eq('agent_status', 'available')
        .order('full_name')

      if (agentsError) {
        this.handleError(agentsError, 'AssignmentService.getNextAgentRoundRobin')
        return null
      }

      if (!agents || agents.length === 0) {
        console.warn('No available agents found')
        return null
      }

      // Get assignment counts for each agent (last 24 hours)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const assignmentCounts = await Promise.all(
        agents.map(async (agent) => {
          const { count } = await this.supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', agent.id)
            .gte('created_at', yesterday.toISOString())

          return {
            agentId: agent.id,
            agentName: agent.full_name,
            count: count || 0,
          }
        })
      )

      // Sort by count (ascending) to get agent with least assignments
      assignmentCounts.sort((a, b) => a.count - b.count)

      this.log('AssignmentService', 'Assignment counts', assignmentCounts)

      return assignmentCounts[0].agentId
    } catch (error) {
      this.handleError(error, 'AssignmentService.getNextAgentRoundRobin')
      return null
    }
  }

  /**
   * Get agent with least active conversations
   */
  async getAgentWithLeastActive(): Promise<string | null> {
    try {
      this.log('AssignmentService', 'Getting agent with least active conversations')

      // Get all active agents (dynamic: via user_roles permissions)
      const agentIds = await getAgentUserIds(this.supabase)
      if (agentIds.length === 0) {
        console.warn('No agents with chat.send permission found')
        return null
      }

      const { data: agents, error: agentsError } = await this.supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds)
        .eq('agent_status', 'available')

      if (agentsError) {
        this.handleError(agentsError, 'AssignmentService.getAgentWithLeastActive')
        return null
      }

      if (!agents || agents.length === 0) {
        console.warn('No available agents found')
        return null
      }

      // Get active conversation counts for each agent
      const activeCounts = await Promise.all(
        agents.map(async (agent) => {
          const { count } = await this.supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', agent.id)
            .eq('status', 'open')
            .in('workflow_status', ['waiting', 'in_progress'])

          return {
            agentId: agent.id,
            agentName: agent.full_name,
            activeCount: count || 0,
          }
        })
      )

      // Sort by active count (ascending)
      activeCounts.sort((a, b) => a.activeCount - b.activeCount)

      this.log('AssignmentService', 'Active conversation counts', activeCounts)

      return activeCounts[0].agentId
    } catch (error) {
      this.handleError(error, 'AssignmentService.getAgentWithLeastActive')
      return null
    }
  }

  /**
   * Get random available agent
   */
  async getRandomAgent(): Promise<string | null> {
    try {
      this.log('AssignmentService', 'Getting random agent')

      const agentIds = await getAgentUserIds(this.supabase)
      if (agentIds.length === 0) {
        console.warn('No agents with chat.send permission found')
        return null
      }

      const { data: agents, error } = await this.supabase
        .from('profiles')
        .select('id')
        .in('id', agentIds)
        .eq('agent_status', 'available')

      if (error) {
        this.handleError(error, 'AssignmentService.getRandomAgent')
        return null
      }

      if (!agents || agents.length === 0) {
        console.warn('No available agents found')
        return null
      }

      // Pick random agent
      const randomIndex = Math.floor(Math.random() * agents.length)
      return agents[randomIndex].id
    } catch (error) {
      this.handleError(error, 'AssignmentService.getRandomAgent')
      return null
    }
  }

  /**
   * Auto-assign conversation to agent based on method
   */
  async autoAssignConversation(
    conversationId: string,
    method: AssignmentMethod = 'round_robin'
  ): Promise<{ success: boolean; agentId: string | null; error?: string }> {
    try {
      this.log('AssignmentService', 'Auto-assigning conversation', { conversationId, method })

      let agentId: string | null = null

      switch (method) {
        case 'round_robin':
          agentId = await this.getNextAgentRoundRobin()
          break
        case 'least_active':
          agentId = await this.getAgentWithLeastActive()
          break
        case 'random':
          agentId = await this.getRandomAgent()
          break
        default:
          return { success: false, agentId: null, error: 'Invalid assignment method' }
      }

      if (!agentId) {
        return { success: false, agentId: null, error: 'No available agents found' }
      }

      // Assign conversation to agent
      // @ts-ignore
      const { error: assignError } = await this.supabase
        .from('conversations')
        .update({
          assigned_to: agentId,
          assignment_method: 'auto', // Use 'auto' instead of specific method
          workflow_status: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .is('assigned_to', null) // Only assign if not already assigned

      if (assignError) {
        this.handleError(assignError, 'AssignmentService.autoAssignConversation')
        return { success: false, agentId: null, error: assignError?.message || 'Assignment failed' }
      }

      this.log('AssignmentService', 'Conversation auto-assigned', { conversationId, agentId, method })

      return { success: true, agentId }
    } catch (error: any) {
      this.handleError(error, 'AssignmentService.autoAssignConversation')
      return { success: false, agentId: null, error: error.message }
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(dateFrom?: Date, dateTo?: Date) {
    try {
      this.log('AssignmentService', 'Getting assignment stats')

      let query = this.supabase
        .from('conversations')
        .select('assigned_to, assignment_method, created_at')
        .not('assigned_to', 'is', null)

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString())
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString())
      }

      const { data, error } = await query

      if (error) {
        this.handleError(error, 'AssignmentService.getAssignmentStats')
        return null
      }

      const stats = {
        total: data?.length || 0,
        byMethod: {
          manual: data?.filter(c => c.assignment_method === 'manual').length || 0,
          round_robin: data?.filter(c => c.assignment_method === 'round_robin').length || 0,
          least_active: data?.filter(c => c.assignment_method === 'least_active').length || 0,
          random: data?.filter(c => c.assignment_method === 'random').length || 0,
        },
      }

      return stats
    } catch (error) {
      this.handleError(error, 'AssignmentService.getAssignmentStats')
      return null
    }
  }
}

// Export singleton instance
export const assignmentService = new AssignmentService()
