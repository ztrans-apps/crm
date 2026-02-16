import { NextResponse } from 'next/server';
import { queueMetrics } from '@/lib/queue/services/queue-metrics';

export async function GET() {
  try {
    const summary = queueMetrics.getSummary();
    const allMetrics = queueMetrics.getAllMetrics();

    return NextResponse.json({
      success: true,
      summary,
      queues: allMetrics,
    });
  } catch (error: any) {
    console.error('Error fetching queue metrics:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
