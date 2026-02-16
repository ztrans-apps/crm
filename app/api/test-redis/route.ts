import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export async function GET() {
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

    // Test connection
    const pong = await redis.ping();
    
    // Test set/get
    await redis.set('test-key', 'test-value', 'EX', 10);
    const value = await redis.get('test-key');
    
    // Get Redis info
    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    
    await redis.quit();

    return NextResponse.json({
      success: true,
      message: 'Redis connection successful',
      ping: pong,
      testValue: value,
      version: version,
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
      }
    });
  } catch (error: any) {
    console.error('Redis connection error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
      }
    }, { status: 500 });
  }
}
