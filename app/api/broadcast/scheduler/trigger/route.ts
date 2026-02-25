/**
 * Broadcast Scheduler - Manual Trigger
 * Triggers the broadcast processing immediately (same as cron but on-demand)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Call the cron endpoint directly
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    
    const response = await fetch(`${baseUrl}/api/cron/process-broadcasts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
      },
    });

    const result = await response.json();

    return NextResponse.json({
      message: 'Broadcast processing triggered manually',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
