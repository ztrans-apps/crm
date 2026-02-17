import { NextResponse } from 'next/server';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { broadcastQueue } from '@/lib/queue/workers/broadcast-send.worker';

/**
 * GET /api/admin/queues
 * Queue monitoring dashboard
 */
export async function GET() {
  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/api/admin/queues');

    createBullBoard({
      queues: [new BullMQAdapter(broadcastQueue)],
      serverAdapter: serverAdapter,
    });

    return NextResponse.json({
      message: 'Queue dashboard available',
      url: '/api/admin/queues/ui'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load queue dashboard' },
      { status: 500 }
    );
  }
}
