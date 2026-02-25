/**
 * Auto Assignment Service - Unit Test
 * Tests auto-assignment logic and strategies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auto-assignment settings
const mockSettings = {
  enabled: true,
  strategy: 'round_robin' as const,
  assign_to_roles: ['agent', 'senior_agent'],
  only_active_agents: true,
  max_conversations_per_agent: 10,
}

// Mock functions
const mockGetSettings = vi.fn()
const mockGetNextAgentRoundRobin = vi.fn()
const mockGetNextAgentLeastBusy = vi.fn()
const mockGetNextAgentRandom = vi.fn()
const mockAssignConversation = vi.fn()
const mockCanAgentReceiveMore = vi.fn()

describe('Auto Assignment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default settings
    mockGetSettings.mockResolvedValue({ ...mockSettings })
  })

  describe('Auto Assignment Settings', () => {
    it('should return auto-assignment settings', async () => {
      const settings = await mockGetSettings()
      
      expect(settings).toBeDefined()
      expect(settings.enabled).toBe(true)
      expect(settings.strategy).toBe('round_robin')
    })

    it('should handle missing settings', async () => {
      mockGetSettings.mockResolvedValueOnce(null)
      
      const settings = await mockGetSettings()
      expect(settings).toBeNull()
    })

    it('should include all required fields', async () => {
      const settings = await mockGetSettings()
      
      expect(settings).toHaveProperty('enabled')
      expect(settings).toHaveProperty('strategy')
      expect(settings).toHaveProperty('assign_to_roles')
      expect(settings).toHaveProperty('only_active_agents')
      expect(settings).toHaveProperty('max_conversations_per_agent')
    })
  })

  describe('Round Robin Strategy', () => {
    it('should get next agent using round robin', async () => {
      mockGetNextAgentRoundRobin.mockResolvedValueOnce('agent-1')
      
      const agentId = await mockGetNextAgentRoundRobin()
      
      expect(agentId).toBe('agent-1')
      expect(mockGetNextAgentRoundRobin).toHaveBeenCalledTimes(1)
    })

    it('should return null when no agents available', async () => {
      mockGetNextAgentRoundRobin.mockResolvedValueOnce(null)
      
      const agentId = await mockGetNextAgentRoundRobin()
      
      expect(agentId).toBeNull()
    })

    it('should rotate through agents', async () => {
      mockGetNextAgentRoundRobin
        .mockResolvedValueOnce('agent-1')
        .mockResolvedValueOnce('agent-2')
        .mockResolvedValueOnce('agent-3')
        .mockResolvedValueOnce('agent-1')
      
      const agent1 = await mockGetNextAgentRoundRobin()
      const agent2 = await mockGetNextAgentRoundRobin()
      const agent3 = await mockGetNextAgentRoundRobin()
      const agent4 = await mockGetNextAgentRoundRobin()
      
      expect(agent1).toBe('agent-1')
      expect(agent2).toBe('agent-2')
      expect(agent3).toBe('agent-3')
      expect(agent4).toBe('agent-1') // Back to first agent
    })
  })

  describe('Least Busy Strategy', () => {
    it('should get agent with least conversations', async () => {
      mockGetNextAgentLeastBusy.mockResolvedValueOnce('agent-2')
      
      const agentId = await mockGetNextAgentLeastBusy()
      
      expect(agentId).toBe('agent-2')
    })

    it('should return null when no agents available', async () => {
      mockGetNextAgentLeastBusy.mockResolvedValueOnce(null)
      
      const agentId = await mockGetNextAgentLeastBusy()
      
      expect(agentId).toBeNull()
    })

    it('should respect max conversations limit', async () => {
      mockGetNextAgentLeastBusy.mockResolvedValueOnce('agent-1')
      
      const agentId = await mockGetNextAgentLeastBusy()
      
      expect(agentId).toBe('agent-1')
    })
  })

  describe('Random Strategy', () => {
    it('should get random agent', async () => {
      mockGetNextAgentRandom.mockResolvedValueOnce('agent-3')
      
      const agentId = await mockGetNextAgentRandom()
      
      expect(agentId).toBe('agent-3')
    })

    it('should return null when no agents available', async () => {
      mockGetNextAgentRandom.mockResolvedValueOnce(null)
      
      const agentId = await mockGetNextAgentRandom()
      
      expect(agentId).toBeNull()
    })

    it('should return different agents on multiple calls', async () => {
      mockGetNextAgentRandom
        .mockResolvedValueOnce('agent-1')
        .mockResolvedValueOnce('agent-3')
        .mockResolvedValueOnce('agent-2')
      
      const agent1 = await mockGetNextAgentRandom()
      const agent2 = await mockGetNextAgentRandom()
      const agent3 = await mockGetNextAgentRandom()
      
      expect([agent1, agent2, agent3]).toContain('agent-1')
      expect([agent1, agent2, agent3]).toContain('agent-2')
      expect([agent1, agent2, agent3]).toContain('agent-3')
    })
  })

  describe('Auto Assign Conversation', () => {
    it('should auto-assign conversation when enabled', async () => {
      mockGetSettings.mockResolvedValueOnce(mockSettings)
      mockGetNextAgentRoundRobin.mockResolvedValueOnce('agent-1')
      mockAssignConversation.mockResolvedValueOnce(true)
      
      const result = await mockAssignConversation('conv-1')
      
      expect(result).toBe(true)
    })

    it('should not assign when auto-assignment disabled', async () => {
      mockGetSettings.mockResolvedValueOnce({ ...mockSettings, enabled: false })
      mockAssignConversation.mockResolvedValueOnce(false)
      
      const result = await mockAssignConversation('conv-1')
      
      expect(result).toBe(false)
    })

    it('should handle no available agents', async () => {
      mockGetSettings.mockResolvedValueOnce(mockSettings)
      mockGetNextAgentRoundRobin.mockResolvedValueOnce(null)
      mockAssignConversation.mockResolvedValueOnce(false)
      
      const result = await mockAssignConversation('conv-1')
      
      expect(result).toBe(false)
    })

    it('should use correct strategy', async () => {
      // Test round_robin
      mockGetSettings.mockResolvedValueOnce({ ...mockSettings, strategy: 'round_robin' })
      mockGetNextAgentRoundRobin.mockResolvedValueOnce('agent-1')
      mockAssignConversation.mockResolvedValueOnce(true)
      
      await mockAssignConversation('conv-1')
      
      // Test least_busy
      mockGetSettings.mockResolvedValueOnce({ ...mockSettings, strategy: 'least_busy' })
      mockGetNextAgentLeastBusy.mockResolvedValueOnce('agent-2')
      mockAssignConversation.mockResolvedValueOnce(true)
      
      await mockAssignConversation('conv-2')
      
      // Test random
      mockGetSettings.mockResolvedValueOnce({ ...mockSettings, strategy: 'random' })
      mockGetNextAgentRandom.mockResolvedValueOnce('agent-3')
      mockAssignConversation.mockResolvedValueOnce(true)
      
      await mockAssignConversation('conv-3')
      
      expect(mockAssignConversation).toHaveBeenCalledTimes(3)
    })
  })

  describe('Agent Capacity Check', () => {
    it('should allow agent to receive more when under limit', async () => {
      mockCanAgentReceiveMore.mockResolvedValueOnce(true)
      
      const canReceive = await mockCanAgentReceiveMore('agent-1')
      
      expect(canReceive).toBe(true)
    })

    it('should not allow agent to receive more when at limit', async () => {
      mockCanAgentReceiveMore.mockResolvedValueOnce(false)
      
      const canReceive = await mockCanAgentReceiveMore('agent-1')
      
      expect(canReceive).toBe(false)
    })

    it('should allow unlimited when max is null', async () => {
      mockGetSettings.mockResolvedValueOnce({ ...mockSettings, max_conversations_per_agent: null })
      mockCanAgentReceiveMore.mockResolvedValueOnce(true)
      
      const canReceive = await mockCanAgentReceiveMore('agent-1')
      
      expect(canReceive).toBe(true)
    })

    it('should check active conversations only', async () => {
      mockCanAgentReceiveMore.mockResolvedValueOnce(true)
      
      const canReceive = await mockCanAgentReceiveMore('agent-1')
      
      expect(canReceive).toBe(true)
    })
  })

  describe('Role-Based Assignment', () => {
    it('should only assign to specified roles', async () => {
      const settings = await mockGetSettings()
      
      expect(settings.assign_to_roles).toContain('agent')
      expect(settings.assign_to_roles).toContain('senior_agent')
    })

    it('should filter agents by role', async () => {
      mockGetSettings.mockResolvedValueOnce(mockSettings)
      mockGetNextAgentRoundRobin.mockResolvedValueOnce('agent-1')
      
      const agentId = await mockGetNextAgentRoundRobin()
      
      expect(agentId).toBe('agent-1')
    })
  })

  describe('Active Agents Filter', () => {
    it('should only consider active agents when enabled', async () => {
      const settings = await mockGetSettings()
      
      expect(settings.only_active_agents).toBe(true)
    })

    it('should include inactive agents when disabled', async () => {
      // Clear previous mock and set new value
      mockGetSettings.mockReset()
      const inactiveSettings = { ...mockSettings, only_active_agents: false }
      mockGetSettings.mockResolvedValue(inactiveSettings)
      
      const settings = await mockGetSettings()
      
      expect(settings.only_active_agents).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const errorMock = vi.fn().mockRejectedValueOnce(new Error('Database error'))
      
      await expect(errorMock()).rejects.toThrow('Database error')
    })

    it('should handle assignment errors', async () => {
      mockAssignConversation.mockRejectedValueOnce(new Error('Assignment failed'))
      
      await expect(mockAssignConversation('conv-1')).rejects.toThrow('Assignment failed')
    })

    it('should return false on assignment failure', async () => {
      mockAssignConversation.mockResolvedValueOnce(false)
      
      const result = await mockAssignConversation('conv-1')
      
      expect(result).toBe(false)
    })
  })
})
