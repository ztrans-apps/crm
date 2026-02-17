import { NextResponse } from 'next/server';
import { broadcastQueue } from '@/lib/queue/workers/broadcast-send.worker';

/**
 * GET /api/health/workers
 * Check worker and queue health
 */
export async function GET() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      broadcastQueue.getWaitingCount(),
      broadcastQueue.getActiveCount(),
      broadcastQueue.getCompletedCount(),
      broadcastQueue.getFailedCount(),
      broadcastQueue.getDelayedCount(),
    ]);

    const total = waiting + active + completed + failed + delayed;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    // Determine health status
    let status = 'healthy';
    const issues = [];

    if (active === 0 && waiting > 0) {
      status = 'warning';
      issues.push('No active workers processing jobs');
    }

    if (failureRate > 10) {
      status = 'unhealthy';
      issues.push(`High failure rate: ${failureRate.toFixed(2)}%`);
    }

    if (failed > 100) {
      status = 'warning';
      issues.push(`High number of failed jobs: ${failed}`);
    }

    return NextResponse.json({
      status,
      issues,
      queue: {
        name: 'broadcast-send',
        waiting,
        active,
        completed,
        failed,
        delayed,
        total,
        failureRate: `${failureRate.toFixed(2)}%`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to check worker health',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
