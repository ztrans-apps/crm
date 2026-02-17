import { NextResponse } from 'next/server';
import { broadcastQueue } from '@/lib/queue/workers/broadcast-send.worker';

/**
 * GET /api/broadcast/debug/queue
 * Debug queue status (no auth required for debugging)
 */
export async function GET() {
  try {
    // Get queue stats
    const waiting = await broadcastQueue.getWaitingCount();
    const active = await broadcastQueue.getActiveCount();
    const completed = await broadcastQueue.getCompletedCount();
    const failed = await broadcastQueue.getFailedCount();
    const delayed = await broadcastQueue.getDelayedCount();
    
    // Get recent jobs
    const waitingJobs = await broadcastQueue.getWaiting(0, 5);
    const activeJobs = await broadcastQueue.getActive(0, 5);
    const failedJobs = await broadcastQueue.getFailed(0, 5);
    const completedJobs = await broadcastQueue.getCompleted(0, 5);
    
    return NextResponse.json({
      stats: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      },
      jobs: {
        waiting: waitingJobs.map(j => ({
          id: j.id,
          name: j.name,
          data: j.data,
          timestamp: j.timestamp
        })),
        active: activeJobs.map(j => ({
          id: j.id,
          name: j.name,
          data: j.data,
          timestamp: j.timestamp
        })),
        failed: failedJobs.map(j => ({
          id: j.id,
          name: j.name,
          data: j.data,
          failedReason: j.failedReason,
          timestamp: j.timestamp
        })),
        completed: completedJobs.map(j => ({
          id: j.id,
          name: j.name,
          returnvalue: j.returnvalue,
          timestamp: j.timestamp
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/broadcast/debug/queue:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
