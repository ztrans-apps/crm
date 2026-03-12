/**
 * Test Setup
 * Global test configuration and mocks
 */

import { beforeAll, afterAll, vi } from 'vitest'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env.test
config({ path: path.resolve(__dirname, '../.env.test') })

// Mock environment variables (fallback if not in .env.test)
process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.META_WHATSAPP_TOKEN = process.env.META_WHATSAPP_TOKEN || 'test-token'
process.env.META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '123456789'
process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || '987654321'
process.env.META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'test-verify-token'
process.env.DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
process.env.ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || 'test-master-key-32-characters-long-for-testing-purposes'
process.env.ENCRYPTION_KEY_ROTATION_DAYS = process.env.ENCRYPTION_KEY_ROTATION_DAYS || '90'
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:6379'
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'test-redis-token'

// Mock Supabase with comprehensive query builder
const createMockQueryBuilder = () => {
  const mockBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({
      data: null,
      error: null,
    })),
    maybeSingle: vi.fn(() => Promise.resolve({
      data: null,
      error: null,
    })),
    then: vi.fn((resolve) => resolve({
      data: [],
      error: null,
    })),
  }
  return mockBuilder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      })),
      getSession: vi.fn(() => Promise.resolve({
        data: {
          session: {
            access_token: 'test-token',
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
        error: null,
      })),
    },
    from: vi.fn(() => createMockQueryBuilder()),
  })),
}))

// Mock Redis client with comprehensive methods
vi.mock('@/lib/cache/redis', () => ({
  getRedisClient: vi.fn(() => ({
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve('OK')),
    setex: vi.fn(() => Promise.resolve('OK')),
    del: vi.fn(() => Promise.resolve(1)),
    expire: vi.fn(() => Promise.resolve(1)),
    ttl: vi.fn(() => Promise.resolve(-1)),
    zadd: vi.fn(() => Promise.resolve(1)),
    zcard: vi.fn(() => Promise.resolve(0)),
    zremrangebyscore: vi.fn(() => Promise.resolve(0)),
    zrange: vi.fn(() => Promise.resolve([])),
    incr: vi.fn(() => Promise.resolve(1)),
    decr: vi.fn(() => Promise.resolve(0)),
    sadd: vi.fn(() => Promise.resolve(1)),
    srem: vi.fn(() => Promise.resolve(1)),
    smembers: vi.fn(() => Promise.resolve([])),
    scard: vi.fn(() => Promise.resolve(0)),
    exists: vi.fn(() => Promise.resolve(0)),
    keys: vi.fn(() => Promise.resolve([])),
    ping: vi.fn(() => Promise.resolve('PONG')),
  })),
}))

// Mock fetch globally - Removed to allow native fetch for Supabase
// global.fetch = vi.fn()

beforeAll(() => {
  console.log('🧪 Test suite starting...')
})

afterAll(() => {
  console.log('✅ Test suite completed')
})
