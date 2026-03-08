import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  ErrorHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  AppError
} from '@/lib/middleware/error-handler'

/**
 * Property-Based Tests for Error Status Codes
 * 
 * **Validates: Requirement 7.4**
 * 
 * These tests verify that the ErrorHandler returns appropriate HTTP status codes
 * for different error types. Each error class should map to its corresponding
 * HTTP status code:
 * - ValidationError → 400 Bad Request
 * - AuthenticationError → 401 Unauthorized
 * - AuthorizationError → 403 Forbidden
 * - NotFoundError → 404 Not Found
 * - ConflictError → 409 Conflict
 * - RateLimitError → 429 Too Many Requests
 * - Generic errors → 500 Internal Server Error
 */

describe('Feature: security-optimization, Property 25: Error Status Codes', () => {
  /**
   * Property Test: ValidationError should return 400 status code
   * 
   * Tests that validation errors consistently return HTTP 400 Bad Request status.
   * This applies to all input validation failures.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return 400 status code for ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('Invalid input provided'),
          fc.constant('Missing required field'),
          fc.constant('Invalid email format'),
          fc.constant('Phone number must be in E.164 format'),
          fc.constant('Field exceeds maximum length'),
          fc.record({
            field: fc.oneof(
              fc.constant('email'),
              fc.constant('phone_number'),
              fc.constant('name'),
              fc.constant('content')
            ),
            reason: fc.oneof(
              fc.constant('is required'),
              fc.constant('is invalid'),
              fc.constant('exceeds maximum length'),
              fc.constant('contains invalid characters')
            )
          }).map(({ field, reason }) => `Field '${field}' ${reason}`)
        ),
        async (message) => {
          const error = new ValidationError(message)
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Should return 400 status code
          expect(response.status).toBe(400)
          
          // Response body should contain error details
          const body = await response.json()
          expect(body.error).toBe('ValidationError')
          expect(body.code).toMatch(/^VAL_/)
          expect(body.requestId).toBe(requestId)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: AuthenticationError should return 401 status code
   * 
   * Tests that authentication errors consistently return HTTP 401 Unauthorized status.
   * This applies to missing or invalid authentication credentials.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return 401 status code for AuthenticationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('Authentication required'),
          fc.constant('Invalid credentials'),
          fc.constant('Session expired'),
          fc.constant('Invalid token'),
          fc.constant('API key is invalid'),
          fc.record({
            reason: fc.oneof(
              fc.constant('Token expired'),
              fc.constant('Invalid session'),
              fc.constant('Missing authentication header'),
              fc.constant('Invalid API key')
            )
          }).map(({ reason }) => reason)
        ),
        async (message) => {
          const error = new AuthenticationError(message)
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Should return 401 status code
          expect(response.status).toBe(401)
          
          // Response body should contain error details
          const body = await response.json()
          expect(body.error).toBe('AuthenticationError')
          expect(body.code).toMatch(/^AUTH_/)
          expect(body.requestId).toBe(requestId)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: AuthorizationError should return 403 status code
   * 
   * Tests that authorization errors consistently return HTTP 403 Forbidden status.
   * This applies to authenticated users lacking required permissions.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return 403 status code for AuthorizationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('Insufficient permissions'),
          fc.constant('Tenant access denied'),
          fc.constant('Permission denied'),
          fc.constant('Access forbidden'),
          fc.record({
            permission: fc.oneof(
              fc.constant('contacts:delete'),
              fc.constant('messages:send'),
              fc.constant('broadcasts:create'),
              fc.constant('admin:access')
            )
          }).map(({ permission }) => `Missing required permission: ${permission}`)
        ),
        async (message) => {
          const error = new AuthorizationError(message)
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Should return 403 status code
          expect(response.status).toBe(403)
          
          // Response body should contain error details
          const body = await response.json()
          expect(body.error).toBe('AuthorizationError')
          expect(body.code).toMatch(/^AUTHZ_/)
          expect(body.requestId).toBe(requestId)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: NotFoundError should return 404 status code
   * 
   * Tests that not found errors consistently return HTTP 404 Not Found status.
   * This applies to requests for non-existent resources.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return 404 status code for NotFoundError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('Resource not found'),
          fc.constant('Contact not found'),
          fc.constant('Message not found'),
          fc.constant('Conversation not found'),
          fc.record({
            resource: fc.oneof(
              fc.constant('Contact'),
              fc.constant('Message'),
              fc.constant('Conversation'),
              fc.constant('Broadcast')
            ),
            id: fc.uuid()
          }).map(({ resource, id }) => `${resource} with ID ${id} not found`)
        ),
        async (message) => {
          const error = new NotFoundError(message)
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Should return 404 status code
          expect(response.status).toBe(404)
          
          // Response body should contain error details
          const body = await response.json()
          expect(body.error).toBe('NotFoundError')
          expect(body.code).toBe('NOT_FOUND')
          expect(body.requestId).toBe(requestId)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: ConflictError should return 409 status code
   * 
   * Tests that conflict errors consistently return HTTP 409 Conflict status.
   * This applies to operations that conflict with current resource state.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return 409 status code for ConflictError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('Resource conflict'),
          fc.constant('Duplicate entry'),
          fc.constant('Contact already exists'),
          fc.constant('Phone number already registered'),
          fc.record({
            field: fc.oneof(
              fc.constant('email'),
              fc.constant('phone_number'),
              fc.constant('name'),
              fc.constant('api_key')
            )
          }).map(({ field }) => `Duplicate ${field} already exists`)
        ),
        async (message) => {
          const error = new ConflictError(message)
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Should return 409 status code
          expect(response.status).toBe(409)
          
          // Response body should contain error details
          const body = await response.json()
          expect(body.error).toBe('ConflictError')
          expect(body.code).toBe('CONFLICT')
          expect(body.requestId).toBe(requestId)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: RateLimitError should return 429 status code
   * 
   * Tests that rate limit errors consistently return HTTP 429 Too Many Requests status.
   * This applies when API rate limits are exceeded.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return 429 status code for RateLimitError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          message: fc.oneof(
            fc.constant('Rate limit exceeded'),
            fc.constant('Too many requests'),
            fc.constant('Request quota exceeded'),
            fc.constant('API rate limit reached')
          ),
          retryAfter: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: undefined })
        }),
        async ({ message, retryAfter }) => {
          const error = new RateLimitError(message, 'RATE_001', retryAfter)
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Should return 429 status code
          expect(response.status).toBe(429)
          
          // Response body should contain error details
          const body = await response.json()
          expect(body.error).toBe('RateLimitError')
          expect(body.code).toBe('RATE_001')
          expect(body.requestId).toBe(requestId)
          
          // Should include Retry-After header if retryAfter is provided
          if (retryAfter !== undefined) {
            expect(response.headers.get('Retry-After')).toBe(retryAfter.toString())
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Generic errors should return 500 status code
   * 
   * Tests that unknown/generic errors consistently return HTTP 500 Internal Server Error status.
   * This applies to unexpected errors that are not operational errors.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return 500 status code for generic errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('Unexpected error occurred'),
          fc.constant('Internal server error'),
          fc.constant('Database connection failed'),
          fc.constant('TypeError: Cannot read property of undefined'),
          fc.record({
            errorType: fc.oneof(
              fc.constant('TypeError'),
              fc.constant('ReferenceError'),
              fc.constant('Error')
            ),
            detail: fc.oneof(
              fc.constant('Cannot read property'),
              fc.constant('is not defined'),
              fc.constant('Connection failed')
            )
          }).map(({ errorType, detail }) => `${errorType}: ${detail}`)
        ),
        async (message) => {
          const error = new Error(message)
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Should return 500 status code
          expect(response.status).toBe(500)
          
          // Response body should contain generic error details
          const body = await response.json()
          expect(body.error).toBe('InternalServerError')
          expect(body.code).toBe('INTERNAL_ERROR')
          expect(body.message).toBe('An unexpected error occurred. Please try again later.')
          expect(body.requestId).toBe(requestId)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Custom AppError with custom status code should return that status code
   * 
   * Tests that custom AppError instances with custom status codes return the correct status.
   * This ensures the error handling system is extensible.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return custom status code for custom AppError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          message: fc.string({ minLength: 5, maxLength: 100 }),
          statusCode: fc.oneof(
            fc.constant(400),
            fc.constant(401),
            fc.constant(403),
            fc.constant(404),
            fc.constant(409),
            fc.constant(422),
            fc.constant(429),
            fc.constant(500),
            fc.constant(502),
            fc.constant(503)
          ),
          code: fc.stringMatching(/^[A-Z]{2,5}_\d{3}$/)
        }),
        async ({ message, statusCode, code }) => {
          const error = new AppError(message, statusCode, code, true)
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Should return the custom status code
          expect(response.status).toBe(statusCode)
          
          // Response body should contain error details
          const body = await response.json()
          expect(body.error).toBe('AppError')
          expect(body.code).toBe(code)
          expect(body.requestId).toBe(requestId)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: All error responses should have consistent structure
   * 
   * Tests that all error responses, regardless of error type, have the same structure
   * with required fields: error, message, code, requestId, timestamp.
   * 
   * **Validates: Requirement 7.4**
   */
  it('should return consistent error response structure for all error types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(new ValidationError('Invalid input')),
          fc.constant(new AuthenticationError('Auth required')),
          fc.constant(new AuthorizationError('Permission denied')),
          fc.constant(new NotFoundError('Not found')),
          fc.constant(new ConflictError('Conflict')),
          fc.constant(new RateLimitError('Rate limit exceeded')),
          fc.constant(new Error('Generic error'))
        ),
        async (error) => {
          const requestId = 'test-request-id'
          const response = ErrorHandler.handle(error, requestId)
          
          // Response should have a valid status code
          expect(response.status).toBeGreaterThanOrEqual(400)
          expect(response.status).toBeLessThan(600)
          
          // Response body should have consistent structure
          const body = await response.json()
          expect(body).toHaveProperty('error')
          expect(body).toHaveProperty('message')
          expect(body).toHaveProperty('code')
          expect(body).toHaveProperty('requestId')
          expect(body).toHaveProperty('timestamp')
          
          // All fields should be non-empty strings
          expect(typeof body.error).toBe('string')
          expect(body.error.length).toBeGreaterThan(0)
          expect(typeof body.message).toBe('string')
          expect(body.message.length).toBeGreaterThan(0)
          expect(typeof body.code).toBe('string')
          expect(body.code.length).toBeGreaterThan(0)
          expect(body.requestId).toBe(requestId)
          
          // Timestamp should be valid ISO 8601 format
          expect(new Date(body.timestamp).getTime()).toBeGreaterThan(0)
        }
      ),
      { numRuns: 2 }
    )
  })
})
