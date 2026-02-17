import { NextResponse } from 'next/server';
import { processScheduledCampaigns } from '@/lib/queue/jobs/broadcast-scheduler';

/**
 * POST /api/broadcast/scheduler/trigger
 * Manually trigger scheduler to check for scheduled campaigns
 */
export async function POST() {
  try {
    console.log('🔄 Manual scheduler trigger requested');
    await processScheduledCampaigns();
    
    return NextResponse.json({ 
      message: 'Scheduler triggered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering scheduler:', error);
    return NextResponse.json(
      { error: 'Failed to trigger scheduler' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/broadcast/scheduler/trigger
 * Get info about manual trigger
 */
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to manually trigger the scheduler',
    info: 'This will immediately check for scheduled campaigns that are ready to send'
  });
}
