/**
 * Broadcast Scheduler - Start
 * On Vercel, scheduling is handled by Vercel Cron (vercel.json)
 * This endpoint is kept for API compatibility
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    message: 'Broadcast scheduling is handled automatically by Vercel Cron',
    cron_path: '/api/cron/process-broadcasts',
    schedule: 'Every minute (*/1 * * * *)',
    note: 'No manual start needed — Vercel Cron runs automatically',
  });
}
