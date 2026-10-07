import { NextResponse } from 'next/server';

/**
 * GET /api/admin/queues
 * Queue monitoring dashboard
 *
 * Bull Board deps are optional and not installed on Vercel Hobby builds.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Queue monitoring not available',
      message: 'Bull Board dependencies not installed',
    },
    { status: 503 }
  );
}
