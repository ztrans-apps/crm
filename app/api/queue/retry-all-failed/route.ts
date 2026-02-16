/**
 * Retry All Failed Jobs API
 * POST /api/queue/retry-all-failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRetryManager } from '@/lib/queue/failed-job-retry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queueName } = body;

    if (!queueName) {
      return NextResponse.json(
        { error: 'queueName is required' },
        { status: 400 }
      );
    }

    const retryManager = getRetryManager();
    const result = await retryManager.retryAllFailed(queueName);

    return NextResponse.json({
      success: true,
      queueName,
      ...result,
    });
  } catch (error: any) {
    console.error('Error retrying failed jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retry jobs' },
      { status: 500 }
    );
  }
}
