import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    whatsappService: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
  };
}

async function checkDatabase(): Promise<HealthCheck['checks']['database']> {
  try {
    const start = Date.now();
    const supabase = createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      return { status: 'down', error: error.message };
    }

    return { status: 'up', latency };
  } catch (error: any) {
    return { status: 'down', error: error.message };
  }
}

async function checkRedis(): Promise<HealthCheck['checks']['redis']> {
  let redis: Redis | null = null;
  try {
    const start = Date.now();
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });

    await redis.ping();
    const latency = Date.now() - start;

    return { status: 'up', latency };
  } catch (error: any) {
    return { status: 'down', error: error.message };
  } finally {
    if (redis) {
      redis.disconnect();
    }
  }
}

async function checkWhatsAppService(): Promise<HealthCheck['checks']['whatsappService']> {
  try {
    const start = Date.now();
    const serviceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    if (!response.ok) {
      return { status: 'down', error: `HTTP ${response.status}` };
    }

    return { status: 'up', latency };
  } catch (error: any) {
    return { status: 'down', error: error.message };
  }
}

export async function GET() {
  const startTime = Date.now();

  // Run all health checks in parallel
  const [database, redis, whatsappService] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkWhatsAppService(),
  ]);

  const checks = { database, redis, whatsappService };

  // Determine overall status
  const allUp = Object.values(checks).every((check) => check.status === 'up');
  const anyDown = Object.values(checks).some((check) => check.status === 'down');

  const status: HealthCheck['status'] = allUp
    ? 'healthy'
    : anyDown
    ? 'unhealthy'
    : 'degraded';

  const health: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };

  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
