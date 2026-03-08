/**
 * Health Check Endpoint
 * Returns comprehensive system health status
 * 
 * Validates: Requirements 18.1, 18.6, 18.7, 18.8, 18.9, 18.10
 * 
 * Features:
 * - Checks all system components (database, Redis, WhatsApp API, storage)
 * - Returns 200 if all systems operational
 * - Returns 503 if critical systems unavailable
 * - Includes component details in response
 * - No authentication required (public endpoint)
 * - Executes quickly (under 1 second)
 */

import { NextResponse } from 'next/server'
import { healthCheckService } from '@/lib/monitoring/health-check'

export async function GET() {
  try {
    const healthStatus = await healthCheckService.checkHealth()

    // Return 503 if system is unhealthy
    const statusCode = healthStatus.status === 'unhealthy' ? 503 : 200

    return NextResponse.json(healthStatus, { status: statusCode })
  } catch (error) {
    // If health check itself fails, return 503
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        checks: {
          database: { status: 'down', responseTime: 0 },
          redis: { status: 'down', responseTime: 0 },
          whatsapp_api: { status: 'down', responseTime: 0 },
          storage: { status: 'down', responseTime: 0 },
        },
      },
      { status: 503 }
    )
  }
}
