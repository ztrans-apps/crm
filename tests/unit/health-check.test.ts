/**
 * Unit tests for HealthCheckService
 * 
 * Validates: Requirements 18.3, 18.4, 18.5, 18.6, 18.7
 * 
 * Tests:
 * - Health check for each component (database, Redis, external API, storage)
 * - Overall health status calculation
 * - Response time tracking
 * - Error handling and graceful degradation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { HealthCheckService } from '@/lib/monitoring/health-check'
import type { ComponentHealth, HealthStatus } from '@/lib/monitoring/health-check'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  storage: {
    listBuckets: vi.fn(),
  },
}

// Mock Redis client
const mockRedisClient = {
  ping: vi.fn(),
}

// Mock createClient from @/lib/supabase/server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock getRedisClient from @/lib/cache/redis
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(() => mockRedisClient),
}))

// Mock fetch for WhatsApp API calls
global.fetch = vi.fn()

describe('HealthCheckService', () => {
  let service: HealthCheckService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new HealthCheckService()
    
    // Set up default environment variables
    process.env.WHATSAPP_API_TOKEN = 'test-token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id'
    process.env.WHATSAPP_API_VERSION = 'v21.0'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkDatabase', () => {
    it('should return up status when database is healthy', async () => {
      // Mock successful database query with small delay
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), 1)
              )
            ),
          }),
        }),
      })

      const result = await service.checkDatabase()

      expect(result.status).toBe('up')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBeUndefined()
    })

    it('should return degraded status when database is slow', async () => {
      // Mock slow database query (> 500ms)
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), 600)
              )
            ),
          }),
        }),
      })

      const result = await service.checkDatabase()

      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBeGreaterThanOrEqual(600)
      expect(result.message).toBe('Slow response time')
    })

    it('should return down status when database query fails', async () => {
      // Mock database query error with small delay
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ 
                  data: null, 
                  error: { message: 'Connection failed' } 
                }), 1)
              )
            ),
          }),
        }),
      })

      const result = await service.checkDatabase()

      expect(result.status).toBe('down')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBe('Database connection failed')
    })

    it('should return down status when database throws exception', async () => {
      // Mock database exception with small delay
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Network error')), 1)
              )
            ),
          }),
        }),
      })

      const result = await service.checkDatabase()

      expect(result.status).toBe('down')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBe('Network error')
    })

    it('should track response time accurately', async () => {
      const delay = 100
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), delay)
              )
            ),
          }),
        }),
      })

      const result = await service.checkDatabase()

      expect(result.responseTime).toBeGreaterThanOrEqual(delay)
      expect(result.responseTime).toBeLessThan(delay + 50) // Allow 50ms margin
    })
  })

  describe('checkRedis', () => {
    it('should return up status when Redis is healthy', async () => {
      mockRedisClient.ping.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve('PONG'), 1)
        )
      )

      const result = await service.checkRedis()

      expect(result.status).toBe('up')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBeUndefined()
    })

    it('should return degraded status when Redis is slow', async () => {
      // Mock slow Redis ping (> 200ms)
      mockRedisClient.ping.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve('PONG'), 250)
        )
      )

      const result = await service.checkRedis()

      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBeGreaterThanOrEqual(250)
      expect(result.message).toBe('Slow response time')
    })

    it('should return degraded status when Redis is not configured', async () => {
      // Mock getRedisClient to return null
      const { getRedisClient } = await import('@/lib/cache/redis')
      vi.mocked(getRedisClient).mockReturnValue(null)

      const result = await service.checkRedis()

      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBe(0)
      expect(result.message).toBe('Redis not configured')
    })

    it('should return down status when Redis ping fails', async () => {
      mockRedisClient.ping.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve('ERROR'), 1)
        )
      )

      const result = await service.checkRedis()

      expect(result.status).toBe('down')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBe('Redis ping failed')
    })

    it('should return degraded status when Redis throws exception', async () => {
      mockRedisClient.ping.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection refused')), 1)
        )
      )

      const result = await service.checkRedis()

      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBe('Connection refused')
    })

    it('should handle Redis timeout gracefully', async () => {
      // Mock Redis ping that never resolves (will timeout)
      mockRedisClient.ping.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      )

      const result = await service.checkRedis()

      expect(result.status).toBe('degraded')
      expect(result.message).toContain('timeout')
    }, 10000) // Increase timeout for this test
  })

  describe('checkExternalAPI', () => {
    it('should return up status when WhatsApp API is healthy', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
          } as Response), 1)
        )
      )

      const result = await service.checkExternalAPI()

      expect(result.status).toBe('up')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBeUndefined()
      expect(fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v21.0/test-phone-id',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        })
      )
    })

    it('should return degraded status when WhatsApp API is slow', async () => {
      // Mock slow API response (> 1000ms)
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
          } as Response), 1100)
        )
      )

      const result = await service.checkExternalAPI()

      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBeGreaterThanOrEqual(1100)
      expect(result.message).toBe('Slow response time')
    })

    it('should return degraded status when WhatsApp API is not configured', async () => {
      delete process.env.WHATSAPP_API_TOKEN

      const result = await service.checkExternalAPI()

      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBe(0)
      expect(result.message).toBe('WhatsApp API not configured')
    })

    it('should return down status when WhatsApp API returns error', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response), 1)
        )
      )

      const result = await service.checkExternalAPI()

      expect(result.status).toBe('down')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBe('WhatsApp API returned 500')
    })

    it('should return down status when WhatsApp API throws exception', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network error')), 1)
        )
      )

      const result = await service.checkExternalAPI()

      expect(result.status).toBe('down')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBe('Network error')
    })

    it('should handle WhatsApp API timeout gracefully', async () => {
      // Mock fetch that never resolves (will timeout)
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      )

      const result = await service.checkExternalAPI()

      expect(result.status).toBe('down')
      expect(result.message).toContain('timeout')
    }, 10000) // Increase timeout for this test
  })

  describe('checkStorage', () => {
    it('should return up status when storage is healthy', async () => {
      mockSupabaseClient.storage.listBuckets.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({ data: [], error: null }), 1)
        )
      )

      const result = await service.checkStorage()

      expect(result.status).toBe('up')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBeUndefined()
    })

    it('should return degraded status when storage is slow', async () => {
      // Mock slow storage query (> 500ms)
      mockSupabaseClient.storage.listBuckets.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({ data: [], error: null }), 600)
        )
      )

      const result = await service.checkStorage()

      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBeGreaterThanOrEqual(600)
      expect(result.message).toBe('Slow response time')
    })

    it('should return down status when storage query fails', async () => {
      mockSupabaseClient.storage.listBuckets.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({ 
            data: null, 
            error: { message: 'Storage unavailable' } 
          }), 1)
        )
      )

      const result = await service.checkStorage()

      expect(result.status).toBe('down')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBe('Storage connection failed')
    })

    it('should return down status when storage throws exception', async () => {
      mockSupabaseClient.storage.listBuckets.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 1)
        )
      )

      const result = await service.checkStorage()

      expect(result.status).toBe('down')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.message).toBe('Connection timeout')
    })
  })

  describe('checkHealth', () => {
    beforeEach(() => {
      // Set up default successful responses for all checks with small delays
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), 1)
              )
            ),
          }),
        }),
      })
      mockSupabaseClient.storage.listBuckets.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({ data: [], error: null }), 1)
        )
      )
      mockRedisClient.ping.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve('PONG'), 1)
        )
      )
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
          } as Response), 1)
        )
      )
    })

    it('should return healthy status when all components are up', async () => {
      const result = await service.checkHealth()

      expect(result.status).toBe('healthy')
      expect(result.timestamp).toBeDefined()
      expect(result.checks.database.status).toBe('up')
      expect(result.checks.redis.status).toBe('up')
      expect(result.checks.whatsapp_api.status).toBe('up')
      expect(result.checks.storage.status).toBe('up')
    })

    it('should return unhealthy status when database is down', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Connection failed' } 
            }),
          }),
        }),
      })

      const result = await service.checkHealth()

      expect(result.status).toBe('unhealthy')
      expect(result.checks.database.status).toBe('down')
    })

    it('should return unhealthy status when storage is down', async () => {
      mockSupabaseClient.storage.listBuckets.mockResolvedValue({ 
        data: null, 
        error: { message: 'Storage unavailable' } 
      })

      const result = await service.checkHealth()

      expect(result.status).toBe('unhealthy')
      expect(result.checks.storage.status).toBe('down')
    })

    it('should return degraded status when Redis is down', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'))

      const result = await service.checkHealth()

      expect(result.status).toBe('degraded')
      expect(result.checks.redis.status).toBe('degraded')
    })

    it('should return degraded status when WhatsApp API is down', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const result = await service.checkHealth()

      expect(result.status).toBe('degraded')
      expect(result.checks.whatsapp_api.status).toBe('down')
    })

    it('should return degraded status when any component is degraded', async () => {
      // Mock slow database
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), 600)
              )
            ),
          }),
        }),
      })

      const result = await service.checkHealth()

      expect(result.status).toBe('degraded')
      expect(result.checks.database.status).toBe('degraded')
    })

    it('should run all checks in parallel', async () => {
      const startTime = Date.now()
      
      // Each check takes 100ms
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), 100)
              )
            ),
          }),
        }),
      })
      mockSupabaseClient.storage.listBuckets.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({ data: [], error: null }), 100)
        )
      )
      mockRedisClient.ping.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve('PONG'), 100)
        )
      )
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
          } as Response), 100)
        )
      )

      await service.checkHealth()
      
      const duration = Date.now() - startTime
      
      // If parallel, should take ~100ms. If sequential, would take ~400ms
      expect(duration).toBeLessThan(200) // Allow some margin
    })

    it('should include timestamp in ISO format', async () => {
      const result = await service.checkHealth()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should include response times for all components', async () => {
      const result = await service.checkHealth()

      expect(result.checks.database.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.checks.redis.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.checks.whatsapp_api.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.checks.storage.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle complete health check failure gracefully', async () => {
      // Mock all individual checks to fail
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Critical error')
      })
      mockSupabaseClient.storage.listBuckets.mockImplementation(() => {
        throw new Error('Critical error')
      })
      mockRedisClient.ping.mockImplementation(() => {
        throw new Error('Critical error')
      })
      vi.mocked(fetch).mockImplementation(() => {
        throw new Error('Critical error')
      })

      const result = await service.checkHealth()

      expect(result.status).toBe('unhealthy')
      expect(result.checks.database.status).toBe('down')
      expect(result.checks.redis.status).toBe('degraded') // Redis is non-critical
      expect(result.checks.whatsapp_api.status).toBe('down')
      expect(result.checks.storage.status).toBe('down')
    })
  })

  describe('Overall Status Calculation', () => {
    it('should prioritize critical components (database, storage)', async () => {
      // Database down, but Redis and WhatsApp API up
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Connection failed' } 
            }),
          }),
        }),
      })
      mockSupabaseClient.storage.listBuckets.mockResolvedValue({ 
        data: [], 
        error: null 
      })
      mockRedisClient.ping.mockResolvedValue('PONG')
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response)

      const result = await service.checkHealth()

      expect(result.status).toBe('unhealthy')
    })

    it('should treat Redis as non-critical', async () => {
      // Redis down, but database and storage up
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })
      mockSupabaseClient.storage.listBuckets.mockResolvedValue({ 
        data: [], 
        error: null 
      })
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'))
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response)

      const result = await service.checkHealth()

      expect(result.status).toBe('degraded')
    })

    it('should treat WhatsApp API as non-critical', async () => {
      // WhatsApp API down, but database and storage up
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })
      mockSupabaseClient.storage.listBuckets.mockResolvedValue({ 
        data: [], 
        error: null 
      })
      mockRedisClient.ping.mockResolvedValue('PONG')
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const result = await service.checkHealth()

      expect(result.status).toBe('degraded')
    })
  })

  describe('Response Time Tracking', () => {
    it('should track response time for successful checks', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), 1)
              )
            ),
          }),
        }),
      })

      const result = await service.checkDatabase()

      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(typeof result.responseTime).toBe('number')
    })

    it('should track response time for failed checks', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection failed')), 1)
              )
            ),
          }),
        }),
      })

      const result = await service.checkDatabase()

      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(typeof result.responseTime).toBe('number')
    })

    it('should track response time for degraded checks', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => 
              new Promise((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), 600)
              )
            ),
          }),
        }),
      })

      const result = await service.checkDatabase()

      expect(result.status).toBe('degraded')
      expect(result.responseTime).toBeGreaterThanOrEqual(600)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Connection pool exhausted')
      })

      const result = await service.checkDatabase()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Connection pool exhausted')
    })

    it('should handle Redis connection errors gracefully', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await service.checkRedis()

      expect(result.status).toBe('degraded')
      expect(result.message).toBe('ECONNREFUSED')
    })

    it('should handle WhatsApp API network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('ETIMEDOUT'))

      const result = await service.checkExternalAPI()

      expect(result.status).toBe('down')
      expect(result.message).toBe('ETIMEDOUT')
    })

    it('should handle storage errors gracefully', async () => {
      mockSupabaseClient.storage.listBuckets.mockRejectedValue(
        new Error('Service unavailable')
      )

      const result = await service.checkStorage()

      expect(result.status).toBe('down')
      expect(result.message).toBe('Service unavailable')
    })
  })
})
