/**
 * Application Metrics API
 * Vercel-compatible: uses Supabase for stats, no Redis dependency
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get message statistics
    const { data: messages } = await supabase
      .from('messages')
      .select('delivery_status');

    const messageStats = {
      total: messages?.length || 0,
      sent: messages?.filter(m => m.delivery_status === 'sent').length || 0,
      delivered: messages?.filter(m => m.delivery_status === 'delivered').length || 0,
      failed: messages?.filter(m => m.delivery_status === 'failed').length || 0,
      pending: messages?.filter(m => m.delivery_status === 'pending').length || 0,
    };

    // Get broadcast stats
    const { data: campaigns } = await supabase
      .from('broadcast_campaigns')
      .select('status');

    const broadcastStats = {
      total: campaigns?.length || 0,
      sending: campaigns?.filter(c => c.status === 'sending').length || 0,
      completed: campaigns?.filter(c => c.status === 'completed').length || 0,
      scheduled: campaigns?.filter(c => c.status === 'scheduled').length || 0,
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      mode: 'serverless',
      messages: messageStats,
      broadcasts: broadcastStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to collect metrics', message: error.message },
      { status: 500 }
    );
  }
}
