/**
 * Liveness Check Endpoint
 * Returns whether the application is alive and responsive
 * 
 * Validates: Requirements 18.2, 18.6, 18.7, 18.8, 18.9, 18.10
 * 
 * Features:
 * - Checks if application process is alive and responsive
 * - Does NOT check external dependencies (to avoid restart loops)
 * - Returns 200 if alive, 503 if not responsive
 * - Used by Kubernetes liveness probes
 * - No authentication required (public endpoint)
 * - Executes very quickly (no external calls)
 * 
 * Liveness vs Readiness:
 * - Liveness: Is the app alive? (checks if process is responsive)
 * - Readiness: Can the app serve traffic? (checks dependencies)
 * 
 * Important: Liveness checks should NOT check external dependencies
 * because temporary dependency failures should not trigger pod restarts.
 * Only check if the application process itself is responsive.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Liveness check is simple: if we can respond, we're alive
    // We don't check external dependencies here because:
    // 1. Temporary dependency failures shouldn't trigger restarts
    // 2. Readiness checks handle dependency health
    // 3. Liveness is about process health, not dependency health

    return NextResponse.json(
      {
        alive: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    // If we can't even respond with JSON, something is seriously wrong
    return NextResponse.json(
      {
        alive: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Liveness check failed',
      },
      { status: 503 }
    )
  }
}
