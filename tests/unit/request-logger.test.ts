import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the logger with factory functions to avoid hoisting issues
vi.mock('@/lib/monitoring/logger', () => {
  const mockInstance = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
  
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockInstance),
    },
    createLogger: vi.fn(() => mockInstance),
  }
})

// Import AFTER mocking
import { RequestLogger, RequestLog, SecurityEvent } from '@/lib/middleware/request-logger'
import { createLogger } from '@/lib/monitoring/logger'

// Get the mock instance for assertions
const mockLoggerInstance = createLogger('test') as any

describe('RequestLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logRequest', () => {
    it('should log successful requests at info level', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'GET',
        path: '/api/contacts',
        query: { page: '1', limit: '10' },
        userId: 'user-123',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 150,
      }

      RequestLogger.logRequest(log)

      expect(mockLoggerInstance.info).toHaveBeenCalled()
    })

    it('should log client errors at warn level', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'POST',
        path: '/api/contacts',
        query: {},
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 400,
        duration: 50,
        error: 'Invalid input',
      }

      RequestLogger.logRequest(log)

      expect(mockLoggerInstance.warn).toHaveBeenCalled()
    })

    it('should log server errors at error level', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'POST',
        path: '/api/contacts',
        query: {},
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 500,
        duration: 1000,
        error: 'Database connection failed',
      }

      RequestLogger.logRequest(log)

      expect(mockLoggerInstance.error).toHaveBeenCalled()
    })

    it('should sanitize sensitive query parameters', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'POST',
        path: '/api/auth/login',
        query: {
          password: 'secret123',
          token: 'abc123xyz',
          api_key: 'sk_live_123456',
          username: 'john',
        },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 100,
      }

      RequestLogger.logRequest(log)

      const loggedData = mockLoggerInstance.info.mock.calls[0]?.[0] as RequestLog

      expect(loggedData.query.password).toBe('[REDACTED]')
      expect(loggedData.query.token).toBe('[REDACTED]')
      expect(loggedData.query.api_key).toBe('[REDACTED]')
      expect(loggedData.query.username).toBe('john')
    })

    it('should sanitize sensitive data in error messages', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'POST',
        path: '/api/auth',
        query: {},
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 401,
        duration: 50,
        error: 'Authentication failed with token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      }

      RequestLogger.logRequest(log)

      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as RequestLog

      expect(loggedData.error).toContain('[JWT_REDACTED]')
      expect(loggedData.error).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    })

    it('should handle nested objects in query parameters', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'POST',
        path: '/api/users',
        query: {
          user: JSON.stringify({
            name: 'John',
            password: 'secret',
            email: 'john@example.com',
          }),
        },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 100,
      }

      RequestLogger.logRequest(log)

      expect(mockLoggerInstance.info).toHaveBeenCalled()
    })
  })

  describe('logSecurityEvent', () => {
    it('should log authentication failures', () => {
      const event: SecurityEvent = {
        type: 'auth_failure',
        userId: 'user-123',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
        details: {
          reason: 'Invalid credentials',
          attempts: 3,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      RequestLogger.logSecurityEvent(event)

      expect(mockLoggerInstance.warn).toHaveBeenCalled()
      
      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as SecurityEvent
      expect(loggedData.type).toBe('auth_failure')
      expect(loggedData.ip).toBe('192.168.1.1')
    })

    it('should log authorization failures', () => {
      const event: SecurityEvent = {
        type: 'authz_failure',
        userId: 'user-123',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
        details: {
          requiredPermission: 'contacts:delete',
          userPermissions: ['contacts:read', 'contacts:write'],
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      RequestLogger.logSecurityEvent(event)

      expect(mockLoggerInstance.warn).toHaveBeenCalled()
      
      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as SecurityEvent
      expect(loggedData.type).toBe('authz_failure')
    })

    it('should log rate limit violations', () => {
      const event: SecurityEvent = {
        type: 'rate_limit',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
        details: {
          endpoint: '/api/messages',
          limit: 100,
          current: 101,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      RequestLogger.logSecurityEvent(event)

      expect(mockLoggerInstance.warn).toHaveBeenCalled()
      
      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as SecurityEvent
      expect(loggedData.type).toBe('rate_limit')
    })

    it('should log suspicious activity', () => {
      const event: SecurityEvent = {
        type: 'suspicious_activity',
        ip: '192.168.1.1',
        details: {
          pattern: 'Multiple failed login attempts from different accounts',
          accounts: ['user1', 'user2', 'user3'],
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      RequestLogger.logSecurityEvent(event)

      expect(mockLoggerInstance.warn).toHaveBeenCalled()
    })

    it('should sanitize sensitive data in event details', () => {
      const event: SecurityEvent = {
        type: 'auth_failure',
        ip: '192.168.1.1',
        details: {
          username: 'john',
          password: 'secret123',
          token: 'abc123xyz',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      RequestLogger.logSecurityEvent(event)

      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as SecurityEvent

      expect(loggedData.details.password).toBe('[REDACTED]')
      expect(loggedData.details.token).toBe('[REDACTED]')
      expect(loggedData.details.username).toBe('john')
    })
  })

  describe('createRequestLog', () => {
    it('should create a properly formatted request log', () => {
      const params = {
        requestId: 'req-123',
        method: 'GET',
        path: '/api/contacts',
        query: { page: '1' },
        userId: 'user-123',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 150,
      }

      const log = RequestLogger.createRequestLog(params)

      expect(log.requestId).toBe('req-123')
      expect(log.method).toBe('GET')
      expect(log.path).toBe('/api/contacts')
      expect(log.statusCode).toBe(200)
      expect(log.duration).toBe(150)
      expect(log.timestamp).toBeDefined()
      expect(new Date(log.timestamp).getTime()).toBeGreaterThan(0)
    })

    it('should handle optional fields', () => {
      const params = {
        requestId: 'req-123',
        method: 'GET',
        path: '/api/public',
        query: {},
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 50,
      }

      const log = RequestLogger.createRequestLog(params)

      expect(log.userId).toBeUndefined()
      expect(log.tenantId).toBeUndefined()
      expect(log.error).toBeUndefined()
    })
  })

  describe('createSecurityEvent', () => {
    it('should create a properly formatted security event', () => {
      const params = {
        type: 'auth_failure' as const,
        userId: 'user-123',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
        details: { reason: 'Invalid password' },
      }

      const event = RequestLogger.createSecurityEvent(params)

      expect(event.type).toBe('auth_failure')
      expect(event.userId).toBe('user-123')
      expect(event.tenantId).toBe('tenant-123')
      expect(event.ip).toBe('192.168.1.1')
      expect(event.details.reason).toBe('Invalid password')
      expect(event.timestamp).toBeDefined()
      expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0)
    })

    it('should handle optional user and tenant IDs', () => {
      const params = {
        type: 'suspicious_activity' as const,
        ip: '192.168.1.1',
        details: { pattern: 'Port scanning detected' },
      }

      const event = RequestLogger.createSecurityEvent(params)

      expect(event.userId).toBeUndefined()
      expect(event.tenantId).toBeUndefined()
    })
  })

  describe('sensitive data patterns', () => {
    it('should redact various password field names', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'POST',
        path: '/api/auth',
        query: {
          password: 'secret',
          Password: 'secret',
          PASSWORD: 'secret',
          user_password: 'secret',
          newPassword: 'secret',
        },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 100,
      }

      RequestLogger.logRequest(log)

      const loggedData = mockLoggerInstance.info.mock.calls[0]?.[0] as RequestLog

      expect(loggedData.query.password).toBe('[REDACTED]')
      expect(loggedData.query.Password).toBe('[REDACTED]')
      expect(loggedData.query.PASSWORD).toBe('[REDACTED]')
      expect(loggedData.query.user_password).toBe('[REDACTED]')
      expect(loggedData.query.newPassword).toBe('[REDACTED]')
    })

    it('should redact various token field names', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'POST',
        path: '/api/auth',
        query: {
          token: 'abc123',
          access_token: 'abc123',
          refresh_token: 'abc123',
          authToken: 'abc123',
          bearerToken: 'abc123',
        },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 100,
      }

      RequestLogger.logRequest(log)

      const loggedData = mockLoggerInstance.info.mock.calls[0]?.[0] as RequestLog

      expect(loggedData.query.token).toBe('[REDACTED]')
      expect(loggedData.query.access_token).toBe('[REDACTED]')
      expect(loggedData.query.refresh_token).toBe('[REDACTED]')
      expect(loggedData.query.authToken).toBe('[REDACTED]')
      expect(loggedData.query.bearerToken).toBe('[REDACTED]')
    })

    it('should redact API keys', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'POST',
        path: '/api/config',
        query: {
          api_key: 'sk_live_123456',
          apiKey: 'pk_test_789012',
          API_KEY: 'key_secret',
        },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 100,
      }

      RequestLogger.logRequest(log)

      const loggedData = mockLoggerInstance.info.mock.calls[0]?.[0] as RequestLog

      expect(loggedData.query.api_key).toBe('[REDACTED]')
      expect(loggedData.query.apiKey).toBe('[REDACTED]')
      expect(loggedData.query.API_KEY).toBe('[REDACTED]')
    })

    it('should redact sensitive fields in nested objects', () => {
      const event: SecurityEvent = {
        type: 'auth_failure',
        ip: '192.168.1.1',
        details: {
          user: {
            username: 'john',
            password: 'secret',
            profile: {
              email: 'john@example.com',
              api_key: 'sk_live_123',
            },
          },
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      RequestLogger.logSecurityEvent(event)

      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as SecurityEvent

      const userDetails = loggedData.details.user as any
      expect(userDetails.username).toBe('john')
      expect(userDetails.password).toBe('[REDACTED]')
      expect(userDetails.profile.email).toBe('john@example.com')
      expect(userDetails.profile.api_key).toBe('[REDACTED]')
    })

    it('should redact JWT tokens in error messages', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'GET',
        path: '/api/protected',
        query: {},
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 401,
        duration: 10,
        error: 'Invalid JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      }

      RequestLogger.logRequest(log)

      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as RequestLog

      expect(loggedData.error).toContain('[JWT_REDACTED]')
      expect(loggedData.error).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    })

    it('should redact long alphanumeric tokens in error messages', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'GET',
        path: '/api/protected',
        query: {},
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 401,
        duration: 10,
        error: 'Invalid token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
      }

      RequestLogger.logRequest(log)

      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as RequestLog

      expect(loggedData.error).toContain('[TOKEN_REDACTED]')
      expect(loggedData.error).not.toContain('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6')
    })
  })

  describe('edge cases', () => {
    it('should handle empty query parameters', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'GET',
        path: '/api/contacts',
        query: {},
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 50,
      }

      expect(() => RequestLogger.logRequest(log)).not.toThrow()
    })

    it('should handle null values in query parameters', () => {
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'GET',
        path: '/api/contacts',
        query: { filter: 'null' },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
        duration: 50,
      }

      expect(() => RequestLogger.logRequest(log)).not.toThrow()
    })

    it('should handle arrays in event details', () => {
      const event: SecurityEvent = {
        type: 'suspicious_activity',
        ip: '192.168.1.1',
        details: {
          attempts: [
            { time: '2024-01-01T00:00:00Z', password: 'secret1' },
            { time: '2024-01-01T00:01:00Z', password: 'secret2' },
          ],
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      RequestLogger.logSecurityEvent(event)

      const loggedData = mockLoggerInstance.warn.mock.calls[0]?.[0] as SecurityEvent

      const attempts = loggedData.details.attempts as any[]
      expect(attempts[0].password).toBe('[REDACTED]')
      expect(attempts[1].password).toBe('[REDACTED]')
      expect(attempts[0].time).toBe('2024-01-01T00:00:00Z')
    })

    it('should handle very long error messages', () => {
      const longError = 'Error: '.repeat(1000) + 'with token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test'
      
      const log: RequestLog = {
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        method: 'GET',
        path: '/api/test',
        query: {},
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 500,
        duration: 1000,
        error: longError,
      }

      expect(() => RequestLogger.logRequest(log)).not.toThrow()
    })
  })
})
