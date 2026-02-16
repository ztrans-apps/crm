import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

interface Metrics {
  timestamp: string;
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
  application: {
    messages: {
      total: number;
      sent: number;
      delivered: number;
      failed: number;
      pending: number;
    };
    sessions: {
      total: number;
      active: number;
      inactive: number;
    };
    queue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  };
}

export async function GET() {
  try {
    const supabase = createClient();
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    // Get message statistics
    const { data: messageStats } = await supabase
      .from('messages')
      .select('status')
      .then((result) => {
        const stats = {
          total: result.data?.length || 0,
          sent: result.data?.filter((m) => m.status === 'sent').length || 0,
          delivered: result.data?.filter((m) => m.status === 'delivered').length || 0,
          failed: result.data?.filter((m) => m.status === 'failed').length || 0,
          pending: result.data?.filter((m) => m.status === 'pending').length || 0,
        };
        return { data: stats };
      });

    // Get session statistics
    const { data: sessionStats } = await supabase
      .from('whatsapp_sessions')
      .select('status')
      .then((result) => {
        const stats = {
          total: result.data?.length || 0,
          active: result.data?.filter((s) => s.status === 'active').length || 0,
          inactive: result.data?.filter((s) => s.status !== 'active').length || 0,
        };
        return { data: stats };
      });

    // Get queue statistics from Redis
    const queueKeys = await redis.keys('bull:*:*');
    const queueStats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    // System metrics
    const memUsage = process.memoryUsage();
    const systemMetrics = {
      uptime: process.uptime(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
      },
    };

    const metrics: Metrics = {
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      application: {
        messages: messageStats || {
          total: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
          pending: 0,
        },
        sessions: sessionStats || {
          total: 0,
          active: 0,
          inactive: 0,
        },
        queue: queueStats,
      },
    };

    redis.disconnect();

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to collect metrics', message: error.message },
      { status: 500 }
    );
  }
}
