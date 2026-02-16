/**
 * Assign Conversation Flow - Service Test
 * Test conversation assignment with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockSupabase = {
  from: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => ({
      data: { id: 'conv-1', assigned_to: 'agent-1' },
      error: null,
    })),
  })),
}

const mockAuditLog = {
  log: vi.fn().mockResolvedValue(undefined),
}

// Service to test
class AssignConversationService {
  constructor(
    private supabase: any,
    private auditLog: any
  ) {}

  async assignConversation(data: {
    conversationId: string
    agentId: string
    assignedBy: string
    tenantId: string
  }) {
    // 1. Validate input
    if (!data.conversationId || !data.agentId) {
      throw new Error('Missing required fields')
    }

    // 2. Update conversation
    const { data: conversation, error } = await this.supabase
      .from('conversations')
      .update({
        assigned_to: data.agentId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', data.conversationId)
      .eq('tenant_id', data.tenantId)
      .select()
      .single()

    if (error) throw error

    // 3. Log audit trail
    await this.auditLog.log({
      action: 'conversation.assigned',
      userId: data.assignedBy,
      tenantId: data.tenantId,
      resourceType: 'conversation',
      resourceId: data.conversationId,
      metadata: {
        agentId: data.agentId,
      },
    })

    return {
      success: true,
      conversation,
    }
  }

  async unassignConversation(data: {
    conversationId: string
    unassignedBy: string
    tenantId: string
  }) {
    const { data: conversation, error } = await this.supabase
      .from('conversations')
      .update({
        assigned_to: null,
        assigned_at: null,
      })
      .eq('id', data.conversationId)
      .eq('tenant_id', data.tenantId)
      .select()
      .single()

    if (error) throw error

    await this.auditLog.log({
      action: 'conversation.unassigned',
      userId: data.unassignedBy,
      tenantId: data.tenantId,
      resourceType: 'conversation',
      resourceId: data.conversationId,
    })

    return {
      success: true,
      conversation,
    }
  }
}

describe('Assign Conversation Flow - Service Test', () => {
  let service: AssignConversationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AssignConversationService(mockSupabase, mockAuditLog)
  })

  describe('Assign Conversation', () => {
    it('should assign conversation to agent', async () => {
      const result = await service.assignConversation({
        conversationId: 'conv-1',
        agentId: 'agent-1',
        assignedBy: 'admin-1',
        tenantId: 'tenant-1',
      })

      // Verify database update
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
      
      // Verify audit log
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'conversation.assigned',
          userId: 'admin-1',
          tenantId: 'tenant-1',
          resourceId: 'conv-1',
        })
      )

      expect(result.success).toBe(true)
    })

    it('should validate required fields', async () => {
      await expect(
        service.assignConversation({
          conversationId: '',
          agentId: 'agent-1',
          assignedBy: 'admin-1',
          tenantId: 'tenant-1',
        })
      ).rejects.toThrow('Missing required fields')
    })

    it('should enforce tenant isolation', async () => {
      const eqSpy = vi.fn().mockReturnThis()
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: eqSpy,
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => ({
          data: { id: 'conv-1', assigned_to: 'agent-1' },
          error: null,
        })),
      })

      await service.assignConversation({
        conversationId: 'conv-1',
        agentId: 'agent-1',
        assignedBy: 'admin-1',
        tenantId: 'tenant-123',
      })
      
      // Verify tenant_id is used in query
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-123')
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => ({
          data: null,
          error: { message: 'Conversation not found' },
        })),
      })

      await expect(
        service.assignConversation({
          conversationId: 'conv-1',
          agentId: 'agent-1',
          assignedBy: 'admin-1',
          tenantId: 'tenant-1',
        })
      ).rejects.toThrow()
    })
  })

  describe('Unassign Conversation', () => {
    it('should unassign conversation', async () => {
      const result = await service.unassignConversation({
        conversationId: 'conv-1',
        unassignedBy: 'admin-1',
        tenantId: 'tenant-1',
      })

      // Verify audit log
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'conversation.unassigned',
          userId: 'admin-1',
        })
      )

      expect(result.success).toBe(true)
    })

    it('should set assigned_to to null', async () => {
      const updateSpy = vi.fn().mockReturnThis()
      mockSupabase.from.mockReturnValueOnce({
        update: updateSpy,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => ({
          data: { id: 'conv-1', assigned_to: null },
          error: null,
        })),
      })

      await service.unassignConversation({
        conversationId: 'conv-1',
        unassignedBy: 'admin-1',
        tenantId: 'tenant-1',
      })

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_to: null,
          assigned_at: null,
        })
      )
    })
  })
})
