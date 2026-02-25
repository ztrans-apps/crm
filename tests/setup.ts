/**
 * Test Setup
 * Global test configuration and mocks
 */

import { beforeAll, afterAll, vi } from 'vitest'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.META_WHATSAPP_TOKEN = 'test-token'
process.env.META_WHATSAPP_PHONE_NUMBER_ID = '123456789'
process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID = '987654321'
process.env.META_WEBHOOK_VERIFY_TOKEN = 'test-verify-token'
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
