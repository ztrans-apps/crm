import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ErrorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  NotFoundError,
  ConflictError,
  ERROR_CODES,
  type ErrorContext,
} from '@/lib/middleware/error-handler'

describe('ErrorHandler', () => {
  let mockRequestId: string
  let mockContext: ErrorContext

  beforeEach(() => {
    mockRequestId = 'test-request-123'
    mockContext = {
      requestId: mockRequestId,
      userId: 'user-123',
      tenantId: 'tenant-123',
      path: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    }
    
    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_001', true)
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_001')
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('AppError')
    })

    it('should default isOperational to true', () => {
      const error = new AppError('Test error', 400, 'TEST_001')
      expect(error.isOperational).toBe(true)
    })
  })

  describe('ValidationError', () => {
    it('should create a ValidationError with default message and code', () => {
      const error = new ValidationError()
      
      expect(error.message).toBe('Invalid input provided')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VAL_001')
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('ValidationError')
    })

    it('should create a ValidationError with custom message and code', () => {
      const error = new ValidationError('Custom validation error', 'VAL_002')
      
      expect(error.message).toBe('Custom validation error')
      expect(error.code).toBe('VAL_002')
    })
  })

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError with correct status code', () => {
      const error = new AuthenticationError()
      
      expect(error.message).toBe('Authentication required')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTH_001')
      expect(error.name).toBe('AuthenticationError')
    })

    it('should accept custom message and code', () => {
      const error = new AuthenticationError('Invalid token', 'AUTH_002')
      
      expect(error.message).toBe('Invalid token')
      expect(error.code).toBe('AUTH_002')
    })
  })

  describe('AuthorizationError', () => {
    it('should create an AuthorizationError with correct status code', () => {
      const error = new AuthorizationError()
      
      expect(error.message).toBe('Insufficient permissions')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('AUTHZ_001')
      expect(error.name).toBe('AuthorizationError')
    })
  })

  describe('RateLimitError', () => {
    it('should create a RateLimitError with correct status code', () => {
      const error = new RateLimitError()
      
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_001')
      expect(error.name).toBe('RateLimitError')
    })

    it('should store retryAfter value', () => {
      const error = new RateLimitError('Too many requests', 'RATE_001', 60)
      
      expect(error.retryAfter).toBe(60)
    })
  })

  describe('NotFoundError', () => {
    it('should create a NotFoundError with correct status code', () => {
      const error = new NotFoundError()
      
      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.name).toBe('NotFoundError')
    })
  })

  describe('ConflictError', () => {
    it('should create a ConflictError with correct status code', () => {
      const error = new ConflictError()
      
      expect(error.message).toBe('Resource conflict')
      expect(error.statusCode).toBe(409)
      expect(error.code).toBe('CONFLICT')
      expect(error.name).toBe('ConflictError')
    })
  })

  describe('ErrorHandler.sanitizeError', () => {
    it('should return full error details for operational errors', () => {
      const error = new ValidationError('Invalid email format', 'VAL_001')
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized).toEqual({
        error: 'ValidationError',
        message: 'Invalid email format',
        code: 'VAL_001',
        requestId: mockRequestId,
        timestamp: expect.any(String),
      })
    })

    it('should sanitize non-operational errors', () => {
      const error = new Error('Database connection failed')
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized).toEqual({
        error: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR',
        requestId: mockRequestId,
        timestamp: expect.any(String),
      })
    })

    it('should sanitize programming errors (isOperational=false)', () => {
      const error = new AppError('Internal bug', 500, 'BUG_001', false)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized).toEqual({
        error: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR',
        requestId: mockRequestId,
        timestamp: expect.any(String),
      })
    })

    it('should sanitize database schema details from error messages', () => {
      const error = new AppError('SELECT * FROM users failed', 500, 'DB_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).toBe('A database error occurred. Please contact support.')
      expect(sanitized.message).not.toContain('SELECT')
      expect(sanitized.message).not.toContain('users')
    })

    it('should sanitize PostgreSQL-specific error messages', () => {
      const error = new AppError('pg_constraint violation on table contacts', 500, 'DB_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).toBe('A database error occurred. Please contact support.')
      expect(sanitized.message).not.toContain('pg_')
      expect(sanitized.message).not.toContain('contacts')
    })

    it('should sanitize file paths from error messages', () => {
      const error = new AppError('File not found at /var/www/app/uploads/file.txt', 500, 'FILE_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).not.toContain('/var/www')
      expect(sanitized.message).toContain('[path]')
    })

    it('should sanitize Windows file paths from error messages', () => {
      const error = new AppError('Cannot access C:\\Users\\Admin\\config.json', 500, 'FILE_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).not.toContain('C:\\Users')
      expect(sanitized.message).toContain('[path]')
    })

    it('should sanitize environment variables from error messages', () => {
      const error = new AppError('Missing process.env.DATABASE_URL', 500, 'ENV_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).not.toContain('DATABASE_URL')
      expect(sanitized.message).toContain('[env]')
    })

    it('should sanitize IP addresses from error messages', () => {
      const error = new AppError('Connection failed to 192.168.1.100', 500, 'NET_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).not.toContain('192.168.1.100')
      expect(sanitized.message).toContain('[ip]')
    })

    it('should sanitize API keys and tokens from error messages', () => {
      const error = new AppError('Invalid API key: test_key_1234567890abcdefghijklmnopqrstuvwxyz', 500, 'AUTH_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).not.toContain('test_key_1234567890abcdefghijklmnopqrstuvwxyz')
      expect(sanitized.message).toContain('[token]')
    })

    it('should sanitize email addresses from error messages', () => {
      const error = new AppError('User john.doe@example.com not found', 500, 'USER_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).not.toContain('john.doe@example.com')
      expect(sanitized.message).toContain('[email]')
    })

    it('should sanitize port numbers from error messages', () => {
      const error = new AppError('Cannot connect to server:5432', 500, 'NET_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).not.toContain(':5432')
      expect(sanitized.message).toContain(':[port]')
    })

    it('should return database generic message for SQL-related errors', () => {
      const error = new AppError('SELECT * FROM users WHERE email=user@test.com', 500, 'DB_001', true)
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      // Should return generic database message
      expect(sanitized.message).toBe('A database error occurred. Please contact support.')
    })

    it('should preserve safe error messages without over-sanitization', () => {
      const error = new ValidationError('Name must be at least 3 characters long', 'VAL_001')
      const sanitized = ErrorHandler.sanitizeError(error, mockRequestId)
      
      expect(sanitized.message).toBe('Name must be at least 3 characters long')
    })
  })

  describe('ErrorHandler.handle', () => {
    it('should return NextResponse with correct status code for ValidationError', () => {
      const error = new ValidationError('Invalid input', 'VAL_001')
      const response = ErrorHandler.handle(error, mockRequestId)
      
      expect(response.status).toBe(400)
    })

    it('should return NextResponse with correct status code for AuthenticationError', () => {
      const error = new AuthenticationError()
      const response = ErrorHandler.handle(error, mockRequestId)
      
      expect(response.status).toBe(401)
    })

    it('should return NextResponse with correct status code for AuthorizationError', () => {
      const error = new AuthorizationError()
      const response = ErrorHandler.handle(error, mockRequestId)
      
      expect(response.status).toBe(403)
    })

    it('should return NextResponse with correct status code for RateLimitError', () => {
      const error = new RateLimitError()
      const response = ErrorHandler.handle(error, mockRequestId)
      
      expect(response.status).toBe(429)
    })

    it('should add Retry-After header for RateLimitError with retryAfter', () => {
      const error = new RateLimitError('Too many requests', 'RATE_001', 60)
      const response = ErrorHandler.handle(error, mockRequestId)
      
      expect(response.headers.get('Retry-After')).toBe('60')
    })

    it('should return 500 status code for unknown errors', () => {
      const error = new Error('Unknown error')
      const response = ErrorHandler.handle(error, mockRequestId)
      
      expect(response.status).toBe(500)
    })
  })

  describe('ErrorHandler.logError', () => {
    it('should log operational errors as warnings', () => {
      const error = new ValidationError('Invalid input', 'VAL_001')
      ErrorHandler.logError(error, mockContext)
      
      expect(console.warn).toHaveBeenCalledWith(
        'Operational error:',
        expect.stringContaining('ValidationError')
      )
    })

    it('should log programming errors as errors', () => {
      const error = new Error('Unexpected error')
      ErrorHandler.logError(error, mockContext)
      
      expect(console.error).toHaveBeenCalledWith(
        'Unexpected error:',
        expect.stringContaining('Unexpected error')
      )
    })

    it('should include context information in logs', () => {
      const error = new ValidationError('Invalid input', 'VAL_001')
      ErrorHandler.logError(error, mockContext)
      
      expect(console.warn).toHaveBeenCalledWith(
        'Operational error:',
        expect.stringContaining(mockContext.requestId)
      )
    })

    it('should not throw if Sentry is not configured', () => {
      const originalEnv = process.env.NEXT_PUBLIC_SENTRY_DSN
      delete process.env.NEXT_PUBLIC_SENTRY_DSN
      
      const error = new ValidationError('Invalid input', 'VAL_001')
      
      expect(() => {
        ErrorHandler.logError(error, mockContext)
      }).not.toThrow()
      
      // Restore environment
      if (originalEnv) {
        process.env.NEXT_PUBLIC_SENTRY_DSN = originalEnv
      }
    })
  })

  describe('ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES.AUTH_001).toBe('Authentication required')
      expect(ERROR_CODES.AUTH_002).toBe('Invalid credentials')
      expect(ERROR_CODES.AUTH_003).toBe('Session expired')
      expect(ERROR_CODES.AUTHZ_001).toBe('Insufficient permissions')
      expect(ERROR_CODES.AUTHZ_002).toBe('Tenant access denied')
      expect(ERROR_CODES.VAL_001).toBe('Invalid input')
      expect(ERROR_CODES.VAL_002).toBe('Missing required field')
      expect(ERROR_CODES.RATE_001).toBe('Rate limit exceeded')
      expect(ERROR_CODES.DB_001).toBe('Database error')
      expect(ERROR_CODES.EXT_001).toBe('External API error')
    })
  })
})
