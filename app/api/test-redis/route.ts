/**
 * Test Database Connectivity
 * Permission: admin.access
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (request, ctx) => {
  const start = Date.now();
  
  const { error } = await ctx.supabase.from('profiles').select('id').limit(1);
  const latency = Date.now() - start;

  if (error) {
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
    }, { status: 500 });
  }

  return NextResponse.json({
    status: 'ok',
    database: 'connected',
    latency_ms: latency,
    note: 'Running in serverless mode on Vercel',
  });
}, { permission: 'admin.access' });
