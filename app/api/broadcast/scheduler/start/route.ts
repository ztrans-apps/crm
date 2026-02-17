import { NextResponse } from 'next/server';
import { startBroadcastScheduler } from '@/lib/queue/jobs/broadcast-scheduler';

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * POST /api/broadcast/scheduler/start
 * Start the broadcast campaign scheduler
 */
export async function POST() {
  try {
    if (schedulerInterval) {
      return NextResponse.json({ 
        message: 'Scheduler is already running',
        status: 'running'
      });
    }

    schedulerInterval = startBroadcastScheduler();

    return NextResponse.json({ 
      message: 'Broadcast scheduler started successfully',
      status: 'started'
    });
  } catch (error) {
    console.error('Error starting scheduler:', error);
    return NextResponse.json(
      { error: 'Failed to start scheduler' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/broadcast/scheduler/start
 * Check scheduler status
 */
export async function GET() {
  return NextResponse.json({
    status: schedulerInterval ? 'running' : 'stopped',
    message: schedulerInterval 
      ? 'Scheduler is running' 
      : 'Scheduler is not running'
  });
}
