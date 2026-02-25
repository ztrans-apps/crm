/**
 * Test Redis - Vercel compatible
 * Tests database connectivity instead (Redis not available on Vercel)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const start = Date.now();
    
    // Test Supabase connectivity
    const { error } = await supabase.from('profiles').select('id').limit(1);
    
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
      note: 'Redis not used — running in serverless mode on Vercel',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
}
