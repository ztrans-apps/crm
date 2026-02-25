import { NextResponse } from 'next/server';

/**
 * GET /api/admin/queues
 * Queue monitoring dashboard
 * 
 * TODO: Install @bull-board dependencies to enable this feature
 * npm install @bull-board/api @bull-board/express
 */
export async function GET() {
  return NextResponse.json({
    error: 'Queue monitoring not available',
    message: 'Bull Board dependencies not installed'
  }, { status: 503 });
}
