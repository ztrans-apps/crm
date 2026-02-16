// Conversation service - handles conversation business logic
import { BaseService } from './base.service'
import type { UserRole } from '@/lib/permissions/roles'
import { canViewConversation } from '@/lib/permissions/chat'

export interface ConversationFilters {
  status?: 'open' | 'closed'
  assignedTo?: string | null
  workflowStatus?: 'incoming' | 'waiting' | 'in_progress' | 'done'
  searchQuery?: string
}

export class ConversationService extends BaseService {
  /**
   * Get conversations based on user role and filters
   */
  async getConversations(
    userId: string,
    role: UserRole,
    filters?: ConversationFilters
  ) {
    try {
      this.log('ConversationService', 'Getting conversations', { userId, role, filters })

      let query = this.supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts!inner(id, name, phone_number, email, metadata),
          whatsapp_session:whatsapp_sessions(id),
          assigned_agent:profiles!conversations_assigned_to_fkey(id, full_name, email)
        `)

      // Apply role-based filtering
      if (role === 'agent') {
        // Agents see:
        // 1. Conversations assigned to them
        // 2. Unassigned conversations (incoming/waiting status only)
        query = query.or(`and(assigned_to.eq.${userId}),and(assigned_to.is.null,workflow_status.in.(incoming,waiting))`)
      }
      // Owners and supervisors see all (no filter)

      // Apply additional filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.assignedTo !== undefined) {
        if (filters.assignedTo === null) {
          query = query.is('assigned_to', null)
        } else {
          query = query.eq('assigned_to', filters.assignedTo)
        }
      }

      if (filters?.workflowStatus) {
        query = query.eq('workflow_status', filters.workflowStatus)
      }

      // Order by most recent
      query = query.order('last_message_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        this.handleError(error, 'ConversationService.getConversations')
      }

      // Filter by permission (additional security layer)
      const filtered = (data || []).filter(conv => 
        canViewConversation(role, userId, conv)
      )

      // Apply search filter in memory (for better performance)
      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        return filtered.filter(conv =>
          conv.contact?.name?.toLowerCase().includes(query) ||
          conv.contact?.phone_number?.includes(query) ||
          conv.last_message?.toLowerCase().includes(query)
        )
      }

      return filtered
    } catch (error) {
      this.handleError(error, 'ConversationService.getConversations')
    }
  }

  /**
   * Get single conversation by ID
   */
  async getConversationById(conversationId: string) {
    try {
      this.log('ConversationService', 'Getting conversation', { conversationId })

      const { data, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts!inner(id, name, phone_number, email, metadata),
          whatsapp_session:whatsapp_sessions(id),
          assigned_agent:profiles!conversations_assigned_to_fkey(id, full_name, email)
        `)
        .eq('id', conversationId)
        .single()

      if (error) {
        this.handleError(error, 'ConversationService.getConversationById')
      }

      return data
    } catch (error) {
      this.handleError(error, 'ConversationService.getConversationById')
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string) {
    try {
      this.log('ConversationService', 'Marking as read', { conversationId })

      // @ts-ignore
      const { error } = await this.supabase
        .from('conversations')
        .update({
          read_status: 'read',
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      if (error) {
        this.handleError(error, 'ConversationService.markAsRead')
      }

      return true
    } catch (error) {
      this.handleError(error, 'ConversationService.markAsRead')
    }
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string, userId: string) {
    try {
      this.log('ConversationService', 'Closing conversation', { conversationId, userId })

      // @ts-ignore
      const { error } = await this.supabase
        .from('conversations')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      if (error) {
        this.handleError(error, 'ConversationService.closeConversation')
      }

      return true
    } catch (error) {
      this.handleError(error, 'ConversationService.closeConversation')
    }
  }

  /**
   * Pick conversation (agent self-assign)
   */
  async pickConversation(conversationId: string, agentId: string) {
    try {
      this.log('ConversationService', 'Picking conversation', { conversationId, agentId })

      // @ts-ignore
      const { error } = await this.supabase
        .from('conversations')
        .update({
          assigned_to: agentId,
          assignment_method: 'manual',
          workflow_status: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .is('assigned_to', null) // Only pick if unassigned

      if (error) {
        this.handleError(error, 'ConversationService.pickConversation')
      }

      return true
    } catch (error) {
      this.handleError(error, 'ConversationService.pickConversation')
    }
  }

  /**
   * Assign conversation to agent (owner action)
   */
  async assignConversation(conversationId: string, agentId: string) {
    try {
      this.log('ConversationService', 'Assigning conversation', { conversationId, agentId })

      // @ts-ignore
      const { error } = await this.supabase
        .from('conversations')
        .update({
          assigned_to: agentId,
          assignment_method: 'manual',
          workflow_status: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      if (error) {
        this.handleError(error, 'ConversationService.assignConversation')
      }

      return true
    } catch (error) {
      this.handleError(error, 'ConversationService.assignConversation')
    }
  }

  /**
   * Handover conversation to another agent
   */
  async handoverConversation(
    conversationId: string,
    fromAgentId: string,
    toAgentId: string,
    reason?: string
  ) {
    try {
      this.log('ConversationService', 'Handing over conversation', {
        conversationId,
        fromAgentId,
        toAgentId,
        reason,
      })

      // Update conversation
      // @ts-ignore
      const { error: updateError } = await this.supabase
        .from('conversations')
        .update({
          assigned_to: toAgentId,
          assignment_method: 'manual',
          workflow_status: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('assigned_to', fromAgentId) // Only if currently assigned to fromAgent

      if (updateError) {
        this.handleError(updateError, 'ConversationService.handoverConversation')
      }

      // Log handover for tracking
      // @ts-ignore
      const { error: logError } = await this.supabase
        .from('handover_logs')
        .insert({
          conversation_id: conversationId,
          from_agent_id: fromAgentId,
          to_agent_id: toAgentId,
          reason: reason || null,
          handover_at: new Date().toISOString(),
          tenant_id: this.defaultTenantId,
        })

      if (logError) {
        console.error('Failed to log handover:', logError)
        // Don't throw error, handover already succeeded
      }

      return true
    } catch (error) {
      this.handleError(error, 'ConversationService.handoverConversation')
    }
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    conversationId: string,
    status: 'incoming' | 'waiting' | 'in_progress' | 'done',
    userId: string
  ) {
    try {
      this.log('ConversationService', 'Updating workflow status', {
        conversationId,
        status,
        userId,
      })

      // @ts-ignore
      const { error } = await this.supabase
        .from('conversations')
        .update({
          workflow_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      if (error) {
        this.handleError(error, 'ConversationService.updateWorkflowStatus')
      }

      return true
    } catch (error) {
      this.handleError(error, 'ConversationService.updateWorkflowStatus')
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(userId: string, role: UserRole) {
    try {
      this.log('ConversationService', 'Getting conversation stats', { userId, role })

      const conversations = await this.getConversations(userId, role)

      return {
        total: conversations.length,
        open: conversations.filter(c => c.status === 'open').length,
        closed: conversations.filter(c => c.status === 'closed').length,
        unassigned: conversations.filter(c => !c.assigned_to).length,
        assigned: conversations.filter(c => c.assigned_to === userId).length,
        unread: conversations.filter(c => c.unread_count > 0).length,
        byWorkflowStatus: {
          incoming: conversations.filter(c => c.workflow_status === 'incoming').length,
          waiting: conversations.filter(c => c.workflow_status === 'waiting').length,
          in_progress: conversations.filter(c => c.workflow_status === 'in_progress').length,
          done: conversations.filter(c => c.workflow_status === 'done').length,
        },
      }
    } catch (error) {
      this.handleError(error, 'ConversationService.getConversationStats')
    }
  }

  /**
   * Get handover statistics for an agent
   */
  async getHandoverStats(agentId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      this.log('ConversationService', 'Getting handover stats', { agentId, dateFrom, dateTo })

      let query = this.supabase
        .from('handover_logs')
        .select(`
          *,
          from_agent:profiles!handover_logs_from_agent_id_fkey(id, full_name, email),
          to_agent:profiles!handover_logs_to_agent_id_fkey(id, full_name, email),
          conversation:conversations(id, contact:contacts(name, phone_number))
        `)

      // Filter by agent (either from or to)
      query = query.or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`)

      // Apply date filters
      if (dateFrom) {
        query = query.gte('handover_at', dateFrom.toISOString())
      }
      if (dateTo) {
        query = query.lte('handover_at', dateTo.toISOString())
      }

      query = query.order('handover_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        this.handleError(error, 'ConversationService.getHandoverStats')
      }

      const handovers = data || []

      // Calculate statistics
      const handedOver = handovers.filter(h => h.from_agent_id === agentId)
      const received = handovers.filter(h => h.to_agent_id === agentId)

      return {
        total: handovers.length,
        handedOver: handedOver.length,
        received: received.length,
        handedOverList: handedOver,
        receivedList: received,
        allHandovers: handovers,
      }
    } catch (error) {
      this.handleError(error, 'ConversationService.getHandoverStats')
    }
  }

  /**
   * Get handover history for a conversation
   */
  async getConversationHandoverHistory(conversationId: string) {
    try {
      this.log('ConversationService', 'Getting conversation handover history', { conversationId })

      const { data, error } = await this.supabase
        .from('handover_logs')
        .select(`
          *,
          from_agent:profiles!handover_logs_from_agent_id_fkey(id, full_name, email),
          to_agent:profiles!handover_logs_to_agent_id_fkey(id, full_name, email)
        `)
        .eq('conversation_id', conversationId)
        .order('handover_at', { ascending: false })

      if (error) {
        this.handleError(error, 'ConversationService.getConversationHandoverHistory')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'ConversationService.getConversationHandoverHistory')
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService()
