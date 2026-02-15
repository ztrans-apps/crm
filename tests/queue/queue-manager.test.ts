/**
 * Queue Manager Tests
 * Test queue creation, job processing, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Queue } from 'bullmq'

describe('Queue Manager', () => {
  let mockQueue: any

  beforeEach(() => {
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: '1' }),
      getWaitingCount: vi.fn().mockResolvedValue(0),
      getActiveCount: vi.fn().mockResolvedValue(0),
      getCompletedCount: vi.fn().mockResolvedValue(5),
      getFailedCount: vi.fn().mockResolvedValue(2),
      getDelayedCount: vi.fn().mockResolvedValue(0),
      getFailed: vi.fn().mockResolvedValue([]),
      getCompleted: vi.fn().mockResolvedValue([]),
      close: vi.fn().mockResolvedValue(undefined),
    }
  })

  describe('Job Creation', () => {
    it('should create a job with correct data', async () => {
      const jobData = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        sessionId: 'test-session',
        to: '+6281234567890',
        message: 'Test message',
        type: 'text' as const,
      }

      await mockQueue.add('send-message', jobData)

      expect(mockQueue.add).toHaveBeenCalledWith('send-message', jobData)
      expect(mockQueue.add).toHaveBeenCalledTimes(1)
    })

    it('should handle job creation errors', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Redis connection failed'))

      await expect(
        mockQueue.add('send-message', {})
      ).rejects.toThrow('Redis connection failed')
    })
  })

  describe('Queue Status', () => {
    it('should return correct queue counts', async () => {
      const waiting = await mockQueue.getWaitingCount()
      const active = await mockQueue.getActiveCount()
      const completed = await mockQueue.getCompletedCount()
      const failed = await mockQueue.getFailedCount()

      expect(waiting).toBe(0)
      expect(active).toBe(0)
      expect(completed).toBe(5)
      expect(failed).toBe(2)
    })

    it('should handle status check errors gracefully', async () => {
      mockQueue.getWaitingCount.mockRejectedValueOnce(new Error('Connection lost'))

      await expect(mockQueue.getWaitingCount()).rejects.toThrow('Connection lost')
    })
  })

  describe('Failed Jobs', () => {
    it('should retrieve failed jobs', async () => {
      const failedJobs = [
        {
          id: '1',
          failedReason: 'Session not found',
          attemptsMade: 3,
          data: { sessionId: 'test' },
        },
      ]

      mockQueue.getFailed.mockResolvedValueOnce(failedJobs)

      const result = await mockQueue.getFailed(0, 10)

      expect(result).toEqual(failedJobs)
      expect(result).toHaveLength(1)
    })

    it('should handle empty failed jobs list', async () => {
      mockQueue.getFailed.mockResolvedValueOnce([])

      const result = await mockQueue.getFailed(0, 10)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })
  })

  describe('Queue Cleanup', () => {
    it('should close queue connection', async () => {
      await mockQueue.close()

      expect(mockQueue.close).toHaveBeenCalledTimes(1)
    })
  })
})
