/**
 * Test Setup
 * Global test configuration and mocks
 */

import { beforeAll, afterAll, vi } from 'vitest'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'
process.env.WHATSAPP_SERVICE_URL = 'http://localhost:3001'
process.env.DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
}))

// Mock fetch globally
global.fetch = vi.fn()

beforeAll(() => {
  console.log('🧪 Test suite starting...')
})

afterAll(() => {
  console.log('✅ Test suite completed')
})
