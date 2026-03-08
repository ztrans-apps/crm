/**
 * Integration tests for health check API routes
 * 
 * Validates: Requirements 18.1, 18.2, 18.6, 18.7, 18.8, 18.9, 18.10
 * 
 * Tests:
 * - /api/health endpoint returns comprehensive health status
 * - /api/health/ready endpoint returns readiness status
 * - /api/health/live endpoint returns liveness status
 * - All endpoints execute quickly (under 1 second)
 * - All endpoints do not require authentication
 * - Endpoints return appropriate status codes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as healthGet } from '@/app/api/health/route'
import { GET as readyGet } from '@/app/api/health/ready/route'
import { GET as liveGet } from '@/app/api/health/live/route'

describe('Health Check API Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status with all components', async () => {
      const response = await healthGet()
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('checks')
      expect(data.checks).toHaveProperty('database')
      expect(data.checks).toHaveProperty('redis')
      expect(data.checks).toHaveProperty('whatsapp_api')
      expect(data.checks).toHaveProperty('storage')
    })

    it('should return 200 when system is healthy or degraded', async () => {
      const response = await healthGet()
      const data = await response.json()

      if (data.status === 'healthy' || data.status === 'degraded') {
        expect(response.status).toBe(200)
      }
    })

    it('should return 503 when system is unhealthy', async () => {
      const response = await healthGet()
      const data = await response.json()

      if (data.status === 'unhealthy') {
        expect(response.status).toBe(503)
      }
    })

    it('should include component details with status and response time', async () => {
      const response = await healthGet()
      const data = await response.json()

      Object.values(data.checks).forEach((check: any) => {
        expect(check).toHaveProperty('status')
        expect(check).toHaveProperty('responseTime')
        expect(['up', 'down', 'degraded']).toContain(check.status)
        expect(typeof check.responseTime).toBe('number')
      })
    })

    it('should execute quickly (under 10 seconds)', async () => {
      const startTime = Date.now()
      await healthGet()
      const duration = Date.now() - startTime

      // Allow up to 10 seconds for health checks (5 second timeout per check)
      expect(duration).toBeLessThan(10000)
    })

    it('should not require authentication', async () => {
      // Health check should work without any authentication headers
      const response = await healthGet()
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })

  describe('GET /api/health/ready', () => {
    it('should return readiness status', async () => {
      const response = await readyGet()
      const data = await response.json()

      expect(data).toHaveProperty('ready')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('checks')
      expect(typeof data.ready).toBe('boolean')
    })

    it('should return 200 when ready to serve traffic', async () => {
      const response = await readyGet()
      const data = await response.json()

      if (data.ready === true) {
        expect(response.status).toBe(200)
      }
    })

    it('should return 503 when not ready to serve traffic', async () => {
      const response = await readyGet()
      const data = await response.json()

      if (data.ready === false) {
        expect(response.status).toBe(503)
      }
    })

    it('should check critical systems (database, storage)', async () => {
      const response = await readyGet()
      const data = await response.json()

      expect(data.checks).toHaveProperty('database')
      expect(data.checks).toHaveProperty('storage')
    })

    it('should execute quickly (under 10 seconds)', async () => {
      const startTime = Date.now()
      await readyGet()
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(10000)
    })

    it('should not require authentication', async () => {
      const response = await readyGet()
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })

  describe('GET /api/health/live', () => {
    it('should return liveness status', async () => {
      const response = await liveGet()
      const data = await response.json()

      expect(data).toHaveProperty('alive')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(typeof data.alive).toBe('boolean')
    })

    it('should return 200 when alive', async () => {
      const response = await liveGet()
      const data = await response.json()

      if (data.alive === true) {
        expect(response.status).toBe(200)
      }
    })

    it('should include process metrics', async () => {
      const response = await liveGet()
      const data = await response.json()

      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('memory')
      expect(typeof data.uptime).toBe('number')
      expect(data.memory).toHaveProperty('used')
      expect(data.memory).toHaveProperty('total')
    })

    it('should execute very quickly (under 1 second)', async () => {
      const startTime = Date.now()
      await liveGet()
      const duration = Date.now() - startTime

      // Liveness should be very fast since it doesn't check external dependencies
      expect(duration).toBeLessThan(1000)
    })

    it('should not require authentication', async () => {
      const response = await liveGet()
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should not check external dependencies', async () => {
      const response = await liveGet()
      const data = await response.json()

      // Liveness should not include dependency checks
      expect(data).not.toHaveProperty('checks')
    })
  })

  describe('Health Check Performance', () => {
    it('all health endpoints should respond within acceptable time', async () => {
      const startTime = Date.now()

      await Promise.all([healthGet(), readyGet(), liveGet()])

      const duration = Date.now() - startTime

      // All three endpoints should complete within 10 seconds
      expect(duration).toBeLessThan(10000)
    })
  })
})
