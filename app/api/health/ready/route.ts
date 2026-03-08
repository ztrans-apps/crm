/**
 * Readiness Check Endpoint
 * Returns whether the application is ready to accept traffic
 * 
 * Validates: Requirements 18.2, 18.6, 18.7, 18.8, 18.9, 18.10
 * 
 * Features:
 * - Checks if application is ready to serve requests
 * - Verifies critical dependencies (database, storage)
 * - Returns 200 if ready, 503 if not ready
 * - Used by Kubernetes readiness probes
 * - No authentication required (public endpoint)
 * - Executes quickly (under 1 second)
 * 
 * Readiness vs Liveness:
 * - Readiness: Can the app serve traffic? (checks dependencies)
 * - Liveness: Is the app alive? (checks if process is responsive)
 */

import { NextResponse } from 'next/server'
import { healthCheckService } from '@/lib/monitoring/health-check'

export async function GET() {
  try {
    const healthStatus = await healthCheckService.checkHealth()

    // For readiness, we check if critical systems are available
    // Database and storage are critical for serving requests
    // Redis and WhatsApp API are not critical (can degrade gracefully)
    const isCriticalSystemDown =
      healthStatus.checks.database.status === 'down' ||
      healthStatus.checks.storage.status === 'down'

    const isReady = !isCriticalSystemDown

    // Return 503 if not ready to serve traffic
    const statusCode = isReady ? 200 : 503

    return NextResponse.json(
      {
        ready: isReady,
        status: healthStatus.status,
        timestamp: healthStatus.timestamp,
        checks: healthStatus.checks,
      },
      { status: statusCode }
    )
  } catch (error) {
    // If health check fails, we're not ready
    return NextResponse.json(
      {
        ready: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
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
