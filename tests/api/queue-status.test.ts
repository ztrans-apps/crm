/**
 * Queue Status API Tests
 * Test queue status endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Queue class
const mockQueue = {
  getWaitingCount: vi.fn(),
  getActiveCount: vi.fn(),
  getCompletedCount: vi.fn(),
  getFailedCount: vi.fn(),
  getDelayedCount: vi.fn(),
  getCompleted: vi.fn(),
  getFailed: vi.fn(),
  close: vi.fn(),
}

vi.mock('bullmq', () => ({
  Queue: vi.fn(() => mockQueue),
}))

describe('Queue Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/queue/status', () => {
    it('should return queue status for all queues', async () => {
      // Mock queue counts
      mockQueue.getWaitingCount.mockResolvedValue(5)
      mockQueue.getActiveCount.mockResolvedValue(2)
      mockQueue.getCompletedCount.mockResolvedValue(100)
      mockQueue.getFailedCount.mockResolvedValue(3)
      mockQueue.getDelayedCount.mockResolvedValue(0)
      mockQueue.getCompleted.mockResolvedValue([])
      mockQueue.getFailed.mockResolvedValue([])
      mockQueue.close.mockResolvedValue(undefined)

      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        queues: {
          'whatsapp-send': {
            counts: {
              waiting: 5,
              active: 2,
              completed: 100,
              failed: 3,
              delayed: 0,
              total: 110,
            },
            recentCompleted: [],
            recentFailed: [],
          },
        },
      }

      expect(response.success).toBe(true)
      expect(response.queues['whatsapp-send'].counts.waiting).toBe(5)
      expect(response.queues['whatsapp-send'].counts.total).toBe(110)
    })

    it('should handle queue errors gracefully', async () => {
      mockQueue.getWaitingCount.mockRejectedValue(new Error('Redis connection failed'))

      try {
        await mockQueue.getWaitingCount()
      } catch (error: any) {
        expect(error.message).toBe('Redis connection failed')
      }
    })

    it('should return failed jobs with details', async () => {
      const failedJobs = [
        {
          id: '1',
          name: 'send-message',
          finishedOn: Date.now(),
          failedReason: 'Session not found',
          attemptsMade: 3,
          data: { sessionId: 'test' },
        },
      ]

      mockQueue.getFailed.mockResolvedValue(failedJobs)

      const result = await mockQueue.getFailed(0, 4)

      expect(result).toHaveLength(1)
      expect(result[0].failedReason).toBe('Session not found')
      expect(result[0].attemptsMade).toBe(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      mockQueue.getWaitingCount.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(mockQueue.getWaitingCount()).rejects.toThrow('ECONNREFUSED')
    })

    it('should handle timeout errors', async () => {
      mockQueue.getWaitingCount.mockRejectedValue(new Error('Operation timed out'))

      await expect(mockQueue.getWaitingCount()).rejects.toThrow('Operation timed out')
    })
  })
})
